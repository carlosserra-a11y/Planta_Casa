// Estrutura do sobrado: paredes, lajes, escada, fachada, lote, piscina e vizinhos.
import * as THREE from 'three';
import { Y, STAIR } from './plan-data.js';

const DOOR_H = 2.1;

/** Folha de porta aberta ~83° a partir de um vão com swing {hinge, side}. */
function leaf(B, M, L, axis, op, c1, c2, mat = M.white, angle = 1.45) {
  const { hinge, side } = op.swing;
  const w = op.a2 - op.a1;
  const ha = hinge === 'a1' ? op.a1 : op.a2;
  const closed = axis === 'x' ? [hinge === 'a1' ? 1 : -1, 0] : [0, hinge === 'a1' ? 1 : -1];
  const perp = axis === 'x' ? [0, side] : [side, 0];
  const dx = Math.cos(angle) * closed[0] + Math.sin(angle) * perp[0];
  const dz = Math.cos(angle) * closed[1] + Math.sin(angle) * perp[1];
  const face = side > 0 ? c2 : c1;
  const [hx, hz] = axis === 'x' ? [ha, face] : [face, ha];
  B.doorLeaf(L, hx, hz, w - 0.03, op.y2 - op.y1 - 0.02, dx, dz, mat, { y: op.y1, handle: M.steel });
}

const underside = (z) => STAIR.slope * (z - (STAIR.z0 + 0.19));

