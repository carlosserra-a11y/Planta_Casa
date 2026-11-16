// Texturas procedurais (canvas) e materiais do projeto. Sem imagens externas.
import * as THREE from 'three';

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + d)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function speckle(ctx, size, r, count, alpha, maxSize = 2) {
  for (let i = 0; i < count; i++) {
    const v = r() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${(alpha * r()).toFixed(3)})`;
    const s = 0.6 + r() * maxSize;
    ctx.fillRect(r() * size, r() * size, s, s);
  }
}

function blotches(ctx, size, r, count, alpha, radius) {
  for (let i = 0; i < count; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = radius * (0.4 + r());
    const v = r() < 0.5 ? 0 : 255;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        g.addColorStop(0, `rgba(${v},${v},${v},${alpha})`);
        g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
  }
}

function plaster(base, seed, { count = 2600, alpha = 0.1, blot = 10, blotA = 0.05 } = {}) {
  const size = 256;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  blotches(x, size, r, blot, blotA, 60);
  speckle(x, size, r, count, alpha);
  return c;
}

// Muro chapiscado das fotos: manchas e furinhos escuros.
function roughConcrete(base, seed) {
  const size = 512;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  blotches(x, size, r, 26, 0.07, 90);
  speckle(x, size, r, 9000, 0.16, 2.5);
  for (let i = 0; i < 260; i++) {
    x.fillStyle = `rgba(30,28,25,${(0.25 + r() * 0.35).toFixed(2)})`;
    x.beginPath();
    x.ellipse(r() * size, r() * size, 1 + r() * 3, 0.6 + r() * 1.5, r() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

function planks(colors, n, seed, { vertical = true, size = 512, joints = true, gap = 'rgba(0,0,0,0.38)' } = {}) {
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  const w = size / n;
  for (let i = 0; i < n; i++) {
    let pos = -r() * size * 0.6;
    while (pos < size) {
      const len = size * (0.45 + r() * 0.7);
      x.fillStyle = colors[Math.floor(r() * colors.length)];
      if (vertical) x.fillRect(i * w, pos, w, len);
      else x.fillRect(pos, i * w, len, w);
      for (let k = 0; k < 12; k++) {
        x.strokeStyle = `rgba(45,22,6,${(0.04 + r() * 0.1).toFixed(3)})`;
        x.lineWidth = 0.5 + r();
        x.beginPath();
        const o = i * w + r() * w;
        const wob = () => (r() - 0.5) * w * 0.35;
        if (vertical) {
          x.moveTo(o, pos);
          x.bezierCurveTo(o + wob(), pos + len * 0.33, o + wob(), pos + len * 0.66, o, pos + len);
        } else {
          x.moveTo(pos, o);
          x.bezierCurveTo(pos + len * 0.33, o + wob(), pos + len * 0.66, o + wob(), pos + len, o);
        }
        x.stroke();
      }
      if (joints) {
        x.fillStyle = gap;
        if (vertical) x.fillRect(i * w, pos, w, 1.5);
        else x.fillRect(pos, i * w, 1.5, w);
      }
      pos += len;
    }
    x.fillStyle = gap;
    if (vertical) x.fillRect(i * w, 0, 1.6, size);
    else x.fillRect(0, i * w, size, 1.6);
  }
  return c;
}

function tiles(base, grout, n, seed, { vary = 6, size = 512, line = 1.2 } = {}) {
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  const w = size / n;
  x.fillStyle = grout;
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      x.fillStyle = shade(base, (r() - 0.5) * vary);
      x.fillRect(i * w + line, j * w + line, w - line * 2, w - line * 2);
    }
  }
  speckle(x, size, r, 2500, 0.05);
  return c;
}

function marble(base, seed, n = 2) {
  const size = 512;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  x.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    x.strokeStyle = `rgba(120,118,112,${(0.08 + r() * 0.18).toFixed(2)})`;
    x.lineWidth = 0.6 + r() * 2.2;
    x.beginPath();
    let px = r() * size;
    let py = 0;
    x.moveTo(px, py);
    while (py < size) {
      px += (r() - 0.5) * 60;
      py += 20 + r() * 40;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  const w = size / n;
  x.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i <= n; i++) {
    x.fillRect(i * w, 0, 1.2, size);
    x.fillRect(0, i * w, size, 1.2);
  }
  return c;
}

function grass(seed) {
  const size = 512;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = '#56733a';
  x.fillRect(0, 0, size, size);
  blotches(x, size, r, 20, 0.06, 80);
  const greens = ['#6d8c45', '#4a6630', '#7d9a50', '#5e7d3c', '#3f5a28'];
  for (let i = 0; i < 14000; i++) {
    x.strokeStyle = greens[Math.floor(r() * greens.length)];
    x.lineWidth = 0.8 + r() * 0.8;
    const px = r() * size;
    const py = r() * size;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + (r() - 0.5) * 4, py - 3 - r() * 6);
    x.stroke();
  }
  return c;
}

function mosaic(seed) {
  const size = 256;
  const n = 10;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  const w = size / n;
  x.fillStyle = '#e6f2f4';
  x.fillRect(0, 0, size, size);
  const blues = ['#2a8fb8', '#3aa2c8', '#1f7fa8', '#46b0d2', '#2896bf'];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      x.fillStyle = blues[Math.floor(r() * blues.length)];
      x.fillRect(i * w + 1.5, j * w + 1.5, w - 3, w - 3);
    }
  }
  return c;
}

function ashlar(seed, tones) {
  const size = 512;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = '#4a4744';
  x.fillRect(0, 0, size, size);
  const rows = 9;
  const h = size / rows;
  for (let j = 0; j < rows; j++) {
    let px = -r() * 80;
    while (px < size) {
      const w = 50 + r() * 120;
      x.fillStyle = tones[Math.floor(r() * tones.length)];
      x.fillRect(px + 2, j * h + 2, w - 4, h - 4);
      px += w;
    }
  }
  speckle(x, size, r, 6000, 0.12);
  return c;
}

function stripes(colors, n, gapColor, seed, gapFrac = 0.28) {
  const size = 256;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  const w = size / n;
  x.fillStyle = gapColor;
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    x.fillStyle = colors[Math.floor(r() * colors.length)];
    x.fillRect(i * w, 0, w * (1 - gapFrac), size);
    x.fillStyle = 'rgba(255,255,255,0.06)';
    x.fillRect(i * w, 0, 2, size);
  }
  return c;
}

function slats() {
  const size = 128;
  const [c, x] = makeCanvas(size);
  x.fillStyle = '#1e1f21';
  x.fillRect(0, 0, size, size);
  for (let j = 0; j < 16; j++) {
    x.fillStyle = 'rgba(255,255,255,0.08)';
    x.fillRect(0, j * 8, size, 2);
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(0, j * 8 + 7, size, 1);
  }
  return c;
}

function greenWall(seed) {
  const size = 512;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = '#26381c';
  x.fillRect(0, 0, size, size);
  const greens = ['#3f6b2a', '#56843a', '#2f5420', '#6a9a45', '#7aa856', '#48733a'];
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = greens[Math.floor(r() * greens.length)];
    x.beginPath();
    x.ellipse(r() * size, r() * size, 4 + r() * 9, 2 + r() * 4, r() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

function water(seed) {
  const size = 256;
  const [c, x] = makeCanvas(size);
  const r = rng(seed);
  x.fillStyle = '#4fbfdc';
  x.fillRect(0, 0, size, size);
  x.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(255,255,255,${(0.08 + r() * 0.2).toFixed(2)})`;
    x.beginPath();
    const px = r() * size;
    const py = r() * size;
    x.moveTo(px, py);
    x.bezierCurveTo(px + 20, py + (r() - 0.5) * 30, px + 40, py + (r() - 0.5) * 30, px + 60, py);
    x.stroke();
  }
  return c;
}

