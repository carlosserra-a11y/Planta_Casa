// Cena, câmeras, modos (Explorar / Caminhar / Planta) e interface.
// Desempenho: só desenha quando algo muda, sombras estáticas, resolução adaptativa
// e menos luzes/texturas menores em celulares (tier.low).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm';
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS2DRenderer.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js/+esm';
import { createMaterials } from './materials.js';
import { Builder } from './builder.js';
import { buildHouse } from './house.js';
import { furnish } from './furniture.js';
import { Walk } from './walk.js';
import { drawPlan, planZoom } from './plan2d.js';
import { ROOMS, SPOTS, fmt } from './plan-data.js';
import { PROMPT } from './prompt.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
// Dá uma folga para a tela atualizar o texto de progresso. O setTimeout garante que a
// montagem continue mesmo com a aba em segundo plano (lá o requestAnimationFrame pausa).
const nextFrame = () => new Promise((r) => {
  requestAnimationFrame(() => r());
  setTimeout(r, 60);
});
const setStatus = (t) => { $('#loadMsg').textContent = t; };

const coarse = window.matchMedia('(pointer: coarse)').matches;
const forced = location.hash === '#leve' ? true : location.hash === '#alta' ? false : null;
const tier = {
  low: forced ?? (coarse || (navigator.deviceMemory || 8) <= 4 || Math.min(screen.width, screen.height) < 700),
};
document.body.dataset.touch = String(coarse);
document.body.dataset.tier = tier.low ? 'low' : 'high';
document.addEventListener('gesturestart', (e) => e.preventDefault()); // iOS: não dar zoom na página

const CAMS = {
  fachada: { pos: [1.2, 1.75, 10.5], target: [3.1, 3.1, -6] },
  aerea: { pos: [-15, 24, 7], target: [3, 0, -15] },
  fundos: { pos: [4.6, 5.2, -38.5], target: [2.6, 1.8, -22] },
  lateral: { pos: [-19, 6.5, -15], target: [3, 2.6, -15] },
  topo: { pos: [3, 36, -15.99], target: [3, 0, -16] },
};

const state = { mode: 'orbit', view: 'full', night: false, labels: true, furniture: true, neighbors: false, planLevel: 0 };
let renderer;
let labelRenderer;
let scene;
let camera;
let controls;
let M;
let B;
let walk;
let hemi;
let sun;
let sky;
let shiny = [];
let labels = [];
let tween = null;
let dirty = true;
let shadowsDirty = true;
let paused = false;
let orbitPose = null;
let zoom;
const invalidate = () => { dirty = true; };

// ---------- montagem ----------
function createRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(perf.dpr);
  r.shadowMap.enabled = true;
  r.shadowMap.type = tier.low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  r.shadowMap.autoUpdate = false;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    toast('O 3D foi pausado pelo aparelho. Ele volta sozinho em instantes.');
  });
  r.domElement.addEventListener('webglcontextrestored', () => {
    hideToast();
    shadowsDirty = true;
    invalidate();
  });
  return r;
}

function skyTexture(stops, stars) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 256);
  if (stars) {
    for (let i = 0; i < 60; i++) {
      x.fillStyle = `rgba(255,255,255,${(0.2 + Math.random() * 0.6).toFixed(2)})`;
      x.fillRect(Math.random() * 64, Math.random() * 150, 0.6, 0.6);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfdde8, 70, 230);
  camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
  hemi = new THREE.HemisphereLight(0xdfe9f3, 0xc9c0b2, 1.1);
  sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(-14, 22, 10);
  sun.target.position.set(3, 0, -16);
  sun.castShadow = true;
  const sm = tier.low ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(hemi, sun, sun.target);
  sky = {
    day: skyTexture([[0, '#7fa9cf'], [0.55, '#c9dceb'], [1, '#e9eef0']]),
    night: skyTexture([[0, '#04070f'], [0.6, '#0d1526'], [1, '#1c2333']], true),
  };
}

function createModel() {
  M = createMaterials(renderer, tier);
  const env = new THREE.PMREMGenerator(renderer);
  const envTex = env.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  env.dispose();
  shiny = [M.steel, M.mirror, M.carPaint, M.glassDark, M.quartz, M.ceramic, M.water, M.glass, M.frame, M.screen];
  shiny.forEach((m) => { m.envMap = envTex; });
  B = new Builder(scene);
}

