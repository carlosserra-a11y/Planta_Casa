// Móveis, louças, vegetação, carro e pontos de luz. Peças montadas em coordenadas locais:
// frente da peça = +z local. rot 0 = frente para a rua; PI = para o fundo; -PI/2 = para x menor.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { Y } from './plan-data.js';

let B;
let M;
const FG = 'furnG';
const FU = 'furnU';
const LI = 'lights';

function grp(L, x, z, rot = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, -z);
  g.rotation.y = rot;
  B.layer(L).add(g);
  return g;
}

function lb(g, cx, cy, cz, sx, sy, sz, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(cx, cy, cz);
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function lc(g, cx, cy, cz, r, h, mat, seg = 18, rTop = null) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop ?? r, r, h, seg), mat);
  m.position.set(cx, cy, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** Pegada (planta 2D) de uma peça com rotação múltipla de 90°. */
function foot(level, kind, x, z, w, d, rot, extra) {
  const swap = Math.abs(Math.sin(rot)) > 0.5;
  const ww = swap ? d : w;
  const dd = swap ? w : d;
  B.fp(level, kind, x - ww / 2, x + ww / 2, z - dd / 2, z + dd / 2, extra);
}

// ---------- peças ----------
function sofa(L, lvl, x, z, rot, w = 2.4, d = 0.95, y = 0) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.12, 0, w, 0.24, d, M.fabricDark);
  lb(g, 0, 0.33, 0.06, w - 0.36, 0.18, d - 0.22, M.fabric);
  lb(g, 0, 0.62, -d / 2 + 0.12, w, 0.52, 0.24, M.fabric);
  lb(g, -w / 2 + 0.09, 0.44, 0, 0.18, 0.4, d, M.fabric);
  lb(g, w / 2 - 0.09, 0.44, 0, 0.18, 0.4, d, M.fabric);
  lb(g, -w / 4, 0.62, -d / 2 + 0.3, 0.44, 0.4, 0.12, M.terracotta).rotation.x = -0.25;
  lb(g, w / 4, 0.62, -d / 2 + 0.3, 0.44, 0.4, 0.12, M.sage).rotation.x = -0.25;
  foot(lvl, 'sofa', x, z, w, d, rot);
}

function armchair(L, lvl, x, z, rot, y = 0) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.2, 0, 0.8, 0.4, 0.8, M.leather);
  lb(g, 0, 0.62, -0.32, 0.8, 0.5, 0.16, M.leather);
  lb(g, 0, 0.44, 0.04, 0.6, 0.08, 0.6, M.linen);
  foot(lvl, 'chair', x, z, 0.8, 0.8, rot);
}

function chair(L, x, z, rot, y = 0, mat = M.leather) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.46, 0, 0.46, 0.05, 0.46, mat);
  lb(g, 0, 0.78, -0.21, 0.46, 0.5, 0.04, mat);
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) lb(g, a, 0.22, b, 0.03, 0.44, 0.03, M.black);
}

function stool(L, x, z, y = 0) {
  const g = grp(L, x, z, 0, y);
  lc(g, 0, 0.66, 0, 0.19, 0.06, M.leather);
  lc(g, 0, 0.33, 0, 0.025, 0.62, M.black);
  lc(g, 0, 0.01, 0, 0.2, 0.02, M.black);
}

function bed(L, lvl, x, z, rot, w, l, y = 0, headboard = true) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.16, 0, w, 0.28, l, M.fabricDark);
  lb(g, 0, 0.41, 0.01, w - 0.04, 0.22, l - 0.06, M.linen);
  lb(g, 0, 0.535, l * 0.16, w + 0.03, 0.04, l * 0.66, M.duvet);
  lb(g, 0, 0.5, l / 2 - 0.25, w + 0.05, 0.1, 0.36, M.navy);
  const n = w > 1.2 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const px = n === 1 ? 0 : (i === 0 ? -w / 4 : w / 4);
    lb(g, px, 0.6, -l / 2 + 0.28, w / n - 0.12, 0.14, 0.4, M.linen);
  }
  if (headboard) lb(g, 0, 0.62, -l / 2 - 0.04, w + 0.08, 1.15, 0.08, M.fabric);
  foot(lvl, 'bed', x, z, w, l, rot);
}

