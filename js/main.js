// Cena, câmeras, modos (Explorar / Caminhar / Planta) e interface.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMaterials } from './materials.js';
import { Builder } from './builder.js';
import { buildHouse } from './house.js';
import { furnish } from './furniture.js';
import { Walk } from './walk.js';
import { drawPlan } from './plan2d.js';
import { ROOMS, SPOTS, fmt } from './plan-data.js';
import { PROMPT } from './prompt.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const coarse = window.matchMedia('(pointer: coarse)').matches;

// ---------- renderização ----------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
scene.fog = new THREE.Fog(0xcfdde8, 70, 230);

const hemi = new THREE.HemisphereLight(0xdfe9f3, 0x8a7d6a, 1.1);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.position.set(-14, 22, 10);
sun.target.position.set(3, 0, -16);
sun.castShadow = true;
sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
scene.add(hemi, sun, sun.target);

function skyTexture(stops, stars) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  if (stars) {
    for (let i = 0; i < 220; i++) {
      x.fillStyle = `rgba(255,255,255,${(Math.random() * 0.7).toFixed(2)})`;
      x.fillRect(Math.random() * 512, Math.random() * 300, 1.2, 1.2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const skyDay = skyTexture([[0, '#7fa9cf'], [0.55, '#c9dceb'], [1, '#e9eef0']]);
const skyNight = skyTexture([[0, '#04070f'], [0.6, '#0d1526'], [1, '#1c2333']], true);

// ---------- modelo ----------
const M = createMaterials(renderer);
// Reflexos (inox, espelhos, vidros) com um ambiente de estúdio leve.
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const shiny = [M.steel, M.mirror, M.carPaint, M.glassDark, M.quartz, M.ceramic, M.water, M.glass, M.frame, M.screen];
shiny.forEach((m) => { m.envMap = envTex; });
const B = new Builder(scene);
buildHouse(B, M);
furnish(B, M);
['ground', 'upper', 'slab1', 'roof', 'site', 'furnG', 'furnU', 'neighbors'].forEach((n) => B.mergeLayer(n));
B.layers.neighbors.visible = false;

const labels = ROOMS.map((r) => {
  const div = document.createElement('div');
  div.className = 'room-label';
  div.innerHTML = `<b>${r.name}</b>${r.noArea ? '' : `<span>${fmt(r.area)} m²</span>`}`;
  const o = new CSS2DObject(div);
  o.position.set(r.at[0], r.level === 1 ? 4.0 : r.outdoor ? 0.7 : 1.1, -r.at[1]);
  scene.add(o);
  return { r, o };
});

// ---------- estado ----------
const state = { mode: 'orbit', view: 'full', night: false, labels: true, furniture: true, neighbors: false, planLevel: 0 };
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 1.2;
controls.maxDistance = 95;

const CAMS = {
  fachada: { pos: [1.2, 1.75, 10.5], target: [3.1, 3.1, -6] },
  aerea: { pos: [-15, 24, 7], target: [3, 0, -15] },
  fundos: { pos: [4.6, 5.2, -38.5], target: [2.6, 1.8, -22] },
  lateral: { pos: [-19, 6.5, -15], target: [3, 2.6, -15] },
  topo: { pos: [3, 36, -15.99], target: [3, 0, -16] },
};
let tween = null;
function flyTo(pos, target, dur = 0.9) {
  tween = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target) };
}
camera.position.set(...CAMS.fachada.pos);
controls.target.set(...CAMS.fachada.target);
flyTo([-8.5, 7.5, 10], [3, 2.6, -9], 2.2);

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
    o.element.style.display = show ? '' : 'none';
  }
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
}