function createLabels() {
  labels = ROOMS.map((r) => {
    const div = document.createElement('div');
    div.className = 'room-label';
    div.innerHTML = `<b>${r.name}</b>${r.noArea ? '' : `<span>${fmt(r.area)} m²</span>`}`;
    const o = new CSS2DObject(div);
    o.position.set(r.at[0], r.level === 1 ? 4.0 : r.outdoor ? 0.7 : 1.1, -r.at[1]);
    scene.add(o);
    return { r, o, w: 0, h: 0 };
  }).sort((a, b) => (b.r.area || 0) - (a.r.area || 0));
}

// Esconde nomes que se sobrepõem na tela (os maiores ambientes têm prioridade).
const tmpV = new THREE.Vector3();
function declutter(w, h) {
  const placed = [];
  for (const L of labels) {
    if (!L.o.visible) continue;
    if (!L.w) {
      L.w = L.o.element.offsetWidth;
      L.h = L.o.element.offsetHeight;
    }
    tmpV.copy(L.o.position).project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * w;
    const y = (-tmpV.y * 0.5 + 0.5) * h;
    const box = [x - L.w / 2 - 3, y - L.h / 2 - 2, x + L.w / 2 + 3, y + L.h / 2 + 2];
    const hit = placed.some((p) => !(box[2] < p[0] || box[0] > p[2] || box[3] < p[1] || box[1] > p[3]));
    L.o.element.style.opacity = hit ? '0' : '1';
    if (!hit) placed.push(box);
  }
}

// ---------- vistas e luz ----------
function applyView() {
  const v = state.mode === 'walk' ? 'full' : state.view;
  const L = B.layers;
  L.roof.visible = v === 'full';
  L.upper.visible = v !== 'ground';
  L.slab1.visible = v !== 'ground';
  L.furnU.visible = v !== 'ground' && state.furniture;
  L.furnG.visible = state.furniture;
  L.neighbors.visible = state.neighbors;
  for (const { r, o } of labels) {
    let show = state.labels && state.mode === 'orbit';
    if (show) {
      if (v === 'full') show = false;
      else if (v === 'noroof') show = r.level === 1 || r.id === 'piscina' || r.id === 'deck';
      else show = r.level === 0;
    }
    o.visible = show;
    if (!show) o.element.style.display = 'none';
  }
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  shadowsDirty = true;
  invalidate();
}

async function applyLight() {
  const n = state.night;
  hemi.intensity = n ? 0.3 : 1.1;
  hemi.color.set(n ? 0x6b7aa8 : 0xdfe9f3);
  hemi.groundColor.set(n ? 0x2a2622 : 0xc9c0b2);
  sun.intensity = n ? 0.22 : 2.6;
  sun.color.set(n ? 0x9db0e0 : 0xfff1dc);
  B.lights.forEach((l) => {
    l.visible = n && (!tier.low || l.userData.key);
    l.intensity = l.userData.nightIntensity * (tier.low ? 1.25 : 1);
  });
  M.lamp.emissiveIntensity = n ? 3.2 : 0.25;
  M.poolLamp.emissiveIntensity = n ? 4 : 0.2;
  M.fire.emissiveIntensity = n ? 2.2 : 0.4;
  M.water.opacity = n ? 0.75 : 0.62;
  shiny.forEach((m) => { m.envMapIntensity = n ? 0.2 : 0.9; });
  scene.background = n ? sky.night : sky.day;
  scene.fog.color.set(n ? 0x111a2b : 0xcfdde8);
  $$('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.light === 'night') === n)));
  await precompile(n ? 'Acendendo as luzes…' : 'Ajustando a luz do dia…');
}

/** Compila os shaders sem travar a tela (quando o navegador permite). */
async function precompile(msg) {
  if (!renderer.compileAsync) {
    invalidate();
    return;
  }
  const t = setTimeout(() => toast(msg), 250);
  paused = true;
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    // Sem compilação paralela: o próximo quadro compila normalmente.
  }
  clearTimeout(t);
  hideToast();
  paused = false;
  invalidate();
}