function nightstand(L, lvl, x, z, rot, y = 0) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.25, 0, 0.45, 0.5, 0.4, M.oak);
  lc(g, 0.08, 0.6, 0, 0.06, 0.2, M.lamp);
  foot(lvl, 'small', x, z, 0.45, 0.4, rot);
}

function desk(L, lvl, x, z, rot, w = 1.2, d = 0.55, y = 0) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.74, 0, w, 0.04, d, M.oak);
  lb(g, -w / 2 + 0.03, 0.36, 0, 0.04, 0.72, d - 0.04, M.black);
  lb(g, w / 2 - 0.03, 0.36, 0, 0.04, 0.72, d - 0.04, M.black);
  lb(g, w / 4, 0.86, -0.08, 0.36, 0.22, 0.02, M.screen);
  lb(g, -w / 4, 0.77, 0, 0.3, 0.02, 0.22, M.graphite);
  foot(lvl, 'desk', x, z, w, d, rot);
}

function toilet(L, lvl, x, z, rot, y = 0) {
  const g = grp(L, x, z, rot, y);
  const bowl = lc(g, 0, 0.2, 0.06, 0.2, 0.4, M.ceramic, 22);
  bowl.scale.z = 1.25;
  lb(g, 0, 0.42, 0.06, 0.38, 0.03, 0.48, M.ceramic);
  lb(g, 0, 0.55, -0.22, 0.4, 0.5, 0.16, M.ceramic);
  foot(lvl, 'wc', x, z, 0.4, 0.62, rot);
}

function vanity(L, lvl, x, z, rot, w, basins = 1, y = 0) {
  const g = grp(L, x, z, rot, y);
  lb(g, 0, 0.56, 0, w, 0.3, 0.5, M.oak);
  lb(g, 0, 0.73, 0, w, 0.04, 0.52, M.quartz);
  for (let i = 0; i < basins; i++) {
    const bx = basins === 1 ? 0 : (i === 0 ? -w / 4 : w / 4);
    lb(g, bx, 0.8, 0.04, 0.42, 0.1, 0.32, M.ceramic);
    lc(g, bx, 0.88, -0.17, 0.015, 0.26, M.steel);
  }
  lb(g, 0, 1.5, -0.25, w * 0.92, 0.8, 0.02, M.mirror);
  foot(lvl, 'vanity', x, z, w, 0.52, rot);
}

function plant(L, x, z, s = 1, y = 0, potMat = M.pot) {
  const g = grp(L, x, z, 0, y);
  lc(g, 0, 0.22 * s, 0, 0.2 * s, 0.44 * s, potMat, 16, 0.24 * s);
  const leaves = [[0, 0.75, 0, 0.32], [0.14, 0.62, 0.08, 0.24], [-0.12, 0.66, -0.06, 0.26], [0.04, 0.95, -0.05, 0.22]];
  leaves.forEach(([lx, ly, lz, r], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), i % 2 ? M.leafDark : M.leaf);
    m.position.set(lx * s, ly * s, lz * s);
    m.castShadow = true;
    g.add(m);
  });
}

/** Palmeira areca estilizada (como a das fotos). */
function palm(L, x, z, h = 2.2, y = 0) {
  const g = grp(L, x, z, 0, y);
  const stems = [[0, 0, 1], [0.18, 0.1, 0.85], [-0.15, 0.12, 0.9], [0.05, -0.17, 0.8], [-0.1, -0.12, 0.7]];
  stems.forEach(([sx, sz, k], i) => {
    const hh = h * k;
    const stem = lc(g, sx, hh / 2, sz, 0.035, hh, M.trunk, 8);
    stem.rotation.z = sx * 0.4;
    stem.rotation.x = -sz * 0.4;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + i;
      const fr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), j % 2 ? M.leaf : M.leafDark);
      fr.scale.set(0.16, 0.05, 1.0);
      fr.position.set(sx + Math.sin(a) * 0.38, hh - 0.08, sz + Math.cos(a) * 0.38);
      fr.rotation.y = a;
      fr.rotation.x = 0.55;
      fr.castShadow = true;
      g.add(fr);
    }
  });
}

function pendant(L, x, z, yTop, yBottom, r = 0.13, mat = M.black) {
  const g = grp(L, x, z, 0, 0);
  lc(g, 0, (yTop + yBottom) / 2 + r, 0, 0.006, yTop - yBottom - r, M.black, 6);
  lc(g, 0, yBottom + r * 0.6, 0, r, r * 1.2, mat, 20, r * 0.5);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 18), M.lamp);
  bulb.rotation.x = Math.PI / 2;
  bulb.position.set(0, yBottom - 0.001, 0);
  g.add(bulb);
}