function solar() {
  const size = 256;
  const [c, x] = makeCanvas(size);
  x.fillStyle = '#c8ccd2';
  x.fillRect(0, 0, size, size);
  const n = 6;
  const w = size / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      x.fillStyle = (i + j) % 2 ? '#1b2a4a' : '#20335a';
      x.fillRect(i * w + 2, j * w + 2, w - 4, w - 4);
    }
  }
  return c;
}

function tactile() {
  const size = 128;
  const [c, x] = makeCanvas(size);
  x.fillStyle = '#a3442f';
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 4; i++) {
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(i * 32 + 6, 0, 10, size);
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(i * 32 + 16, 0, 3, size);
  }
  return c;
}

/** Cria todos os materiais compartilhados do modelo. */
export function createMaterials(renderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (canvas, meters) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / meters, 1 / meters);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const S = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const woodWarm = ['#8d5a34', '#9b663c', '#80502d', '#a46d42', '#93603a'];

  const waterTex = tex(water(31), 1.4);
  const M = {
    wallExt: S({ map: tex(plaster('#c3bfb6', 3), 2.2), roughness: 0.95 }),
    wallInt: S({ map: tex(plaster('#efece6', 5, { alpha: 0.04, count: 1200, blotA: 0.025 }), 2.2), roughness: 0.95 }),
    wallGarage: S({ map: tex(plaster('#a8a49b', 9), 2.2), roughness: 0.95 }),
    ceiling: S({ color: 0xf2f0ec, roughness: 0.95 }),
    black: S({ color: 0x1d1e20, roughness: 0.6 }),
    frame: S({ color: 0x18191b, roughness: 0.4, metalness: 0.4 }),
    white: S({ color: 0xf4f3f0, roughness: 0.6 }),
    woodClad: S({ map: tex(planks(woodWarm, 6, 11), 1.2), roughness: 0.7 }),
    ripado: S({ map: tex(stripes(woodWarm, 16, '#2a1c12', 4), 1.0), roughness: 0.7 }),
    woodFloor: S({ map: tex(planks(['#b08457', '#a67a4e', '#bb8f62', '#9d7148'], 8, 21, { vertical: false }), 1.6), roughness: 0.6 }),
    deck: S({ map: tex(planks(['#7a5232', '#6d4a2c', '#86593a', '#73492a'], 7, 33, { vertical: false }), 1.0), roughness: 0.8 }),
    woodCeil: S({ map: tex(planks(['#a87b4f', '#9a6e44', '#b4875a'], 8, 41), 1.2), roughness: 0.7 }),
    oak: S({ map: tex(planks(['#b38a5c', '#a98053', '#bd9466'], 6, 51, { vertical: false, joints: false }), 0.9), roughness: 0.6 }),
    tileFloor: S({ map: tex(tiles('#dcd7cd', '#c9c3b8', 2, 7, { vary: 5 }), 1.8), roughness: 0.35 }),
    tileOut: S({ map: tex(tiles('#b4ada2', '#9d968b', 2, 8, { vary: 10 }), 1.2), roughness: 0.8 }),
    marble: S({ map: tex(marble('#eeece8', 12), 1.2), roughness: 0.25 }),
    garageFloor: S({ map: tex(plaster('#9d9a94', 13, { alpha: 0.14 }), 1.5), roughness: 0.9 }),
    muro: S({ map: tex(roughConcrete('#bdb8ae', 7), 1.6), roughness: 1 }),
    concreteLight: S({ map: tex(plaster('#cfccc5', 15, { alpha: 0.12 }), 1.2), roughness: 0.9 }),
    sidewalk: S({ map: tex(tiles('#b9b6af', '#8f8c86', 2, 17, { vary: 10 }), 2.0), roughness: 0.95 }),
    asphalt: S({ map: tex(plaster('#3a3b3d', 19, { alpha: 0.25, count: 9000 }), 2.0), roughness: 1 }),
    tactile: S({ map: tex(tactile(), 0.4), roughness: 0.9 }),
    grass: S({ map: tex(grass(23), 1.6), roughness: 1 }),
    soil: S({ color: 0x4b3b2c, roughness: 1 }),
    pebbles: S({ map: tex(plaster('#e5e1d8', 27, { alpha: 0.35, count: 6000 }), 0.6), roughness: 1 }),
    stone: S({ map: tex(ashlar(29, ['#77736d', '#8a857e', '#6b6762', '#958f87', '#5f5b56']), 1.6), roughness: 0.95 }),
    coping: S({ map: tex(plaster('#dcd6ca', 35, { alpha: 0.08 }), 1.0), roughness: 0.8 }),
    mosaic: S({ map: tex(mosaic(37), 0.5), roughness: 0.3 }),
    water: new THREE.MeshStandardMaterial({ color: 0x9fdcef, map: waterTex, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    cascade: new THREE.MeshStandardMaterial({ color: 0xdff6ff, map: tex(water(39), 0.6), transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    greenWall: S({ map: tex(greenWall(43), 1.0), roughness: 1 }),
    shutter: S({ map: tex(slats(), 0.32), roughness: 0.55 }),
    solar: S({ map: tex(solar(), 1.0), roughness: 0.3, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa9c6d4, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.2, depthWrite: false }),
    glassDark: S({ color: 0x1d262c, roughness: 0.1, metalness: 0.5 }),
    mirror: S({ color: 0xc3ced4, roughness: 0.12, metalness: 0.55 }),
    steel: S({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.85 }),
    graphite: S({ color: 0x3a3c3f, roughness: 0.55 }),
    quartz: S({ color: 0xe9e7e2, roughness: 0.25 }),
    ceramic: S({ color: 0xf7f7f5, roughness: 0.2 }),
    fabric: S({ color: 0x8e8a83, roughness: 1 }),
    fabricDark: S({ color: 0x4d4a46, roughness: 1 }),
    terracotta: S({ color: 0xb4694a, roughness: 1 }),
    sage: S({ color: 0x6f7f62, roughness: 1 }),
    linen: S({ color: 0xf1efea, roughness: 1 }),
    duvet: S({ color: 0xd6cfc2, roughness: 1 }),
    navy: S({ color: 0x3f4f68, roughness: 1 }),
    rug: S({ color: 0xcbc1b0, roughness: 1 }),
    leather: S({ color: 0x7a4b2e, roughness: 0.7 }),
    carPaint: S({ color: 0xf1f1f0, roughness: 0.25, metalness: 0.35 }),
    tyre: S({ color: 0x161616, roughness: 0.9 }),
    redLight: S({ color: 0x8a1c1c, emissive: 0x5a0a0a, emissiveIntensity: 0.6 }),
    pot: S({ color: 0x3b3936, roughness: 0.8 }),
    potLight: S({ color: 0xd8d2c6, roughness: 0.9 }),
    leaf: S({ color: 0x4f7a33, roughness: 0.9, side: THREE.DoubleSide }),
    leafDark: S({ color: 0x35571f, roughness: 0.9, side: THREE.DoubleSide }),
    trunk: S({ color: 0x6b5a45, roughness: 1 }),
    umbrella: S({ color: 0xece6da, roughness: 1, side: THREE.DoubleSide }),
    screen: S({ color: 0x0c0d0f, roughness: 0.2, metalness: 0.2 }),
    books: S({ color: 0x8c5a3c, roughness: 0.9 }),
    lamp: S({ color: 0xfff6e6, emissive: 0xffd49a, emissiveIntensity: 0.3 }),
    poolLamp: S({ color: 0xe0fbff, emissive: 0x6fe3ff, emissiveIntensity: 0.3 }),
    fire: S({ color: 0x2b1a12, emissive: 0xff7a2a, emissiveIntensity: 0.0 }),
    numberPlate: null,
  };
  M.numberPlate = S({ map: numberTexture(), transparent: true, roughness: 0.6 });
  M.animated = [waterTex, M.cascade.map];
  return M;
}

function numberTexture() {
  const [c, x] = makeCanvas(256);
  x.clearRect(0, 0, 256, 256);
  x.fillStyle = '#141414';
  x.fillRect(20, 92, 46, 72);
  x.font = 'bold 120px Arial, sans-serif';
  x.textBaseline = 'middle';
  x.fillText('00', 84, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cache de materiais simples por cor (móveis variados). */
export function colorMat(cache, hex, rough = 0.8, metal = 0) {
  const key = `${hex}-${rough}-${metal}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }));
  return cache.get(key);
}
