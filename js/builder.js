// Ferramentas de modelagem: caixas, paredes com vãos, lajes com furos, prismas inclinados.
// Coordenadas de entrada sempre em "planta" (x, z com z = profundidade); no mundo 3D z = -z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V2 = (a, b) => new THREE.Vector2(a, b);

/** Reescreve as UVs de uma geometria em metros do mundo (texturas alinhadas entre peças). */
export function setWorldUV(geom, ox, oy, oz) {
  const p = geom.attributes.position;
  const n = geom.attributes.normal;
  const uv = geom.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox;
    const y = p.getY(i) + oy;
    const z = p.getZ(i) + oz;
    const nx = Math.abs(n.getX(i));
    const ny = Math.abs(n.getY(i));
    const nz = Math.abs(n.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, x, z);
    else if (nx >= nz) uv.setXY(i, z, y);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}

function emptyPlan() {
  return { walls: [], windows: [], doors: [], items: [] };
}

export class Builder {
  constructor(scene) {
    this.scene = scene;
    this.layers = {};
    this.colliders = [];
    this.plan = { 0: emptyPlan(), 1: emptyPlan() };
    this.lights = [];
  }

  layer(name) {
    if (!this.layers[name]) {
      const g = new THREE.Group();
      g.name = name;
      this.scene.add(g);
      this.layers[name] = g;
    }
    return this.layers[name];
  }

  add(L, mesh, o = {}) {
    mesh.castShadow = o.cast ?? true;
    mesh.receiveShadow = o.receive ?? true;
    if (o.noMerge) mesh.userData.noMerge = true;
    (o.parent || this.layer(L)).add(mesh);
    return mesh;
  }