function globe(L, x, z, yTop, yBottom, r = 0.18) {
  const g = grp(L, x, z, 0, 0);
  lc(g, 0, (yTop + yBottom + r) / 2, 0, 0.006, yTop - yBottom - r, M.black, 6);
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), M.lamp);
  s.position.y = yBottom;
  g.add(s);
}

function spots(L, list, y) {
  list.forEach(([x, z]) => B.disc(L, x, z, y - 0.004, 0.055, M.lamp));
}

function wardrobe(L, lvl, x1, x2, z1, z2, y0, face, mat = M.white) {
  const h = 2.4;
  B.box(L, x1, x2, y0, y0 + h, z1, z2, mat, { collide: true });
  const along = face === 'z-' || face === 'z+' ? [x1, x2] : [z1, z2];
  const n = Math.max(2, Math.round((along[1] - along[0]) / 0.5));
  for (let i = 1; i < n; i++) {
    const a = along[0] + ((along[1] - along[0]) * i) / n;
    if (face === 'z-') B.box(L, a - 0.004, a + 0.004, y0 + 0.05, y0 + h - 0.05, z1 - 0.004, z1, M.black, { cast: false });
    if (face === 'z+') B.box(L, a - 0.004, a + 0.004, y0 + 0.05, y0 + h - 0.05, z2, z2 + 0.004, M.black, { cast: false });
    if (face === 'x+') B.box(L, x2, x2 + 0.004, y0 + 0.05, y0 + h - 0.05, a - 0.004, a + 0.004, M.black, { cast: false });
    if (face === 'x-') B.box(L, x1 - 0.004, x1, y0 + 0.05, y0 + h - 0.05, a - 0.004, a + 0.004, M.black, { cast: false });
  }
  B.fp(lvl, 'wardrobe', x1, x2, z1, z2);
}

function car(L, x, z, rot) {
  const g = grp(L, x, z, rot, 0);
  lb(g, 0, 0.5, 0, 1.72, 0.56, 3.95, M.carPaint);
  lb(g, 0, 0.98, -0.2, 1.5, 0.48, 2.25, M.glassDark);
  lb(g, 0, 1.24, -0.28, 1.46, 0.06, 1.95, M.carPaint);
  lb(g, 0, 0.8, 1.25, 1.66, 0.12, 0.9, M.carPaint).rotation.x = 0.12;
  for (const [wx, wz] of [[-0.78, 1.25], [0.78, 1.25], [-0.78, -1.3], [0.78, -1.3]]) {
    const w = lc(g, wx, 0.31, wz, 0.31, 0.22, M.tyre, 18);
    w.rotation.z = Math.PI / 2;
  }
  lb(g, -0.6, 0.7, -1.98, 0.32, 0.12, 0.03, M.redLight);
  lb(g, 0.6, 0.7, -1.98, 0.32, 0.12, 0.03, M.redLight);
  lb(g, -0.6, 0.68, 1.98, 0.3, 0.1, 0.03, M.lamp);
  lb(g, 0.6, 0.68, 1.98, 0.3, 0.1, 0.03, M.lamp);
  B.collide(x - 0.86, x + 0.86, 0, 1.3, z - 1.98, z + 1.98, L);
  foot(0, 'car', x, z, 1.72, 3.95, rot);
}

function lounger(L, x, z, rot) {
  const g = grp(L, x, z, rot, 0);
  lb(g, 0, 0.18, 0.15, 0.64, 0.08, 1.4, M.white);
  lb(g, 0, 0.25, 0.15, 0.6, 0.06, 1.36, M.linen);
  const back = lb(g, 0, 0.45, -0.72, 0.6, 0.08, 0.6, M.linen);
  back.rotation.x = -0.75;
  for (const [a, b] of [[-0.28, 0.75], [0.28, 0.75], [-0.28, -0.5], [0.28, -0.5]]) lb(g, a, 0.07, b, 0.04, 0.14, 0.04, M.black);
  foot(0, 'lounger', x, z, 0.64, 1.9, rot);
}