// ---------- câmera ----------
function flyTo(pos, target, dur = 0.9) {
  const t1 = new THREE.Vector3(...target);
  const p1 = new THREE.Vector3(...pos);
  // Celular em pé: a tela é estreita, então afasta a câmera para a casa caber.
  if (camera.aspect < 0.9) p1.sub(t1).multiplyScalar(Math.min(1.7, 0.85 / camera.aspect)).add(t1);
  tween = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1, t1 };
  invalidate();
}

function clampTarget() {
  const t = controls.target;
  t.x = Math.min(14, Math.max(-8, t.x));
  t.y = Math.min(9, Math.max(-1, t.y));
  t.z = Math.min(8, Math.max(-38, t.z));
}

// ---------- modos ----------
function setMode(mode) {
  if (mode === state.mode) return;
  if (state.mode === 'walk') {
    walk.disable();
    camera.fov = 50;
    camera.updateProjectionMatrix();
    if (orbitPose) {
      camera.position.copy(orbitPose.pos);
      controls.target.copy(orbitPose.target);
    }
  }
  state.mode = mode;
  document.body.dataset.mode = mode;
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  controls.enabled = mode === 'orbit';
  $('#walkHud').hidden = mode !== 'walk';
  $('#planView').hidden = mode !== 'plan';
  if (mode === 'walk') {
    tween = null;
    orbitPose = { pos: camera.position.clone(), target: controls.target.clone() };
    camera.fov = 72;
    camera.updateProjectionMatrix();
    walk.enable(walk.last || SPOTS[0]);
  }
  if (mode === 'plan') renderPlan();
  applyView();
}

function renderPlan() {
  const box = $('#planCanvas');
  const horizontal = box.clientWidth >= box.clientHeight;
  drawPlan($('#planSvg'), B.plan, state.planLevel, horizontal);
  zoom.reset();
  $$('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.level) === state.planLevel)));
}

function focusRoom(r) {
  if (state.mode === 'plan') {
    state.planLevel = r.level;
    renderPlan();
    return;
  }
  if (state.mode === 'walk') setMode('orbit');
  if (!r.outdoor) state.view = r.level === 1 ? 'noroof' : 'ground';
  applyView();
  const y = (r.level === 1 ? 3 : 0) + 0.6;
  flyTo([r.at[0] - 4.2, y + 7.5, -r.at[1] + 5.2], [r.at[0], y, -r.at[1]]);
}

// ---------- interface ----------
let toastTimer = 0;
function toast(text, ms = 0) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(hideToast, ms);
}
function hideToast() {
  $('#toast').hidden = true;
}

function togglePanel(open) {
  const panel = $('#panel');
  const isOpen = open ?? panel.dataset.open !== 'true';
  panel.dataset.open = String(isOpen);
  $('#panelToggle').setAttribute('aria-expanded', String(isOpen));
}

function roomList() {
  const wrap = $('#rooms');
  for (const [title, lvl] of [['Térreo e lazer', 0], ['Pavimento superior', 1]]) {
    const h = document.createElement('p');
    h.className = 'eyebrow';
    h.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'room-grid';
    ROOMS.filter((r) => r.level === lvl && r.id !== 'vazio').forEach((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'room-btn';
      b.innerHTML = `<span>${r.name}</span><small>${fmt(r.area, 1)} m²</small>`;
      b.addEventListener('click', () => {
        focusRoom(r);
        if (window.innerWidth <= 760) togglePanel(false);
      });
      grid.append(b);
    });
    wrap.append(h, grid);
  }
}