function applyLight() {
  const n = state.night;
  hemi.intensity = n ? 0.3 : 1.1;
  hemi.color.set(n ? 0x6b7aa8 : 0xdfe9f3);
  hemi.groundColor.set(n ? 0x2a2622 : 0xc9c0b2);
  sun.intensity = n ? 0.22 : 2.6;
  sun.color.set(n ? 0x9db0e0 : 0xfff1dc);
  B.lights.forEach((l) => {
    l.visible = n;
    l.intensity = l.userData.nightIntensity;
  });
  M.lamp.emissiveIntensity = n ? 3.2 : 0.25;
  M.poolLamp.emissiveIntensity = n ? 4 : 0.2;
  M.fire.emissiveIntensity = n ? 2.2 : 0.4;
  M.water.opacity = n ? 0.75 : 0.62;
  shiny.forEach((m) => { m.envMapIntensity = n ? 0.2 : 0.9; });
  scene.background = n ? skyNight : skyDay;
  scene.fog.color.set(n ? 0x111a2b : 0xcfdde8);
  $$('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.light === 'night') === n)));
}

// ---------- modos ----------
const walkHud = $('#walkHud');
const hint = $('#walkHint');
const where = $('#where');
const walk = new Walk(camera, renderer.domElement, B, {
  onLockChange: (locked) => { hint.dataset.locked = String(locked); },
  onMove: (p) => {
    const lvl = p.y > 1.5 ? 1 : 0;
    const r = ROOMS.find((rm) => rm.level === lvl && rm.id !== 'vazio' && rm.rects.some(([x1, x2, z1, z2]) => p.x >= x1 && p.x <= x2 && p.z >= z1 && p.z <= z2));
    const txt = r ? r.name : p.z < 0 ? 'Calçada' : 'Área externa';
    if (where.textContent !== txt) where.textContent = txt;
  },
});
walk.bindJoystick($('#joy'), $('#joyKnob'));
let orbitPose = null;

function setMode(mode) {
  if (mode === state.mode) return;
  const prev = state.mode;
  if (prev === 'walk') {
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
  walkHud.hidden = mode !== 'walk';
  $('#planView').hidden = mode !== 'plan';
  if (mode === 'walk') {
    tween = null;
    orbitPose = { pos: camera.position.clone(), target: controls.target.clone() };
    camera.fov = 72;
    camera.updateProjectionMatrix();
    const spot = SPOTS.find((s) => s.id === $('#spot').value) || SPOTS[0];
    walk.enable(spot);
  }
  if (mode === 'plan') renderPlan();
  applyView();
}

// Planta 2D com zoom (roda do mouse / botões) e arraste para mover.
const planSvg = $('#planSvg');
let baseVB = [0, 0, 1, 1];
let vb = baseVB;
function setVB(v) {
  vb = v;
  planSvg.setAttribute('viewBox', v.join(' '));
}
function renderPlan() {
  const box = $('#planCanvas');
  const horizontal = box.clientWidth >= box.clientHeight;
  drawPlan(planSvg, B.plan, state.planLevel, horizontal);
  baseVB = planSvg.getAttribute('viewBox').split(' ').map(Number);
  vb = baseVB;
  $$('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.level) === state.planLevel)));
}
function svgPoint(cx, cy) {
  const pt = planSvg.createSVGPoint();
  pt.x = cx;
  pt.y = cy;
  return pt.matrixTransform(planSvg.getScreenCTM().inverse());
}
function zoomPlan(k, cx, cy) {
  const r = planSvg.getBoundingClientRect();
  const p = svgPoint(cx ?? r.left + r.width / 2, cy ?? r.top + r.height / 2);
  const [x, y, w, h] = vb;
  const nw = Math.min(baseVB[2], Math.max(2.5, w * k));
  const s = nw / w;
  setVB([p.x - (p.x - x) * s, p.y - (p.y - y) * s, nw, h * s]);
}
planSvg.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomPlan(e.deltaY < 0 ? 0.85 : 1 / 0.85, e.clientX, e.clientY);
}, { passive: false });
let planDrag = null;
planSvg.addEventListener('pointerdown', (e) => {
  planDrag = { id: e.pointerId, p: svgPoint(e.clientX, e.clientY) };
  planSvg.setPointerCapture(e.pointerId);
});
planSvg.addEventListener('pointermove', (e) => {
  if (!planDrag || e.pointerId !== planDrag.id) return;
  const p = svgPoint(e.clientX, e.clientY);
  setVB([vb[0] - (p.x - planDrag.p.x), vb[1] - (p.y - planDrag.p.y), vb[2], vb[3]]);
});
const endPlanDrag = () => { planDrag = null; };
planSvg.addEventListener('pointerup', endPlanDrag);
planSvg.addEventListener('pointercancel', endPlanDrag);
$('#zoomIn').addEventListener('click', () => zoomPlan(0.7));
$('#zoomOut').addEventListener('click', () => zoomPlan(1 / 0.7));
$('#zoomReset').addEventListener('click', () => setVB(baseVB));

function focusRoom(r) {
  const yy = r.level === 1 ? 3 : 0;
  if (state.mode === 'walk') {
    const spot = SPOTS.find((s) => s.id === r.id) || { x: r.at[0], z: r.at[1], y: yy, yaw: 0 };
    walk.teleport(spot);
    return;
  }
  if (state.mode === 'plan') {
    state.planLevel = r.level;
    renderPlan();
    return;
  }
  if (!r.outdoor) state.view = r.level === 1 ? 'noroof' : 'ground';
  applyView();
  const t = [r.at[0], yy + 0.6, -r.at[1]];
  flyTo([t[0] - 4.2, t[1] + 7.5, t[2] + 5.2], t);
}

// ---------- interface ----------
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-view]').forEach((b) => b.addEventListener('click', () => {
  state.view = b.dataset.view;
  if (state.mode !== 'orbit') setMode('orbit');
  applyView();
}));
$$('[data-cam]').forEach((b) => b.addEventListener('click', () => {
  if (state.mode !== 'orbit') setMode('orbit');
  const c = CAMS[b.dataset.cam];
  if (b.dataset.cam === 'lateral' && !state.neighbors) state.view = 'full';
  applyView();
  flyTo(c.pos, c.target);
}));
$$('[data-light]').forEach((b) => b.addEventListener('click', () => {
  state.night = b.dataset.light === 'night';
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

const spotSel = $('#spot');
SPOTS.forEach((s) => spotSel.append(new Option(s.name, s.id)));
spotSel.addEventListener('change', () => {
  walk.teleport(SPOTS.find((s) => s.id === spotSel.value));
  spotSel.blur();
});

function roomList() {
  const groups = [['Térreo e lazer', 0], ['Pavimento superior', 1]];
  const wrap = $('#rooms');
  for (const [title, lvl] of groups) {
    const h = document.createElement('p');
    h.className = 'eyebrow';
    h.textContent = title;
    wrap.append(h);
    const ul = document.createElement('div');
    ul.className = 'room-grid';
    ROOMS.filter((r) => r.level === lvl && r.id !== 'vazio').forEach((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'room-btn';
      b.innerHTML = `<span>${r.name}</span><small>${fmt(r.area, 1)} m²</small>`;
      b.addEventListener('click', () => {
        focusRoom(r);
        if (coarse) togglePanel(false);
      });
      ul.append(b);
    });
    wrap.append(ul);
  }
}
roomList();

function areaTable() {
  const sum = (lvl, out) => ROOMS.filter((r) => r.level === lvl && !r.noArea && !!r.outdoor === out).reduce((a, r) => a + r.area, 0);
  const rows = [
    ['Térreo (ambientes internos)', sum(0, false) - ROOMS.find((r) => r.id === 'gourmet').area - ROOMS.find((r) => r.id === 'lavanderia').area],
    ['Gourmet + lavanderia (coberto)', ROOMS.find((r) => r.id === 'gourmet').area + ROOMS.find((r) => r.id === 'lavanderia').area],
    ['Pavimento superior (útil)', sum(1, false)],
    ['Piscina (espelho d’água)', ROOMS.find((r) => r.id === 'piscina').area],
    ['Área construída aprox.', 214.5],
    ['Terreno', 192],
  ];
  $('#areas').innerHTML = rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${fmt(v, 1)} m²</td></tr>`).join('');
}
areaTable();

const panel = $('#panel');
function togglePanel(open) {
  const isOpen = open ?? panel.dataset.open !== 'true';
  panel.dataset.open = String(isOpen);
  $('#panelToggle').setAttribute('aria-expanded', String(isOpen));
}
$('#panelToggle').addEventListener('click', () => togglePanel());
togglePanel(!coarse && window.innerWidth > 760);

const dlg = $('#promptDlg');
$('#promptText').textContent = PROMPT;
$('#openPrompt').addEventListener('click', () => {
  if (dlg.showModal) dlg.showModal();
  else dlg.setAttribute('open', '');
});
$('#closePrompt').addEventListener('click', () => dlg.close ? dlg.close() : dlg.removeAttribute('open'));
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
    status.textContent = 'Texto selecionado: use Ctrl+C para copiar.';
  }
});
$('#exitWalk').addEventListener('click', () => setMode('orbit'));
document.body.dataset.touch = String(coarse);

// ---------- laço ----------
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (state.mode === 'plan') renderPlan();
}
new ResizeObserver(resize).observe(stage);
resize();

const clock = new THREE.Clock();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween && state.mode === 'orbit') {
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const k = ease(tween.t);
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    if (tween.t >= 1) tween = null;
  }
  if (state.mode === 'walk') walk.update(dt);
  else controls.update();
  M.animated[0].offset.x += dt * 0.02;
  M.animated[0].offset.y += dt * 0.013;
  M.animated[1].offset.y += dt * 0.9;
  if (state.mode !== 'plan') {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
controls.addEventListener('start', () => { tween = null; });

applyView();
applyLight();
document.body.dataset.mode = 'orbit';
frame();
requestAnimationFrame(() => document.body.classList.add('ready'));