function umbrella(L, x, z, r = 0.95) {
  const g = grp(L, x, z, 0, 0);
  lc(g, 0, 1.15, 0, 0.025, 2.3, M.white, 8);
  lc(g, 0, 0.04, 0, 0.25, 0.08, M.graphite);
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, 0.38, 16, 1, true), M.umbrella);
  c.position.y = 2.25;
  c.castShadow = true;
  g.add(c);
}

// ---------- ambientes ----------
function garage() {
  car(FG, 1.72, 7.95, Math.PI);
  B.box(FG, 0.3, 2.4, 0.0, 2.2, 10.62, 11.0, M.oak, { collide: true });
  B.fp(0, 'cabinet', 0.3, 2.4, 10.62, 11.0);
  spots(FG, [[0.9, 6.2], [2.5, 6.2], [0.9, 9.7], [2.5, 9.7]], Y.gc);
  for (const z of [6.6, 9.4]) {
    B.box(FG, 0.15, 0.27, 1.85, 2.15, z - 0.07, z + 0.07, M.black);
    B.box(FG, 0.27, 0.272, 1.9, 2.1, z - 0.05, z + 0.05, M.lamp, { cast: false });
  }
  B.point(LI, 1.7, 2.6, 8.0, 0xffd7a0, 6, 9, true);
}

function hallAndLavabo() {
  B.box(FG, 3.45, 3.8, 0, 0.8, 7.2, 8.6, M.oak, { collide: true });
  B.fp(0, 'cabinet', 3.45, 3.8, 7.2, 8.6);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), M.mirror);
  mirror.rotation.y = Math.PI / 2;
  mirror.position.set(3.462, 1.6, -7.9);
  B.add(FG, mirror, { cast: false });
  plant(FG, 3.62, 8.35, 0.55, 0.8);
  plant(FG, 5.36, 8.75, 0.9);
  plant(FG, 5.4, 9.02, 0.7);
  globe(FG, 5.3, 5.7, Y.uc, 4.2, 0.2);
  B.point(LI, 5.3, 4.1, 5.7, 0xffd7a0, 7, 10, true);
  B.point(LI, 4.05, 2.55, 4.6, 0xffd7a0, 3, 5);
  toilet(FG, 0, 5.36, 10.36, 0);
  vanity(FG, 0, 5.59, 9.65, -Math.PI / 2, 0.5);
}

function living() {
  B.box(FG, 0.15, 0.19, 0, Y.gc, 11.6, 14.9, M.ripado, { cast: false });
  B.box(FG, 0.19, 0.24, 0.95, 1.78, 12.5, 13.95, M.screen);
  B.box(FG, 0.19, 0.62, 0.15, 0.55, 11.9, 14.6, M.graphite, { collide: true });
  B.box(FG, 0.19, 0.62, 0.55, 0.58, 11.9, 14.6, M.oak);
  B.fp(0, 'cabinet', 0.19, 0.62, 11.9, 14.6);
  B.box(FG, 1.3, 4.9, 0.012, 0.024, 11.7, 14.8, M.rug, { cast: false });
  sofa(FG, 0, 4.1, 13.25, -Math.PI / 2);
  const g = grp(FG, 2.5, 13.25);
  lc(g, 0, 0.36, 0, 0.45, 0.04, M.oak, 28);
  lc(g, 0, 0.17, 0, 0.12, 0.34, M.black);
  lc(g, 0.15, 0.45, 0.05, 0.07, 0.14, M.terracotta);
  B.fp(0, 'round', 2.05, 2.95, 12.8, 13.7);
  armchair(FG, 0, 1.6, 11.95, Math.PI * 0.85);
  const lamp = grp(FG, 4.95, 11.55);
  lc(lamp, 0, 0.8, 0, 0.012, 1.6, M.black, 6);
  lc(lamp, 0, 1.62, 0, 0.2, 0.25, M.lamp, 16, 0.14);
  plant(FG, 0.55, 11.4, 1.1);
  spots(FG, [[1.4, 12.0], [1.4, 14.5], [3.9, 12.0], [3.9, 14.5]], Y.gc);
  B.point(LI, 2.8, 2.6, 13.3, 0xffd7a0, 6, 9, true);
}