function groundShell(B, M) {
  const G = 'ground';
  const sideL = { base: M.wallExt, s1: M.wallExt, s2: M.wallInt };
  const sideR = { base: M.wallExt, s1: M.wallInt, s2: M.wallExt };
  // Paredes de divisa (térreo + área gourmet). Na garagem a face interna é cinza.
  B.wall(G, 'z', 5.0, 11.0, 0, 0.15, 0, Y.up, { ...sideL, s2: M.wallGarage }, [], { level: 0 });
  B.wall(G, 'z', 11.0, 26.0, 0, 0.15, 0, Y.up, sideL, [], { level: 0 });
  B.wall(G, 'z', 5.0, 26.0, 5.85, 6.0, 0, Y.up, sideR, [], { level: 0 });

  // Fachada do térreo: trecho revestido de madeira com a porta pivotante + janela alta.
  const front = { a1: 3.6, a2: 4.6, y1: 0, y2: 2.5, swing: { hinge: 'a1', side: 1 } };
  B.wall(G, 'x', 3.3, 4.75, 5.0, 5.15, 0, Y.up, { base: M.wallExt, s1: M.woodClad, s2: M.wallInt }, [front], { level: 0 });
  B.wall(G, 'x', 4.75, 5.85, 5.0, 5.15, 0, Y.up, { base: M.wallExt, s1: M.wallExt, s2: M.wallInt },
    [{ a1: 4.75, a2: 5.75, y1: 0.1, y2: Y.up, glass: true }], { level: 0 });
  B.doorLeaf(G, 3.62, 5.15, 0.96, 2.48, Math.cos(1.25), Math.sin(1.25), M.woodClad, { thick: 0.05, handle: M.steel, handleLen: 1.3 });
  B.box(G, 0.15, 3.3, 2.75, 3.05, 4.98, 5.15, M.black); // viga/faixa preta da garagem

  // Garagem x hall
  const garageDoor = { a1: 9.75, a2: 10.55, y1: 0, y2: DOOR_H, swing: { hinge: 'a2', side: -1 } };
  B.wall(G, 'z', 5.15, 11.0, 3.3, 3.45, 0, Y.gc, { base: M.wallInt, s1: M.wallGarage, s2: M.wallInt }, [garageDoor], { level: 0 });
  leaf(B, M, G, 'z', garageDoor, 3.3, 3.45);
  B.wall(G, 'x', 0.15, 3.45, 11.0, 11.12, 0, Y.gc, { base: M.wallInt, s1: M.woodClad, s2: M.wallInt }, [], { level: 0 });

  // Lavabo sob a escada
  B.wall(G, 'x', 4.87, 5.85, 9.18, 9.3, 0, underside(9.3), M.wallInt, [], { level: 0 });
  const t = (z) => underside(z) + 0.06;
  B.prismZY(G, [[9.18, 0], [9.95, 0], [9.95, DOOR_H], [10.6, DOOR_H], [10.6, 0], [10.68, 0], [10.68, t(10.68)], [9.18, t(9.18)]], 4.75, 4.87, M.wallInt);
  B.collide(4.75, 4.87, 0, 1.7, 9.18, 9.95, G);
  B.collide(4.75, 4.87, 0, 2.6, 10.6, 10.68, G);
  B.plan[0].walls.push({ x1: 4.75, x2: 4.87, z1: 9.18, z2: 9.95 }, { x1: 4.75, x2: 4.87, z1: 10.6, z2: 10.68 });
  B.plan[0].doors.push({ x1: 4.75, x2: 4.87, z1: 9.95, z2: 10.6, axis: 'z', c1: 4.75, c2: 4.87, a1: 9.95, a2: 10.6, swing: { hinge: 'a1', side: 1 } });
  leaf(B, M, G, 'z', { a1: 9.97, a2: 10.6, y1: 0, y2: DOOR_H, swing: { hinge: 'a1', side: 1 } }, 4.75, 4.87);
  B.wall(G, 'x', 4.75, 5.85, 10.68, 10.8, 0, Y.gc, M.wallInt, [], { level: 0 });

  // Fundo da casa: porta de correr de vidro para a área gourmet
  B.wall(G, 'x', 0.15, 5.85, 22.0, 22.15, 0, Y.gc, { base: M.wallExt, s1: M.wallInt, s2: M.wallExt },
    [{ a1: 0.9, a2: 3.9, y1: 0, y2: 2.6, slider: true }], { level: 0 });
  const glass = { frame: M.frame, glass: M.glass };
  B.windowUnit(G, 'x', 0.9, 2.45, 0, 2.6, 22.04, glass);
  B.windowUnit(G, 'x', 0.95, 2.5, 0, 2.6, 22.11, glass);
  B.collide(0.9, 2.5, 0, 2.6, 22.0, 22.15, G);

  // Lavanderia (dentro da área coberta)
  B.wall(G, 'z', 22.15, 24.6, 3.98, 4.1, 0, Y.gc, M.wallExt, [], { level: 0 });
  const laundryDoor = { a1: 4.45, a2: 5.25, y1: 0, y2: DOOR_H, swing: { hinge: 'a2', side: -1 } };
  B.wall(G, 'x', 3.98, 5.85, 24.6, 24.72, 0, Y.gc, { base: M.wallExt, s1: M.wallInt, s2: M.wallExt }, [laundryDoor], { level: 0 });
  leaf(B, M, G, 'x', laundryDoor, 24.6, 24.72);

  // Pisos do térreo
  B.box(G, 0.15, 3.3, 0, 0.012, 5.0, 11.0, M.garageFloor, { cast: false });
  B.box(G, 3.45, 5.85, 0, 0.012, 5.15, 11.0, M.tileFloor, { cast: false });
  B.box(G, 0.15, 5.85, 0, 0.012, 11.0, 22.0, M.tileFloor, { cast: false });
  B.box(G, 0.15, 5.85, 0, 0.012, 22.0, 26.0, M.tileOut, { cast: false });
}

