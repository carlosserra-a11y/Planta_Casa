// Planta baixa 2D (SVG) gerada a partir dos mesmos dados do modelo 3D.
import { ROOMS, STAIR, fmt } from './plan-data.js';

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Desenha a planta de um pavimento.
 * @param {SVGSVGElement} svg
 * @param {{0: object, 1: object}} plan dados registrados pelo Builder
 * @param {0|1} level
 * @param {boolean} horizontal rua à esquerda (telas largas) ou embaixo (celular)
 */
export function drawPlan(svg, plan, level, horizontal) {
  svg.replaceChildren();
  // Mapeia planta (x, z) -> SVG (X, Y).
  const P = horizontal ? (x, z) => [z, x] : (x, z) => [x, 32 - z];
  const R = (x1, x2, z1, z2) => {
    const [a, b] = P(x1, z1);
    const [c, d] = P(x2, z2);
    return { x: Math.min(a, c), y: Math.min(b, d), width: Math.abs(c - a), height: Math.abs(d - b) };
  };
  const pts = (list) => list.map(([x, z]) => P(x, z).join(',')).join(' ');
  const vb = horizontal ? [-3.6, -1.6, 37.2, 9.6] : [-1.7, -1.4, 9.6, 37.4];
  svg.setAttribute('viewBox', vb.join(' '));

  const gSite = el('g', { class: 'p-site' });
  const gFill = el('g');
  const gItems = el('g', { class: 'p-items' });
  const gWalls = el('g', { class: 'p-walls' });
  const gText = el('g', { class: 'p-text' });
  svg.append(gSite, gFill, gItems, gWalls, gText);

  // Calçada, lote e áreas externas
  gSite.append(el('rect', { ...R(-0.5, 6.5, -2.45, 0), class: 'p-walk' }));
  const [sx, sy] = P(3, -1.3);
  gText.append(el('text', { x: sx, y: sy, class: 'p-small', 'text-anchor': 'middle' }, 'CALÇADA · RUA'));
  gSite.append(el('rect', { ...R(0, 6, 0, 32), class: 'p-lot' }));

  const rooms = ROOMS.filter((r) => r.level === level || (level === 1 && r.outdoor));
  for (const r of ROOMS.filter((rm) => rm.level === level)) {
    for (const rc of r.rects) {
      const wet = /banho|lavabo|lavanderia|cozinha|gourmet/i.test(r.name);
      const cls = r.id === 'piscina' ? 'p-water' : r.outdoor ? 'p-out' : wet ? 'p-wet' : 'p-room';
      if (r.id !== 'vazio') gFill.append(el('rect', { ...R(...rc), class: cls }));
    }
  }
  if (level === 1) {
    gFill.append(el('rect', { ...R(0.15, 5.85, 19.75, 26.0), class: 'p-roof' }));
    gFill.append(el('rect', { ...R(0.45, 3.45, 26.9, 31.4), class: 'p-water p-faint' }));
    const [lx, ly] = P(2.9, 22.9);
    gText.append(el('text', { x: lx, y: ly, class: 'p-small', 'text-anchor': 'middle' }, 'LAJE IMPERMEABILIZADA (COBERTURA GOURMET)'));
  }

  // Móveis e elementos
  for (const it of plan[level].items) drawItem(gItems, gText, it, R, P, pts, level);

  // Paredes, janelas e portas
  for (const w of plan[level].walls) gWalls.append(el('rect', { ...R(w.x1, w.x2, w.z1, w.z2), class: 'p-wall' }));
  for (const w of plan[level].windows) {
    gWalls.append(el('rect', { ...R(w.x1, w.x2, w.z1, w.z2), class: 'p-window' }));
    const mid = (w.c1 + w.c2) / 2;
    const line = w.axis === 'x' ? [[w.a1, mid], [w.a2, mid]] : [[mid, w.a1], [mid, w.a2]];
    gWalls.append(el('polyline', { points: pts(line), class: 'p-thin' }));
  }
  for (const d of plan[level].doors) drawDoor(gWalls, d, pts);

  // Nomes e áreas
  for (const r of rooms) {
    if (r.level !== level) continue;
    const [tx, ty] = P(r.at[0], r.at[1]);
    const t = el('text', { x: tx, y: ty, class: 'p-label', 'text-anchor': 'middle' });
    t.append(el('tspan', { x: tx, dy: 0 }, r.name));
    if (!r.noArea) t.append(el('tspan', { x: tx, dy: 0.34, class: 'p-area' }, `${fmt(r.area)} m²`));
    gText.append(t);
  }
  drawDims(gText, P, level);
  drawScale(gText, horizontal);
}