function dining() {
  const g = grp(FG, 2.4, 16.8);
  lb(g, 0, 0.74, 0, 1.8, 0.04, 0.95, M.oak);
  lb(g, -0.7, 0.36, 0, 0.06, 0.72, 0.75, M.black);
  lb(g, 0.7, 0.36, 0, 0.06, 0.72, 0.75, M.black);
  B.fp(0, 'table', 1.5, 3.3, 16.325, 17.275);
  chair(FG, 1.95, 17.45, 0);
  chair(FG, 2.85, 17.45, 0);
  chair(FG, 1.95, 16.15, Math.PI);
  chair(FG, 2.85, 16.15, Math.PI);
  chair(FG, 1.25, 16.8, Math.PI / 2);
  chair(FG, 3.55, 16.8, -Math.PI / 2);
  [1.8, 2.4, 3.0].forEach((x) => pendant(FG, x, 16.8, Y.gc, 1.6, 0.12));
  B.box(FG, 0.15, 0.6, 0, 0.8, 15.9, 17.7, M.oak, { collide: true });
  B.fp(0, 'cabinet', 0.15, 0.6, 15.9, 17.7);
  B.box(FG, 0.15, 0.18, 1.25, 2.05, 16.3, 17.3, M.terracotta);
  B.box(FG, 0.15, 0.185, 1.35, 1.95, 16.4, 17.2, M.linen);
  B.point(LI, 2.4, 2.3, 16.8, 0xffcf8f, 5, 7);
}

function kitchen() {
  B.box(FG, 0.15, 0.75, 0, 0.86, 18.4, 21.85, M.graphite, { collide: true });
  B.box(FG, 0.15, 0.78, 0.86, 0.9, 18.4, 21.85, M.quartz);
  B.box(FG, 0.15, 0.16, 0.9, 1.55, 18.4, 21.85, M.marble, { cast: false });
  B.box(FG, 0.3, 0.65, 0.895, 0.905, 20.0, 20.7, M.steel, { cast: false });
  B.cyl(FG, 0.25, 20.35, 0.9, 1.25, 0.015, M.steel);
  B.box(FG, 0.25, 0.7, 0.9, 0.912, 18.9, 19.6, M.glassDark, { cast: false });
  B.box(FG, 0.15, 0.65, 1.95, 2.2, 18.85, 19.65, M.steel);
  B.box(FG, 0.15, 0.45, 2.2, Y.gc, 19.05, 19.45, M.steel);
  B.box(FG, 0.15, 0.5, 1.55, 2.3, 19.75, 21.85, M.oak);
  B.box(FG, 0.15, 0.5, 1.55, 2.3, 18.4, 18.8, M.oak);
  B.fp(0, 'counter', 0.15, 0.78, 18.4, 21.85);
  // Ilha com tampo em cascata
  B.box(FG, 1.75, 2.75, 0, 0.88, 18.7, 21.0, M.graphite, { collide: true });
  B.box(FG, 1.7, 2.95, 0.88, 0.92, 18.66, 21.04, M.quartz);
  B.box(FG, 1.7, 2.95, 0, 0.92, 18.62, 18.66, M.quartz);
  B.box(FG, 1.7, 2.95, 0, 0.92, 21.04, 21.08, M.quartz);
  B.fp(0, 'counter', 1.7, 2.95, 18.62, 21.08);
  [19.2, 19.85, 20.5].forEach((z) => stool(FG, 3.15, z));
  [19.2, 19.85, 20.5].forEach((z) => pendant(FG, 2.3, z, Y.gc, 1.75, 0.1));
  // Geladeira inox + torre quente + despensa
  B.box(FG, 5.15, 5.85, 0, 1.95, 18.3, 19.2, M.steel, { collide: true });
  B.box(FG, 5.14, 5.15, 0.1, 1.85, 18.74, 18.76, M.black);
  B.box(FG, 5.2, 5.85, 0, 2.3, 19.2, 19.85, M.graphite, { collide: true });
  B.box(FG, 5.18, 5.2, 0.85, 1.45, 19.28, 19.78, M.glassDark);
  B.box(FG, 5.18, 5.2, 1.55, 1.9, 19.28, 19.78, M.glassDark);
  B.box(FG, 5.25, 5.85, 0, 2.3, 19.85, 20.6, M.oak, { collide: true });
  B.fp(0, 'fridge', 5.15, 5.85, 18.3, 19.2);
  B.fp(0, 'cabinet', 5.2, 5.85, 19.2, 20.6);
  spots(FG, [[1.0, 18.5], [4.2, 18.5], [4.2, 21.6], [1.0, 21.6]], Y.gc);
  B.point(LI, 2.6, 2.5, 19.9, 0xffe2b8, 6, 8, true);
}