function upperShell(B, M) {
  const U = 'upper';
  const y1 = Y.up;
  const yc = Y.uc;
  const wi = M.wallInt;
  B.wall(U, 'z', 5.0, 19.75, 0, 0.15, y1, Y.par, { base: M.wallExt, s1: M.wallExt, s2: wi }, [], { level: 1 });
  B.wall(U, 'z', 5.0, 19.75, 5.85, 6.0, y1, Y.par, { base: M.wallExt, s1: wi, s2: M.wallExt }, [], { level: 1 });
  B.wall(U, 'x', 0.15, 5.85, 5.0, 5.15, y1, Y.par, { base: M.wallExt, s1: M.wallExt, s2: wi },
    [{ a1: 0.6, a2: 2.8, y1: 3.9, y2: 5.3, glass: true }, { a1: 4.75, a2: 5.75, y1, y2: 5.6, glass: true, kind: 'window' }], { level: 1 });
  B.wall(U, 'x', 0.15, 5.85, 19.6, 19.75, y1, Y.par, { base: M.wallExt, s1: wi, s2: M.wallExt },
    [{ a1: 0.7, a2: 2.4, y1: 4.0, y2: 5.3, glass: true }, { a1: 3.7, a2: 5.3, y1: 4.0, y2: 5.3, glass: true }], { level: 1 });
  const glass = { frame: M.frame, glass: M.glass, cols: 2 };
  B.windowUnit(U, 'x', 0.7, 2.4, 4.0, 5.3, 19.675, glass);
  B.windowUnit(U, 'x', 3.7, 5.3, 4.0, 5.3, 19.675, glass);

  const D = (a1, a2, hinge, side) => ({ a1, a2, y1, y2: y1 + DOOR_H, swing: { hinge, side } });
  // Suíte
  B.wall(U, 'z', 5.15, 9.32, 4.63, 4.75, y1, yc, wi, [], { level: 1 });
  const suiteDoor = D(3.65, 4.45, 'a2', -1);
  B.wall(U, 'x', 0.15, 4.63, 9.2, 9.32, y1, yc, wi, [{ a1: 2.4, a2: 3.2, y1, y2: y1 + DOOR_H }, suiteDoor], { level: 1 });
  leaf(B, M, U, 'x', suiteDoor, 9.2, 9.32);
  B.wall(U, 'z', 9.32, 14.02, 3.33, 3.45, y1, yc, wi, [], { level: 1 });
  const bathDoor = D(2.4, 3.1, 'a2', 1);
  B.wall(U, 'x', 0.15, 3.33, 11.3, 11.42, y1, yc, wi, [bathDoor], { level: 1 });
  leaf(B, M, U, 'x', bathDoor, 11.3, 11.42);
  B.wall(U, 'x', 0.15, 3.33, 13.9, 14.02, y1, yc, wi, [], { level: 1 });
  // Banho social
  const socialDoor = D(14.6, 15.3, 'a1', -1);
  B.wall(U, 'z', 14.02, 16.3, 1.9, 2.02, y1, yc, wi, [socialDoor], { level: 1 });
  leaf(B, M, U, 'z', socialDoor, 1.9, 2.02);
  // Quartos 2 e 3
  const q2 = D(2.1, 2.9, 'a1', 1);
  const q3 = D(4.3, 5.1, 'a2', 1);
  B.wall(U, 'x', 0.15, 5.85, 16.3, 16.42, y1, yc, wi, [q2, q3], { level: 1 });
  leaf(B, M, U, 'x', q2, 16.3, 16.42);
  leaf(B, M, U, 'x', q3, 16.3, 16.42);
  B.wall(U, 'z', 16.42, 19.6, 3.0, 3.12, y1, yc, wi, [], { level: 1 });
  // Guarda-corpo de vidro do mezanino
  B.box(U, 4.745, 4.765, y1, y1 + 1.05, 9.32, 10.68, M.glass, { collide: true, cast: false });
  B.box(U, 4.735, 4.775, y1 + 1.05, y1 + 1.09, 9.32, 10.68, M.frame);

  // Pisos do superior
  const f = (x1, x2, z1, z2, mat) => B.box(U, x1, x2, y1, y1 + 0.012, z1, z2, mat, { cast: false });
  f(0.15, 4.63, 5.15, 9.2, M.woodFloor);
  f(0.15, 3.33, 9.2, 11.3, M.woodFloor);
  f(0.15, 3.33, 11.3, 13.9, M.marble);
  f(0.15, 1.9, 14.02, 16.3, M.marble);
  f(3.45, 4.75, 9.2, 10.68, M.tileFloor);
  f(3.45, 5.85, 10.68, 14.02, M.tileFloor);
  f(1.9, 5.85, 14.02, 16.3, M.tileFloor);
  f(0.15, 5.85, 16.3, 19.6, M.woodFloor);
}