function areaTable() {
  const area = (id) => ROOMS.find((r) => r.id === id).area;
  const inner = ROOMS.filter((r) => r.level === 0 && !r.outdoor && !r.noArea).reduce((a, r) => a + r.area, 0);
  const upper = ROOMS.filter((r) => r.level === 1 && !r.noArea).reduce((a, r) => a + r.area, 0);
  const rows = [
    ['Térreo (ambientes internos)', inner - area('gourmet') - area('lavanderia')],
    ['Gourmet + lavanderia (coberto)', area('gourmet') + area('lavanderia')],
    ['Pavimento superior (útil)', upper],
    ['Piscina (espelho d’água)', area('piscina')],
    ['Área construída aprox.', 214.5],
    ['Terreno', 192],
  ];
  $('#areas').innerHTML = rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${fmt(v, 1)} m²</td></tr>`).join('');
}

function bindUI() {
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    if (state.mode !== 'orbit') setMode('orbit');
    applyView();
  }));
  $$('[data-cam]').forEach((b) => b.addEventListener('click', () => {
    if (state.mode !== 'orbit') setMode('orbit');
    if (b.dataset.cam === 'lateral' || b.dataset.cam === 'fachada' || b.dataset.cam === 'fundos') state.view = 'full';
    applyView();
    const c = CAMS[b.dataset.cam];
    flyTo(c.pos, c.target);
  }));
  $$('[data-light]').forEach((b) => b.addEventListener('click', () => {
    const night = b.dataset.light === 'night';
    if (night === state.night) return;
    state.night = night;
    applyLight();
  }));
  $$('[data-level]').forEach((b) => b.addEventListener('click', () => {
    state.planLevel = Number(b.dataset.level);
    renderPlan();
  }));
  for (const id of ['labels', 'furniture', 'neighbors']) {
    const input = $(`#opt-${id}`);
    input.checked = state[id];
    input.addEventListener('change', () => {
      state[id] = input.checked;
      applyView();
    });
  }
  // "Ir para…" volta a ficar selecionado depois de cada salto, para dar para repetir o mesmo lugar.
  const spotSel = $('#spot');
  spotSel.append(new Option('Ir para…', ''));
  SPOTS.forEach((s) => spotSel.append(new Option(s.name, s.id)));
  spotSel.addEventListener('change', () => {
    const spot = SPOTS.find((s) => s.id === spotSel.value);
    if (spot) walk.teleport(spot);
    spotSel.value = '';
    spotSel.blur();
  });
  $('#exitWalk').addEventListener('click', () => setMode('orbit'));
  $('#panelToggle').addEventListener('click', () => togglePanel());
  togglePanel(!coarse && window.innerWidth > 760);
  roomList();
  areaTable();

  const dlg = $('#promptDlg');
  $('#promptText').textContent = PROMPT;
  const closeDlg = () => (dlg.close ? dlg.close() : dlg.removeAttribute('open'));
  $('#openPrompt').addEventListener('click', () => (dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '')));
  $('#closePrompt').addEventListener('click', closeDlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });
  $('#copyPrompt').addEventListener('click', async () => {
    const status = $('#copyStatus');
    try {
      await navigator.clipboard.writeText(PROMPT);
      status.textContent = 'Prompt copiado.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('#promptText'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      status.textContent = 'Texto selecionado: copie pelo menu do aparelho.';
    }
  });

  zoom = planZoom($('#planSvg'), { in: $('#zoomIn'), out: $('#zoomOut'), reset: $('#zoomReset') });
}

// ---------- desempenho ----------
const maxDpr = Math.min(window.devicePixelRatio || 1, tier.low ? 1.5 : 1.75);
const perf = { dpr: maxDpr, min: Math.min(maxDpr, tier.low ? 0.7 : 1), frames: 0, time: 0, good: 0, last: 0 };

function adaptResolution(now, wasActive) {
  if (wasActive && perf.last) {
    perf.time += now - perf.last;
    perf.frames++;
  }
  perf.last = wasActive ? now : 0;
  if (perf.frames < 45) return;
  const avg = perf.time / perf.frames;
  perf.frames = 0;
  perf.time = 0;
  let next = perf.dpr;
  if (avg > 24 && perf.dpr > perf.min) {
    next = Math.max(perf.min, perf.dpr - 0.25);
    perf.good = 0;
  } else if (avg < 17.5 && perf.dpr < maxDpr) {
    perf.good++;
    if (perf.good >= 3) {
      next = Math.min(maxDpr, perf.dpr + 0.25);
      perf.good = 0;
    }
  }
  if (next !== perf.dpr) {
    perf.dpr = next;
    renderer.setPixelRatio(next);
    resize();
  }
}

function resize() {
  const stage = $('#stage');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (state.mode === 'plan') renderPlan();
  invalidate();
}