function drawItem(g, gText, it, R, P, pts, level) {
  const { x1, x2, z1, z2 } = it;
  switch (it.kind) {
    case 'stair': {
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: 'p-stair' }));
      for (let k = 1; k < 16; k++) {
        const z = STAIR.z0 + k * STAIR.tread;
        g.append(el('polyline', { points: pts([[x1, z], [x2, z]]), class: 'p-thin' }));
      }
      const xm = (x1 + x2) / 2;
      g.append(el('polyline', { points: pts([[xm, z1 + 0.2], [xm, z2 - 0.25]]), class: 'p-arrow' }));
      g.append(el('polyline', { points: pts([[xm - 0.18, z2 - 0.5], [xm, z2 - 0.25], [xm + 0.18, z2 - 0.5]]), class: 'p-arrow' }));
      const [tx, ty] = P(xm, level ? z2 + 0.35 : z1 - 0.3);
      gText.append(el('text', { x: tx, y: ty, class: 'p-small', 'text-anchor': 'middle' }, it.up ? 'SOBE' : 'DESCE'));
      return;
    }
    case 'void':
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: 'p-void' }));
      g.append(el('polyline', { points: pts([[x1, z1], [x2, z2]]), class: 'p-thin' }));
      g.append(el('polyline', { points: pts([[x2, z1], [x1, z2]]), class: 'p-thin' }));
      return;
    case 'pool':
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: 'p-pool' }));
      return;
    case 'beach':
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: 'p-beach' }));
      return;
    case 'wc': {
      const r = R(x1, x2, z1, z2);
      g.append(el('rect', { ...r, rx: Math.min(r.width, r.height) * 0.45, class: 'p-fix' }));
      return;
    }
    case 'round': {
      const [cx, cy] = P((x1 + x2) / 2, (z1 + z2) / 2);
      g.append(el('circle', { cx, cy, r: (x2 - x1) / 2, class: 'p-fur' }));
      return;
    }
    case 'shower': {
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: 'p-fix' }));
      g.append(el('polyline', { points: pts([[x1, z1], [x2, z2]]), class: 'p-thin' }));
      return;
    }
    case 'gate':
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: 'p-gate' }));
      return;
    default: {
      const cls = ['vanity', 'counter', 'bbq', 'fridge'].includes(it.kind) ? 'p-fix' : 'p-fur';
      g.append(el('rect', { ...R(x1, x2, z1, z2), class: cls }));
      if (it.kind === 'bbq') {
        const [tx, ty] = P((x1 + x2) / 2, (z1 + z2) / 2);
        gText.append(el('text', { x: tx, y: ty + 0.06, class: 'p-tiny', 'text-anchor': 'middle' }, 'CHURR.'));
      }
    }
  }
}

function drawDoor(g, d, pts) {
  if (d.slider) {
    const m = (d.c1 + d.c2) / 2;
    const mid = (d.a1 + d.a2) / 2;
    const l1 = d.axis === 'x' ? [[d.a1, m - 0.03], [mid + 0.1, m - 0.03]] : [[m - 0.03, d.a1], [m - 0.03, mid + 0.1]];
    const l2 = d.axis === 'x' ? [[mid - 0.1, m + 0.03], [d.a2, m + 0.03]] : [[m + 0.03, mid - 0.1], [m + 0.03, d.a2]];
    g.append(el('polyline', { points: pts(l1), class: 'p-door' }));
    g.append(el('polyline', { points: pts(l2), class: 'p-door' }));
    return;
  }
  if (!d.swing) return;
  const { hinge, side } = d.swing;
  const w = d.a2 - d.a1;
  const ha = hinge === 'a1' ? d.a1 : d.a2;
  const other = hinge === 'a1' ? d.a2 : d.a1;
  const face = side > 0 ? d.c2 : d.c1;
  const toXZ = (a, off) => (d.axis === 'x' ? [a, face + off] : [face + off, a]);
  const leafEnd = toXZ(ha, side * w);
  g.append(el('polyline', { points: pts([toXZ(ha, 0), leafEnd]), class: 'p-door' }));
  const arc = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * (Math.PI / 2);
    const along = ha + Math.sign(other - ha) * w * Math.sin(t);
    arc.push(toXZ(along, side * w * Math.cos(t)));
  }
  g.append(el('polyline', { points: pts(arc), class: 'p-swing' }));
}

function dimLine(g, P, a, b, off, label, alongX) {
  // alongX: cota medindo em x (largura); senão mede em z (profundidade)
  const p1 = alongX ? P(a, off) : P(off, a);
  const p2 = alongX ? P(b, off) : P(off, b);
  g.append(el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'p-dim' }));
  for (const p of [p1, p2]) g.append(el('circle', { cx: p[0], cy: p[1], r: 0.05, class: 'p-dimdot' }));
  const mid = alongX ? P((a + b) / 2, off) : P(off, (a + b) / 2);
  const t = el('text', { x: mid[0], y: mid[1] - 0.1, class: 'p-dimtext', 'text-anchor': 'middle' }, label);
  g.append(t);
}

function drawDims(g, P, level) {
  dimLine(g, P, 0, 6, -3.0, '6,00', true);
  const chain = level === 0
    ? [[0, 5, '5,00'], [5, 22.15, '17,15'], [22.15, 26, '3,85'], [26, 32, '6,00']]
    : [[0, 5, '5,00'], [5, 19.75, '14,75'], [19.75, 32, '12,25']];
  for (const [a, b, l] of chain) dimLine(g, P, a, b, 6.75, l, false);
  dimLine(g, P, 0, 32, 7.45, '32,00', false);
}

function drawScale(g, horizontal) {
  const [x0, y0] = horizontal ? [26.0, -1.2] : [0.4, -1.1];
  const seg = [[0, 1], [1, 2], [2, 5]];
  seg.forEach(([a, b], i) => g.append(el('rect', { x: x0 + a, y: y0, width: b - a, height: 0.12, class: i % 2 ? 'p-scale2' : 'p-scale1' })));
  [0, 1, 2, 5].forEach((v) => g.append(el('text', { x: x0 + v, y: y0 + 0.45, class: 'p-tiny', 'text-anchor': 'middle' }, `${v}`)));
  g.append(el('text', { x: x0 + 5.3, y: y0 + 0.13, class: 'p-tiny' }, 'm'));
}