function slabsAndRoof(B, M) {
  const S = 'slab1';
  B.slab(S, [[0.15, 5.15], [4.75, 5.15], [4.75, 10.68], [5.85, 10.68], [5.85, 19.6], [0.15, 19.6]], [], Y.gc, Y.up, M.ceiling);
  B.slab(S, [[0.15, 19.6], [5.85, 19.6], [5.85, 26.0], [0.15, 26.0]], [[1.0, 5.0, 20.1, 21.7]], Y.gc, Y.up, M.ceiling);
  B.box(S, 0.15, 5.85, 2.72, 3.32, 25.88, 26.06, M.black); // faixa preta da laje gourmet
  B.box(S, 0, 0.15, Y.up, 3.32, 19.75, 26.0, M.wallExt);
  B.box(S, 5.85, 6.0, Y.up, 3.32, 19.75, 26.0, M.wallExt);
  B.box(S, 0.15, 5.85, 2.76, 2.8, 22.15, 25.88, M.woodCeil, { cast: false }); // forro de madeira gourmet
  skylight(B, M, S, [1.0, 5.0, 20.1, 21.7], Y.up);

  const R = 'roof';
  const sky = [[0.6, 2.8, 11.9, 13.4], [0.5, 1.5, 14.6, 15.7], [3.95, 5.6, 11.6, 13.6]];
  B.slab(R, [[0.15, 5.15], [5.85, 5.15], [5.85, 19.6], [0.15, 19.6]], sky, Y.uc, Y.roof, M.ceiling);
  sky.forEach((h) => skylight(B, M, R, h, Y.roof));
  // Barrilete / caixa d'água escondida pela platibanda
  B.box(R, 3.4, 5.4, Y.roof, 7.0, 14.6, 16.1, M.wallExt);
  B.box(R, 3.35, 5.45, 7.0, 7.08, 14.55, 16.15, M.black);
  // Placas solares
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.62), M.solar);
      p.position.set(1.05 + i * 1.15, Y.roof + 0.32, -(16.55 + j * 1.75));
      p.rotation.x = 0.2;
      B.add(R, p);
    }
  }
}

function skylight(B, M, L, [x1, x2, z1, z2], y) {
  B.box(L, x1 - 0.06, x2 + 0.06, y, y + 0.14, z1 - 0.06, z1, M.black);
  B.box(L, x1 - 0.06, x2 + 0.06, y, y + 0.14, z2, z2 + 0.06, M.black);
  B.box(L, x1 - 0.06, x1, y, y + 0.14, z1, z2, M.black);
  B.box(L, x2, x2 + 0.06, y, y + 0.14, z1, z2, M.black);
  B.box(L, x1, x2, y + 0.12, y + 0.135, z1, z2, M.glass, { cast: false });
}