// ---------- laço ----------
const clock = new THREE.Clock();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
let lastAnim = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (paused || state.mode === 'plan') return;
  let active = false;
  if (tween && state.mode === 'orbit') {
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const k = ease(tween.t);
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    if (tween.t >= 1) tween = null;
    active = true;
  }
  if (state.mode === 'walk') active = walk.update(dt) || active;
  else if (controls.update()) active = true;
  // Água e cascata: animação contínua só enquanto há movimento; parado, em ritmo baixo.
  const gap = active ? 0 : tier.low ? 140 : 60;
  if (now - lastAnim >= gap) {
    const s = Math.min(0.1, (now - lastAnim) / 1000);
    M.animated[0].offset.x += s * 0.02;
    M.animated[0].offset.y += s * 0.013;
    M.animated[1].offset.y += s * 0.9;
    lastAnim = now;
    dirty = true;
  }
  if (!dirty && !active) {
    adaptResolution(now, false);
    return;
  }
  if (shadowsDirty) {
    renderer.shadowMap.needsUpdate = true;
    shadowsDirty = false;
  }
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (state.mode === 'orbit' && state.labels && state.view !== 'full') {
    declutter(labelRenderer.domElement.clientWidth, labelRenderer.domElement.clientHeight);
  }
  dirty = false;
  adaptResolution(now, active);
}

function showError(err) {
  const box = $('#loading');
  box.classList.add('error');
  const webgl = /webgl|context/i.test(String(err && err.message));
  $('#loadMsg').textContent = webgl
    ? 'Este navegador não conseguiu abrir o 3D (WebGL desligado ou indisponível). Tente o Safari ou o Chrome atualizados.'
    : 'Não deu para montar a casa. Confira a internet e recarregue a página.';
}

async function boot() {
  try {
    setStatus('Preparando o 3D…');
    renderer = createRenderer();
    $('#stage').appendChild(renderer.domElement);
    labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = 'labels';
    $('#stage').appendChild(labelRenderer.domElement);
    createScene();
    setStatus('Criando as texturas…');
    await nextFrame();
    createModel();
    setStatus('Levantando as paredes…');
    await nextFrame();
    buildHouse(B, M);
    setStatus('Mobiliando os ambientes…');
    await nextFrame();
    furnish(B, M);
    ['ground', 'upper', 'slab1', 'roof', 'site', 'furnG', 'furnU', 'neighbors'].forEach((n) => B.mergeLayer(n));
    B.layers.neighbors.visible = false;
    createLabels();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 1.2;
    controls.maxDistance = 95;
    controls.addEventListener('change', () => { clampTarget(); invalidate(); });
    controls.addEventListener('start', () => { tween = null; });
    camera.position.set(...CAMS.fachada.pos);
    controls.target.set(...CAMS.fachada.target);

    walk = new Walk(camera, renderer.domElement, B, {
      onLockChange: (locked) => { $('#walkHint').dataset.locked = String(locked); },
      onLockFail: () => { $('#walkHint').dataset.drag = 'true'; },
      onLook: invalidate,
      onMove: (p) => {
        const lvl = p.y > 1.5 ? 1 : 0;
        const r = ROOMS.find((rm) => rm.level === lvl && rm.id !== 'vazio' && rm.rects.some(([x1, x2, z1, z2]) => p.x >= x1 && p.x <= x2 && p.z >= z1 && p.z <= z2));
        const txt = r ? r.name : p.z < 0 ? 'Calçada' : 'Área externa';
        const where = $('#where');
        if (where.textContent !== txt) where.textContent = txt;
      },
    });
    walk.bindJoystick($('#joy'), $('#joyKnob'));

    bindUI();
    new ResizeObserver(resize).observe($('#stage'));
    resize();
    applyView();
    setStatus('Acendendo as luzes…');
    await applyLight();
    document.body.dataset.mode = 'orbit';
    requestAnimationFrame(frame);
    await nextFrame();
    document.body.classList.add('ready');
    flyTo([-8.5, 7.5, 10], [3, 2.6, -9], 2.2);
  } catch (err) {
    showError(err);
    throw err;
  }
}

boot();