function gourmet() {
  // Churrasqueira em pedra com coifa
  B.box(FG, 0.15, 0.95, 0, 0.9, 22.5, 23.9, M.stone, { collide: true });
  B.box(FG, 0.15, 0.95, 0.9, 1.55, 22.5, 22.62, M.stone);
  B.box(FG, 0.15, 0.95, 0.9, 1.55, 23.78, 23.9, M.stone);
  B.box(FG, 0.15, 0.3, 0.9, 1.55, 22.62, 23.78, M.black);
  B.box(FG, 0.3, 0.85, 0.9, 0.95, 22.62, 23.78, M.fire);
  B.box(FG, 0.3, 0.92, 1.16, 1.18, 22.62, 23.78, M.steel);
  B.box(FG, 0.15, 0.95, 1.55, 1.95, 22.5, 23.9, M.stone);
  B.box(FG, 0.15, 0.72, 1.95, Y.gc, 22.7, 23.7, M.stone);
  B.box('slab1', 0.2, 0.68, Y.up, 4.1, 22.8, 23.6, M.wallExt);
  B.box('slab1', 0.15, 0.73, 4.1, 4.16, 22.75, 23.65, M.black);
  B.fp(0, 'bbq', 0.15, 0.95, 22.5, 23.9);
  // Bancada com cuba e cooktop
  B.box(FG, 0.15, 0.78, 0, 0.86, 23.9, 25.8, M.graphite, { collide: true });
  B.box(FG, 0.15, 0.8, 0.86, 0.9, 23.9, 25.8, M.black);
  B.box(FG, 0.3, 0.65, 0.895, 0.905, 24.9, 25.5, M.steel, { cast: false });
  B.cyl(FG, 0.24, 25.2, 0.9, 1.22, 0.015, M.steel);
  B.box(FG, 0.25, 0.7, 0.9, 0.912, 24.05, 24.65, M.glassDark, { cast: false });
  B.fp(0, 'counter', 0.15, 0.8, 23.9, 25.8);
  // Mesa e bancos
  const t = grp(FG, 2.15, 24.0);
  lb(t, 0, 0.74, 0, 0.9, 0.05, 2.4, M.oak);
  lb(t, 0, 0.36, -0.9, 0.7, 0.72, 0.06, M.black);
  lb(t, 0, 0.36, 0.9, 0.7, 0.72, 0.06, M.black);
  lb(t, -0.68, 0.42, 0, 0.36, 0.05, 2.0, M.oak);
  lb(t, 0.68, 0.42, 0, 0.36, 0.05, 2.0, M.oak);
  lb(t, -0.68, 0.2, 0, 0.3, 0.4, 0.06, M.black);
  lb(t, 0.68, 0.2, 0, 0.3, 0.4, 0.06, M.black);
  B.fp(0, 'table', 1.7, 2.6, 22.8, 25.2);
  B.fp(0, 'bench', 1.29, 1.65, 23.0, 25.0);
  B.fp(0, 'bench', 2.65, 3.01, 23.0, 25.0);
  pendant(FG, 2.15, 23.4, 2.76, 1.85, 0.16);
  pendant(FG, 2.15, 24.6, 2.76, 1.85, 0.16);
  B.box(FG, 3.93, 3.98, 1.2, 1.95, 22.8, 24.1, M.screen);
  plant(FG, 5.45, 25.55, 1.2);
  B.point(LI, 2.2, 2.55, 24.0, 0xffcf8f, 7, 9, true);
  B.point(LI, 0.7, 1.2, 23.2, 0xff8a3a, 1.5, 3);
  // Lavanderia
  B.box(FG, 5.2, 5.85, 0, 0.85, 22.3, 22.95, M.white, { collide: true });
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), M.glassDark);
  door.rotation.y = -Math.PI / 2;
  door.position.set(5.195, 0.45, -22.625);
  B.add(FG, door, { cast: false });
  B.box(FG, 5.3, 5.85, 0.0, 0.9, 23.05, 23.65, M.ceramic, { collide: true });
  B.box(FG, 5.55, 5.85, 1.6, 1.63, 22.3, 24.4, M.oak);
  B.box(FG, 5.55, 5.85, 1.95, 1.98, 22.3, 24.4, M.oak);
  B.fp(0, 'cabinet', 5.2, 5.85, 22.3, 22.95);
  B.fp(0, 'cabinet', 5.3, 5.85, 23.05, 23.65);
  B.point(LI, 4.9, 2.5, 23.4, 0xffffff, 2, 4);
}