function stair(B, M) {
  const G = 'ground';
  const { x1, x2, z0, z1, rise, tread } = STAIR;
  const pts = [[z0, 0]];
  for (let k = 1; k <= 16; k++) {
    pts.push([z0 + (k - 1) * tread, k * rise]);
    pts.push([z0 + k * tread, k * rise]);
  }
  pts.push([z1, Y.up], [z1, underside(z1)], [z0 + 0.19, 0]);
  B.prismZY(G, pts, x1, x2, M.white);
  for (let k = 1; k <= 16; k++) {
    const zs = z0 + (k - 1) * tread;
    B.box(G, x1 + 0.01, x2 - 0.01, k * rise - 0.03, k * rise + 0.012, zs - 0.025, zs + tread, M.oak);
    B.collide(4.71, 4.78, k * rise, k * rise + 1.0, zs, zs + tread, G);
    const top = underside(zs);
    if (zs < 9.18 && top > 0.05) B.collide(x1, x2, 0, top, zs, zs + tread, G);
  }
  // Guarda-corpo de vidro inclinado + corrimão
  const nose = (z) => rise + (z - z0) * STAIR.slope;
  B.prismZY(G, [[z0, nose(z0)], [z1, Y.up], [z1, Y.up + 1.0], [z0, nose(z0) + 1.0]], 4.733, 4.753, M.glass, { cast: false });
  B.prismZY(G, [[z0, nose(z0) + 1.0], [z1, Y.up + 1.0], [z1, Y.up + 1.04], [z0, nose(z0) + 1.04]], 4.725, 4.761, M.frame);
  B.box(G, 4.87, 5.85, 0, 0.04, 6.25, 9.18, M.pebbles, { cast: false }); // jardim seco sob a escada
  B.fp(0, 'stair', x1, x2, z0, z1, { up: true });
  B.fp(1, 'stair', x1, x2, z0, z1, { up: false });
  B.fp(1, 'void', 4.75, 5.85, 5.15, z0);
}

function facade(B, M) {
  const G = 'ground';
  const U = 'upper';
  const glass = { frame: M.frame, glass: M.glass, cols: 2, rows: 3 };
  B.windowUnit(G, 'x', 4.75, 5.75, 0.1, Y.up, 5.075, glass);
  B.windowUnit(U, 'x', 4.75, 5.75, Y.up, 5.6, 5.075, glass);
  B.box(G, 3.3, 4.75, 2.75, 2.88, 4.3, 5.0, M.black); // marquise sobre a porta
  B.disc(G, 4.05, 4.65, 2.745, 0.06, M.lamp);
  // Moldura branca saliente + persiana de enrolar preta (como nas fotos)
  const zf = [4.72, 5.0];
  B.box(U, 0.42, 2.98, 5.3, 5.46, ...zf, M.white);
  B.box(U, 0.42, 2.98, 3.74, 3.9, ...zf, M.white);
  B.box(U, 0.42, 0.6, 3.9, 5.3, ...zf, M.white);
  B.box(U, 2.8, 2.98, 3.9, 5.3, ...zf, M.white);
  B.box(U, 0.6, 2.8, 4.62, 5.3, 4.95, 4.99, M.shutter);
  B.windowUnit(U, 'x', 0.6, 2.8, 3.9, 5.3, 5.075, { frame: M.frame, glass: M.glass, cols: 2 });
  B.box(U, 3.1, 4.6, 3.2, 5.62, 4.97, 5.0, M.woodClad); // painel amadeirado
  B.box(U, 0, 6.0, 5.82, 6.62, 4.95, 5.0, M.black); // faixa preta da platibanda
  // Rufos (pingadeiras) pretos sobre as platibandas
  B.box(U, 0, 6.0, 6.6, 6.64, 4.95, 5.17, M.black);
  B.box(U, 0, 0.17, 6.6, 6.64, 5.17, 19.58, M.black);
  B.box(U, 5.83, 6.0, 6.6, 6.64, 5.17, 19.58, M.black);
  B.box(U, 0, 6.0, 6.6, 6.64, 19.58, 19.79, M.black);
  B.box(U, 0, 6.0, 5.82, 6.6, 19.75, 19.79, M.black);
}

