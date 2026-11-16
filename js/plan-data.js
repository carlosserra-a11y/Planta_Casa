// Dados do projeto (metros). Eixo x = largura do lote (0 = lado esquerdo visto da rua).
// Eixo z = profundidade (0 = alinhamento da calçada, 32 = muro do fundo).
export const LOT = { w: 6, d: 32 };

// Cotas verticais: térreo, forro do térreo, piso superior, forro superior, laje, platibanda.
export const Y = { g: 0, gc: 2.8, up: 3.0, uc: 5.8, roof: 6.0, par: 6.6 };

// Escada reta junto à parede direita, sobe em direção ao fundo.
export const STAIR = { x1: 4.75, x2: 5.85, z0: 6.2, z1: 10.68, risers: 17, tread: 0.28 };
STAIR.rise = Y.up / STAIR.risers;
STAIR.slope = (Y.up - STAIR.rise) / (STAIR.z1 - STAIR.z0);

// Área de cada ambiente: soma dos retângulos [x1, x2, z1, z2] menos os recortes.
const area = (rects, minus = []) => {
  const s = (list) => list.reduce((a, [x1, x2, z1, z2]) => a + (x2 - x1) * (z2 - z1), 0);
  return s(rects) - s(minus);
};

const room = (o) => ({ ...o, area: o.area ?? area(o.rects, o.minus) });

export const ROOMS = [
  // Térreo
  room({ id: 'jardim', level: 0, outdoor: true, name: 'Jardim frontal', at: [4.6, 2.2], rects: [[0.15, 5.85, 0.18, 5.0]], note: 'recuo de 5,00 m' }),
  room({ id: 'garagem', level: 0, name: 'Garagem coberta', at: [1.72, 8.0], rects: [[0.15, 3.3, 5.0, 11.0]], note: '1 carro coberto + 1 no recuo' }),
  room({ id: 'hall', level: 0, name: 'Hall + escada', at: [4.05, 7.6], rects: [[3.45, 5.85, 5.15, 11.0]], minus: [[4.87, 5.85, 9.3, 10.68]], note: 'pé-direito duplo 5,80 m' }),
  room({ id: 'lavabo', level: 0, name: 'Lavabo', at: [5.36, 10.0], rects: [[4.87, 5.85, 9.3, 10.68]], note: 'sob a escada (sugestão)' }),
  room({ id: 'estar', level: 0, name: 'Sala de estar', at: [2.6, 13.4], rects: [[0.15, 5.85, 11.12, 15.6]] }),
  room({ id: 'jantar', level: 0, name: 'Sala de jantar', at: [2.6, 16.8], rects: [[0.15, 5.85, 15.6, 18.0]] }),
  room({ id: 'cozinha', level: 0, name: 'Cozinha com ilha', at: [3.9, 20.6], rects: [[0.15, 5.85, 18.0, 22.0]] }),
  room({ id: 'gourmet', level: 0, name: 'Área gourmet', at: [2.2, 24.2], rects: [[0.15, 5.85, 22.15, 26.0]], minus: [[3.98, 5.85, 22.15, 24.72]], note: 'churrasqueira' }),
  room({ id: 'lavanderia', level: 0, name: 'Lavanderia', at: [4.97, 23.4], rects: [[4.1, 5.85, 22.15, 24.6]] }),
  room({ id: 'piscina', level: 0, outdoor: true, name: 'Piscina', at: [1.95, 29.2], rects: [[0.45, 3.45, 26.9, 31.4]], note: '3,00 × 4,50 · prof. 1,40' }),
  room({ id: 'deck', level: 0, outdoor: true, name: 'Deck + solário', at: [4.8, 29.2], rects: [[0.15, 5.85, 26.0, 31.85]], minus: [[0.2, 3.7, 26.65, 31.65]] }),
  // Superior
  room({ id: 'suite', level: 1, name: 'Suíte master', at: [2.2, 7.2], rects: [[0.15, 4.63, 5.15, 9.2]] }),
  room({ id: 'closet', level: 1, name: 'Closet', at: [1.6, 10.3], rects: [[0.15, 3.33, 9.32, 11.3]] }),
  room({ id: 'banhosuite', level: 1, name: 'Banho suíte', at: [1.4, 12.7], rects: [[0.15, 3.33, 11.42, 13.9]] }),
  room({ id: 'banhosocial', level: 1, name: 'Banho social', at: [1.0, 15.1], rects: [[0.15, 1.9, 14.02, 16.3]] }),
  room({ id: 'quarto2', level: 1, name: 'Quarto 2', at: [1.6, 18.0], rects: [[0.15, 3.0, 16.42, 19.6]] }),
  room({ id: 'quarto3', level: 1, name: 'Quarto 3', at: [4.5, 18.0], rects: [[3.12, 5.85, 16.42, 19.6]] }),
  room({ id: 'circulacao', level: 1, name: 'Hall íntimo + estudo', at: [4.4, 12.6], rects: [[3.45, 4.75, 9.32, 10.68], [3.45, 5.85, 10.68, 14.02], [2.02, 5.85, 14.02, 16.3]] }),
  room({ id: 'vazio', level: 1, name: 'Vazio (pé-direito duplo)', at: [5.3, 7.4], rects: [[4.75, 5.85, 5.15, 10.68]], noArea: true }),
];

// Pontos de partida do modo "Caminhar" (x, z, nível do piso, direção do olhar).
// yaw 0 = olhando para o fundo do lote; Math.PI = olhando para a rua.
export const SPOTS = [
  { id: 'calcada', name: 'Calçada (chegada)', x: 5.2, z: -1.6, y: 0, yaw: 0 },
  { id: 'garagem', name: 'Garagem', x: 2.95, z: 10.5, y: 0, yaw: Math.PI },
  { id: 'hall', name: 'Hall de entrada', x: 4.1, z: 5.7, y: 0, yaw: -0.35 },
  { id: 'estar', name: 'Sala de estar', x: 5.2, z: 15.2, y: 0, yaw: 2.2 },
  { id: 'cozinha', name: 'Cozinha', x: 4.4, z: 18.2, y: 0, yaw: 0.35 },
  { id: 'gourmet', name: 'Área gourmet', x: 3.45, z: 22.45, y: 0, yaw: 0.25 },
  { id: 'piscina', name: 'Piscina (vista da casa)', x: 4.6, z: 31.3, y: 0, yaw: Math.PI - 0.25 },
  { id: 'suite', name: 'Suíte master', x: 3.95, z: 8.7, y: 3, yaw: 2.4 },
  { id: 'closet', name: 'Closet e banho da suíte', x: 2.75, z: 9.6, y: 3, yaw: -0.1 },
  { id: 'estudo', name: 'Hall íntimo + estudo', x: 4.1, z: 11.0, y: 3, yaw: 0 },
  { id: 'quarto2', name: 'Quarto 2', x: 2.5, z: 16.9, y: 3, yaw: 0.6 },
  { id: 'quarto3', name: 'Quarto 3', x: 4.7, z: 16.9, y: 3, yaw: -0.5 },
];

// Superfícies onde dá para pisar no modo "Caminhar".
export const SURFACES = [
  { y: -0.15, rect: [-20, 26, -14, -2.6] },
  { y: 0, rect: [-20, 26, -2.6, 32] },
  { y: Y.up, rect: [0.15, 4.75, 5.15, 10.68] },
  { y: Y.up, rect: [0.15, 5.85, 10.68, 19.6] },
];

export const WORLD = { x1: -20, x2: 26, z1: -14, z2: 31.9 };

export const fmt = (n, d = 2) => n.toFixed(d).replace('.', ',');