function outdoor() {
  palm(FG, 5.45, 3.95, 2.4);
  palm(FG, 3.3, 4.3, 1.6);
  for (const [x, z] of [[3.6, 0.5], [4.2, 0.5], [0.4, 4.6], [5.5, 4.55]]) plant(FG, x, z, 0.6, 0, M.potLight);
  // Balizadores e arandelas da fachada
  for (const [x, z] of [[5.3, 4.5], [3.55, 4.65]]) B.cyl(FG, x, z, 0, 0.12, 0.05, M.lamp);
  B.point(LI, 5.3, 0.4, 4.4, 0xffd7a0, 3.5, 6);
  B.point(LI, 3.6, 1.65, -0.3, 0xffe4bd, 1.5, 3);
  B.point(LI, 2.2, 1.2, 2.6, 0xffd9a8, 6, 9, true); // luz de destaque na fachada
  lounger(FG, 4.25, 29.6, 0);
  lounger(FG, 5.2, 29.6, 0);
  const side = grp(FG, 4.72, 28.7);
  lc(side, 0, 0.22, 0, 0.18, 0.44, M.white);
  umbrella(FG, 4.9, 27.5);
  const shower = grp(FG, 3.95, 26.35);
  lc(shower, 0, 1.05, 0, 0.025, 2.1, M.steel, 8);
  lc(shower, 0, 2.1, 0.12, 0.08, 0.02, M.steel, 16);
  for (const x of [4.1, 4.55, 5.0, 5.45]) plant(FG, x, 31.62, 0.55, 0.3, M.pot);
  B.point(LI, 1.95, -0.6, 29.2, 0x60e0ff, 8, 7, true);
  B.point(LI, 4.8, 0.6, 31.2, 0xc8ffb0, 2.5, 4);
  B.point(LI, 1.95, 1.4, 31.4, 0xfff0d0, 1.5, 3);
}

function suite() {
  const y = Y.up;
  B.box(FU, 0.15, 0.19, y, y + 1.4, 5.9, 8.5, M.ripado, { cast: false });
  bed(FU, 1, 1.19, 7.2, Math.PI / 2, 1.6, 2.0, y, false);
  nightstand(FU, 1, 0.42, 5.98, Math.PI / 2, y);
  nightstand(FU, 1, 0.42, 8.43, Math.PI / 2, y);
  pendant(FU, 0.45, 5.98, Y.uc, y + 1.25, 0.08, M.lamp);
  pendant(FU, 0.45, 8.43, Y.uc, y + 1.25, 0.08, M.lamp);
  B.box(FU, 4.58, 4.63, y + 1.0, y + 1.75, 6.5, 7.9, M.screen);
  B.box(FU, 4.25, 4.63, y + 0.35, y + 0.75, 6.2, 8.2, M.oak, { collide: true });
  B.fp(1, 'cabinet', 4.25, 4.63, 6.2, 8.2);
  armchair(FU, 1, 3.75, 5.75, -Math.PI / 2, y);
  B.box(FU, 2.0, 3.6, y + 0.012, y + 0.024, 6.0, 8.4, M.rug, { cast: false });
  spots(FU, [[1.6, 6.0], [3.4, 6.0], [1.6, 8.5], [3.4, 8.5]], Y.uc);
  B.point(LI, 2.4, 5.55, 7.2, 0xffd7a0, 5, 7, true);
  // Closet em U
  wardrobe(FU, 1, 0.15, 0.75, 9.32, 11.3, y, 'x+', M.oak);
  wardrobe(FU, 1, 0.75, 2.3, 9.32, 9.9, y, 'z+', M.oak);
  wardrobe(FU, 1, 0.75, 2.3, 10.72, 11.3, y, 'z-', M.oak);
  B.box(FU, 3.31, 3.33, y + 0.1, y + 2.0, 9.6, 10.5, M.mirror, { cast: false });
  const puff = grp(FU, 1.5, 10.31, 0, y);
  lc(puff, 0, 0.21, 0, 0.26, 0.42, M.linen);
  B.point(LI, 1.8, 5.55, 10.3, 0xffe2b8, 2.5, 4);
  // Banho da suíte
  vanity(FU, 1, 0.41, 12.15, Math.PI / 2, 1.4, 2, y);
  toilet(FU, 1, 1.3, 13.58, 0, y);
  B.box(FU, 2.0, 2.02, y, y + 2.1, 12.6, 13.9, M.glass, { cast: false, collide: true });
  B.box(FU, 2.0, 2.7, y, y + 2.1, 12.6, 12.62, M.glass, { cast: false, collide: true });
  B.cyl(FU, 2.66, 13.25, Y.uc - 0.4, Y.uc - 0.38, 0.14, M.steel);
  B.box(FU, 0.15, 3.33, y, y + 2.6, 13.88, 13.9, M.marble, { cast: false });
  B.box(FU, 3.31, 3.33, y, y + 2.6, 12.6, 13.88, M.marble, { cast: false });
  B.fp(1, 'shower', 2.0, 3.33, 12.6, 13.9);
  B.point(LI, 1.6, 5.55, 12.7, 0xfff0d8, 3, 5);
}