function site(B, M) {
  const S = 'site';
  const flat = { cast: false };
  B.box(S, -40, 46, -0.4, -0.15, -40, -2.6, M.asphalt, flat);
  for (let x = -38; x < 46; x += 4) B.box(S, x, x + 2, -0.15, -0.145, -8.4, -8.28, M.white, flat);
  B.box(S, -40, 46, -0.4, 0.0, -2.6, -2.45, M.concreteLight);
  B.box(S, -40, 46, -0.1, 0.0, -2.45, 0.0, M.sidewalk, flat);
  B.box(S, -40, 46, 0.0, 0.006, -1.55, -1.15, M.tactile, flat);
  B.box(S, -40, 0, -0.12, -0.02, 0, 60, M.grass, flat);
  B.box(S, 6, 46, -0.12, -0.02, 0, 60, M.grass, flat);
  B.box(S, 0, 6, -0.12, -0.02, 32, 60, M.grass, flat);

  // Recuo frontal: grama, faixas de concreto e pisantes
  B.box(S, 0.15, 5.85, -0.06, 0.0, 0.18, 5.0, M.grass, flat);
  B.box(S, 0.5, 1.15, 0.0, 0.02, 0.18, 5.0, M.concreteLight, flat);
  B.box(S, 2.15, 2.8, 0.0, 0.02, 0.18, 5.0, M.concreteLight, flat);
  [0.6, 1.5, 2.4, 3.3, 4.2].forEach((z, i) => {
    const x = 5.15 - i * 0.24;
    B.box(S, x - 0.4, x + 0.4, 0.0, 0.025, z - 0.22, z + 0.22, M.concreteLight, flat);
    B.fp(0, 'stone', x - 0.4, x + 0.4, z - 0.22, z + 0.22);
  });
  B.fp(0, 'strip', 0.5, 1.15, 0.18, 5.0);
  B.fp(0, 'strip', 2.15, 2.8, 0.18, 5.0);

  // Muro frontal chapiscado, portão de vidro (carro) e portão social aberto
  B.wall(S, 'x', 0, 6.0, 0, 0.18, 0, 1.6, M.muro, [
    { a1: 0.15, a2: 3.0, y1: 0, y2: 1.6 },
    { a1: 4.75, a2: 5.65, y1: 0, y2: 1.6, swing: { hinge: 'a2', side: 1 } },
  ], { level: 0 });
  B.windowUnit(S, 'x', 0.18, 2.98, 0.06, 1.56, 0.09, { frame: M.frame, glass: M.glass, bar: 0.06 });
  B.collide(0.15, 3.0, 0, 1.6, 0, 0.18, S);
  B.fp(0, 'gate', 0.15, 3.0, 0.06, 0.12);
  B.windowUnit(S, 'z', 0.22, 1.08, 0.04, 1.56, 5.6, { frame: M.frame, glass: M.glass, bar: 0.05 });
  B.collide(5.56, 5.64, 0, 1.6, 0.22, 1.08, S);
  B.wall(S, 'z', 0.18, 5.0, 0, 0.15, 0, 1.6, M.muro, [], { level: 0 });
  B.wall(S, 'z', 0.18, 5.0, 5.85, 6.0, 0, 1.6, M.muro, [], { level: 0 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), M.numberPlate);
  plate.position.set(3.6, 1.2, 0.012);
  B.add(S, plate, { cast: false, noMerge: true });
  B.box(S, 4.12, 4.5, 1.1, 1.52, -0.14, 0.0, M.steel); // caixa de correio inox
  B.box(S, 4.18, 4.44, 1.42, 1.44, -0.145, -0.14, M.black);

  // Muros do fundo
  B.wall(S, 'z', 26.0, 31.85, 0, 0.15, 0, 2.4, M.wallExt, [], { level: 0 });
  B.wall(S, 'z', 26.0, 31.85, 5.85, 6.0, 0, 2.4, M.wallExt, [], { level: 0 });
  B.wall(S, 'x', 0, 6.0, 31.85, 32.0, 0, 2.4, M.wallExt, [], { level: 0 });
  B.box(S, 0.15, 3.75, 0.0, 2.4, 31.82, 31.85, M.stone, { cast: false });
  B.box(S, 3.85, 5.85, 0.3, 2.3, 31.8, 31.85, M.greenWall, { cast: false });
  B.box(S, 3.85, 5.85, 0.0, 0.32, 31.45, 31.8, M.concreteLight);
  B.box(S, 3.88, 5.82, 0.32, 0.34, 31.48, 31.77, M.soil, flat);
}