  collide(x1, x2, y1, y2, z1, z2, layer) {
    this.colliders.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1, y2, z1: Math.min(z1, z2), z2: Math.max(z1, z2), layer });
  }

  /** Caixa alinhada aos eixos, em coordenadas de planta. */
  box(L, x1, x2, y1, y2, z1, z2, mat, o = {}) {
    const sx = Math.abs(x2 - x1);
    const sy = Math.abs(y2 - y1);
    const sz = Math.abs(z2 - z1);
    if (sx < 1e-4 || sy < 1e-4 || sz < 1e-4) return null;
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const cz = -(z1 + z2) / 2;
    if (o.worldUV !== false) setWorldUV(g, cx, cy, cz);
    const m = new THREE.Mesh(g, mat);
    m.position.set(cx, cy, cz);
    if (o.collide) this.collide(x1, x2, y1, y2, z1, z2, L);
    return this.add(L, m, o);
  }

  cyl(L, x, z, y1, y2, r, mat, o = {}) {
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, y2 - y1, o.seg ?? 20);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, (y1 + y2) / 2, -z);
    return this.add(L, m, o);
  }

  /** Disco horizontal (spots de teto, ralos, luminárias). */
  disc(L, x, z, y, r, mat, facingUp = false, o = {}) {
    const g = new THREE.CircleGeometry(r, 20);
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = facingUp ? -Math.PI / 2 : Math.PI / 2;
    m.position.set(x, y, -z);
    return this.add(L, m, { cast: false, ...o });
  }

  /** Laje: polígono em planta [[x, z]...] com furos retangulares, extrudada em y. */
  slab(L, poly, holes, y1, y2, mat, o = {}) {
    const shape = new THREE.Shape(poly.map(([x, z]) => V2(x, z)));
    for (const [x1, x2, z1, z2] of holes) {
      shape.holes.push(new THREE.Path([V2(x1, z1), V2(x2, z1), V2(x2, z2), V2(x1, z2)]));
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: y2 - y1, bevelEnabled: false });
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y1;
    return this.add(L, m, o);
  }

  /** Prisma com perfil no plano (z, y), extrudado ao longo de x (escadas, guarda-corpos inclinados). */
  prismZY(L, pts, x1, x2, mat, o = {}) {
    const shape = new THREE.Shape(pts.map(([z, y]) => V2(z, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: x2 - x1, bevelEnabled: false });
    const m = new THREE.Mesh(g, mat);
    m.rotation.y = Math.PI / 2;
    m.position.x = x1;
    return this.add(L, m, o);
  }

  /**
   * Parede reta com vãos. axis 'x': corre em x de a1 a a2, espessura em z de c1 a c2.
   * axis 'z': corre em z, espessura em x. mats = material único ou {base, s1, s2}
   * (s1 = face do lado de menor coordenada, s2 = face do lado de maior coordenada).
   * Cada vão: {a1, a2, y1, y2, glass?, swing?: {hinge: 'a1'|'a2', side: 1|-1}}.
   */
  wall(L, axis, a1, a2, c1, c2, y1, y2, mats, openings = [], o = {}) {
    const single = mats.isMaterial ? mats : null;
    const base = single || mats.base || mats.s1;
    const s1 = single || mats.s1 || base;
    const s2 = single || mats.s2 || base;
    const arr = single || (axis === 'x' ? [base, base, base, base, s1, s2] : [s2, s1, base, base, base, base]);
    const collide = o.collide !== false;
    const mk = (b1, b2, yy1, yy2) => {
      if (b2 - b1 < 1e-3 || yy2 - yy1 < 1e-3) return;
      if (axis === 'x') this.box(L, b1, b2, yy1, yy2, c1, c2, arr, { collide });
      else this.box(L, c1, c2, yy1, yy2, b1, b2, arr, { collide });
    };
    const rect = (b1, b2) => (axis === 'x' ? { x1: b1, x2: b2, z1: c1, z2: c2 } : { x1: c1, x2: c2, z1: b1, z2: b2 });
    const reg = (kind, b1, b2, extra = {}) => {
      if (o.level === undefined || b2 - b1 < 1e-3) return;
      this.plan[o.level][kind].push({ ...rect(b1, b2), axis, c1, c2, a1: b1, a2: b2, ...extra });
    };
    const ops = [...openings].sort((p, q) => p.a1 - q.a1);
    let cur = a1;
    for (const op of ops) {
      mk(cur, op.a1, y1, y2);
      reg('walls', cur, op.a1);
      if (op.y1 > y1) mk(op.a1, op.a2, y1, op.y1);
      if (op.y2 < y2) mk(op.a1, op.a2, op.y2, y2);
      const isWindow = op.kind ? op.kind === 'window' : op.y1 > y1 + 0.05;
      if (isWindow) reg('windows', op.a1, op.a2);
      else reg('doors', op.a1, op.a2, { swing: op.swing, slider: op.slider });
      if (op.glass) {
        const r = rect(op.a1, op.a2);
        this.collide(r.x1, r.x2, op.y1, op.y2, r.z1, r.z2, L);
      }
      cur = op.a2;
    }
    mk(cur, a2, y1, y2);
    reg('walls', cur, a2);
  }

  /** Esquadria (caixilho preto + vidro) no plano médio cm de uma parede. */
  windowUnit(L, axis, a1, a2, y1, y2, cm, o = {}) {
    const { cols = 1, rows = 1, bar = 0.05, depth = 0.07, frame, glass } = o;
    const B = (b1, b2, yy1, yy2, mat, d = depth, cast = true) => (axis === 'x'
      ? this.box(L, b1, b2, yy1, yy2, cm - d / 2, cm + d / 2, mat, { cast })
      : this.box(L, cm - d / 2, cm + d / 2, yy1, yy2, b1, b2, mat, { cast }));
    B(a1, a2, y1, y2, glass, 0.012, false);
    B(a1, a1 + bar, y1, y2, frame);
    B(a2 - bar, a2, y1, y2, frame);
    B(a1, a2, y1, y1 + bar, frame);
    B(a1, a2, y2 - bar, y2, frame);
    for (let i = 1; i < cols; i++) {
      const a = a1 + ((a2 - a1) * i) / cols;
      B(a - bar / 2, a + bar / 2, y1, y2, frame);
    }
    for (let j = 1; j < rows; j++) {
      const yy = y1 + ((y2 - y1) * j) / rows;
      B(a1, a2, yy - bar / 2, yy + bar / 2, frame);
    }
  }

  /**
   * Folha de porta aberta. Dobradiça em (hx, hz); direção da folha aberta (dx, dz) em planta.
   */
  doorLeaf(L, hx, hz, width, height, dx, dz, mat, o = {}) {
    const g = new THREE.Group();
    g.position.set(hx, o.y ?? 0, -hz);
    g.rotation.y = Math.atan2(dz, dx);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, height, o.thick ?? 0.04), mat);
    leaf.position.set(width / 2, height / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    g.add(leaf);
    if (o.handle) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, o.handleLen ?? 0.25, 0.08), o.handle);
      h.position.set(width - 0.08, 1.05, 0);
      g.add(h);
    }
    this.layer(L).add(g);
    return g;
  }

  /** Registra um elemento para a planta 2D. */
  fp(level, kind, x1, x2, z1, z2, extra = {}) {
    this.plan[level].items.push({ kind, x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), ...extra });
  }

  /** Luz pontual (acende à noite). */
  point(L, x, y, z, color, intensity, distance) {
    const l = new THREE.PointLight(color, 0, distance, 2);
    l.position.set(x, y, -z);
    l.userData.nightIntensity = intensity;
    this.layer(L).add(l);
    this.lights.push(l);
    return l;
  }

  /** Junta as malhas estáticas de uma camada por material (menos chamadas de desenho). */
  mergeLayer(name) {
    const layer = this.layers[name];
    if (!layer) return;
    layer.updateMatrixWorld(true);
    const buckets = new Map();
    const remove = [];
    layer.traverse((obj) => {
      if (!obj.isMesh || obj.userData.noMerge) return;
      const g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      g.applyMatrix4(obj.matrixWorld);
      const mats = Array.isArray(obj.material) ? obj.material : null;
      const parts = mats ? splitGroups(g).map(([gi, part]) => [mats[gi], part]) : [[obj.material, g]];
      for (const [mat, part] of parts) {
        for (const key of Object.keys(part.attributes)) {
          if (!['position', 'normal', 'uv'].includes(key)) part.deleteAttribute(key);
        }
        part.clearGroups();
        if (!buckets.has(mat)) buckets.set(mat, []);
        buckets.get(mat).push(part);
      }
      remove.push(obj);
    });
    remove.forEach((obj) => obj.parent.remove(obj));
    for (const [mat, list] of buckets) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = !mat.transparent;
      m.receiveShadow = !mat.transparent;
      layer.add(m);
    }
  }
}

function splitGroups(g) {
  if (!g.groups.length) return [[0, g]];
  return g.groups.map((grp) => {
    const part = new THREE.BufferGeometry();
    for (const [key, attr] of Object.entries(g.attributes)) {
      const size = attr.itemSize;
      const arr = attr.array.slice(grp.start * size, (grp.start + grp.count) * size);
      part.setAttribute(key, new THREE.BufferAttribute(arr, size));
    }
    return [grp.materialIndex, part];
  });
}