function upperRest() {
  const y = Y.up;
  // Banho social
  vanity(FU, 1, 0.75, 14.28, Math.PI, 0.9, 1, y);
  toilet(FU, 1, 0.47, 15.05, Math.PI / 2, y);
  B.box(FU, 0.15, 1.2, y, y + 2.1, 15.45, 15.47, M.glass, { cast: false, collide: true });
  B.cyl(FU, 1.0, 15.9, Y.uc - 0.4, Y.uc - 0.38, 0.13, M.steel);
  B.box(FU, 0.15, 1.9, y, y + 2.6, 16.28, 16.3, M.marble, { cast: false });
  B.fp(1, 'shower', 0.15, 1.9, 15.45, 16.3);
  B.point(LI, 1.0, 5.55, 15.0, 0xfff0d8, 2.5, 4);
  // Hall íntimo + estudo
  desk(FU, 1, 5.55, 12.9, -Math.PI / 2, 1.6, 0.6, y);
  chair(FU, 5.0, 12.9, Math.PI / 2, y, M.fabricDark);
  B.box(FU, 5.6, 5.85, y + 1.5, y + 1.53, 12.1, 13.7, M.oak);
  B.box(FU, 5.62, 5.84, y + 1.53, y + 1.78, 12.2, 12.9, M.books);
  B.box(FU, 5.6, 5.85, y + 1.95, y + 1.98, 12.1, 13.7, M.oak);
  wardrobe(FU, 1, 3.45, 3.9, 11.6, 13.8, y, 'x+', M.white);
  plant(FU, 5.5, 15.9, 0.9, y);
  B.point(LI, 4.6, 5.55, 12.8, 0xffe2b8, 4, 7);
  B.point(LI, 3.6, 5.55, 15.2, 0xffe2b8, 3, 5);
  // Quarto 2
  bed(FU, 1, 1.125, 18.4, Math.PI / 2, 0.9, 1.95, y);
  desk(FU, 1, 2.42, 19.32, 0, 1.0, 0.55, y);
  chair(FU, 2.42, 18.9, Math.PI, y, M.fabric);
  wardrobe(FU, 1, 0.15, 2.0, 16.42, 17.0, y, 'z+', M.white);
  B.box(FU, 0.6, 2.4, y + 0.012, y + 0.024, 17.3, 19.0, M.rug, { cast: false });
  B.point(LI, 1.6, 5.55, 18.0, 0xffe2b8, 4, 6);
  // Quarto 3
  bed(FU, 1, 4.9, 18.3, -Math.PI / 2, 1.38, 1.9, y);
  nightstand(FU, 1, 5.62, 17.3, -Math.PI / 2, y);
  nightstand(FU, 1, 5.62, 19.25, -Math.PI / 2, y);
  wardrobe(FU, 1, 3.12, 4.2, 16.42, 17.0, y, 'z+', M.white);
  desk(FU, 1, 3.65, 19.32, 0, 0.9, 0.55, y);
  chair(FU, 3.6, 18.85, Math.PI, y, M.fabric);
  B.point(LI, 4.4, 5.55, 18.0, 0xffe2b8, 4, 6);
}

/** Mobília e iluminação de todos os ambientes. */
export function furnish(builder, materials) {
  B = builder;
  M = materials;
  garage();
  hallAndLavabo();
  living();
  dining();
  kitchen();
  gourmet();
  outdoor();
  suite();
  upperRest();
}