function pool(B, M) {
  const S = 'site';
  const flat = { cast: false };
  const dk = [0.0, 0.03];
  B.box(S, 0.15, 5.85, ...dk, 26.0, 26.65, M.deck, flat);
  B.box(S, 3.7, 5.85, ...dk, 26.65, 31.45, M.deck, flat);
  B.box(S, 0.15, 3.85, ...dk, 31.65, 31.82, M.deck, flat);
  B.box(S, 3.7, 3.85, ...dk, 31.45, 31.65, M.deck, flat);
  B.box(S, 0.15, 0.2, ...dk, 26.65, 31.65, M.deck, flat);
  const cp = [0.0, 0.05];
  B.box(S, 0.2, 3.7, ...cp, 26.65, 26.9, M.coping);
  B.box(S, 0.2, 3.7, ...cp, 31.4, 31.65, M.coping);
  B.box(S, 0.2, 0.45, ...cp, 26.9, 31.4, M.coping);
  B.box(S, 3.45, 3.7, ...cp, 26.9, 31.4, M.coping);
  const d = -1.4;
  B.box(S, 0.45, 3.45, d - 0.05, d, 26.9, 31.4, M.mosaic, flat);
  B.box(S, 0.4, 0.45, d - 0.05, 0, 26.85, 31.45, M.mosaic);
  B.box(S, 3.45, 3.5, d - 0.05, 0, 26.85, 31.45, M.mosaic);
  B.box(S, 0.45, 3.45, d - 0.05, 0, 26.85, 26.9, M.mosaic);
  B.box(S, 0.45, 3.45, d - 0.05, 0, 31.4, 31.45, M.mosaic);
  B.box(S, 0.45, 3.45, d, -0.35, 26.9, 27.7, M.mosaic); // prainha
  B.box(S, 0.45, 3.45, d, -0.85, 27.7, 28.0, M.mosaic); // degrau
  B.collide(0.45, 3.45, -2, 1.0, 26.9, 31.4, S);
  B.fp(0, 'pool', 0.45, 3.45, 26.9, 31.4);
  B.fp(0, 'beach', 0.45, 3.45, 26.9, 27.7);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.5), M.water);
  water.rotation.x = -Math.PI / 2;
  water.position.set(1.95, -0.08, -29.15);
  B.add(S, water, { cast: false, receive: false, noMerge: true });
  for (const x of [1.2, 2.7]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.09, 18), M.poolLamp);
    l.position.set(x, -0.65, -31.39);
    B.add(S, l, { cast: false });
  }
  // Cascata saindo do muro de pedra
  B.box(S, 1.55, 2.35, 1.0, 1.06, 31.55, 31.82, M.steel);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.1), M.cascade);
  sheet.position.set(1.95, 0.46, -31.435);
  sheet.rotation.x = -0.21;
  B.add(S, sheet, { cast: false, receive: false, noMerge: true });
}

function neighbors(B, M) {
  const N = 'neighbors';
  const box = (x1, x2, y2, z1, z2) => {
    B.box(N, x1, x2, 0, y2, z1, z2, M.wallExt);
    B.collide(x1, x2, 0, y2, z1, z2, N);
  };
  box(-5.9, -0.02, 6.4, 5.0, 19.5);
  box(-5.9, -0.02, 3.0, 19.5, 23.0);
  box(-6.0, -0.02, 1.6, 0.0, 0.18);
  box(6.02, 11.9, 3.7, 4.5, 21.0);
  box(6.02, 12.0, 1.6, 0.0, 0.18);
  B.box(N, -5.95, -0.02, 6.4, 6.9, 4.95, 19.55, M.black);
  B.box(N, 6.0, 11.95, 3.7, 4.1, 4.45, 21.05, M.black);
}

/** Monta toda a estrutura do sobrado no builder. */
export function buildHouse(B, M) {
  groundShell(B, M);
  upperShell(B, M);
  slabsAndRoof(B, M);
  stair(B, M);
  facade(B, M);
  site(B, M);
  pool(B, M);
  neighbors(B, M);
}
