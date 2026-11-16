// Texturas procedurais sem imagens externas: ruído fractal que repete sem emenda
// (tileável) + pintura por pixel. Tudo é gerado uma vez, na abertura da página.

const TAU = Math.PI * 2;
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

/** Hash inteiro -> [0, 1). Determinístico (mesma casa em todo aparelho). */
export function hash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruído de valor tileável: cx × cy células numa grade size × size. */
function valueNoise(size, cx, cy, seed) {
  const out = new Float32Array(size * size);
  const lat = new Float32Array(cx * cy);
  for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) lat[j * cx + i] = hash(i, j, seed);
  const kx = cx / size;
  const ky = cy / size;
  for (let y = 0; y < size; y++) {
    const fy = y * ky;
    const y0 = fy | 0;
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    const r0 = y0 * cx;
    const r1 = ((y0 + 1) % cy) * cx;
    for (let x = 0; x < size; x++) {
      const fx = x * kx;
      const x0 = fx | 0;
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const x1 = (x0 + 1) % cx;
      const a = lat[r0 + x0];
      const b = lat[r0 + x1];
      const c = lat[r1 + x0];
      const d = lat[r1 + x1];
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

function fbm(size, cx, cy, octaves, seed) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const m = 1 << o;
    const n = valueNoise(size, cx * m, cy * m, seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export class TextureKit {
  /** @param {number} size lado (px) dos campos de ruído e das texturas principais */
  constructor(size) {
    this.S = size;
    this.N = fbm(size, 4, 4, 5, 11); // manchas grandes
    this.D = fbm(size, 16, 16, 3, 29); // detalhe médio
    this.W = fbm(size, 48, 3, 3, 47); // veio de madeira (esticado no comprimento)
  }

  f(field, x, y) {
    const S = this.S;
    return field[((((y | 0) % S) + S) % S) * S + ((((x | 0) % S) + S) % S)];
  }

  /** Pinta uma textura size × size; fn(x, y, k, out) recebe k = escala até o campo de ruído. */
  paint(size, fn) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const out = [0, 0, 0];
    const k = this.S / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        fn(x, y, k, out);
        const i = (y * size + x) * 4;
        d[i] = out[0];
        d[i + 1] = out[1];
        d[i + 2] = out[2];
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /** Massa corrida / textura acrílica. */
  plaster(hex, size, amount = 0.1, off = 0) {
    const [r, g, b] = rgb(hex);
    return this.paint(size, (x, y, k, o) => {
      const v = 1 + (this.f(this.N, x * k + off, y * k) - 0.5) * amount
        + (this.f(this.D, x * k, y * k + off) - 0.5) * amount * 0.8
        + (hash(x, y, off + 3) - 0.5) * amount * 0.7;
      o[0] = r * v; o[1] = g * v; o[2] = b * v;
    });
  }

  /** Chapisco do muro: manchas, granulado e furinhos escuros. */
  roughConcrete(hex, size) {
    const [r, g, b] = rgb(hex);
    return this.paint(size, (x, y, k, o) => {
      const d = this.f(this.D, x * k, y * k);
      let v = 1 + (this.f(this.N, x * k, y * k) - 0.5) * 0.26 + (d - 0.5) * 0.22 + (hash(x, y, 5) - 0.5) * 0.32;
      if (hash(x, y, 9) < 0.016) v *= 0.5;
      if (d < 0.2) v *= 0.94;
      o[0] = r * v; o[1] = g * v; o[2] = b * v;
    });
  }

  /**
   * Tábuas / ripas de madeira. n tábuas por textura; vertical = tábuas em pé.
   * gap = fração escura entre ripas (painel ripado); segs = emendas por tábua.
   */
  wood(palette, n, size, { vertical = true, gap = 0, segs = 1, grain = 1, lines = true } = {}) {
    const cols = palette.map(rgb);
    const w = size / n;
    const segLen = size / segs;
    return this.paint(size, (x, y, k, o) => {
      const along = vertical ? y : x;
      const across = vertical ? x : y;
      const p = Math.floor(across / w);
      const la = across - p * w;
      const jo = hash(p, 7, 3) * size;
      const pos = (along + jo) % size;
      const seg = Math.floor(pos / segLen);
      const base = cols[Math.floor(hash(p, seg, 5) * cols.length)];
      const tone = 0.9 + hash(p, seg, 9) * 0.18;
      const wv = this.f(this.W, across * k, along * k);
      const gr = Math.sin(la * ((TAU * 4.5) / w) + wv * 16 * grain + p * 1.7);
      let v = tone * (1 + gr * 0.075 * grain + (this.f(this.D, x * k, y * k) - 0.5) * 0.1 + (hash(x, y, 1) - 0.5) * 0.05);
      if (lines) {
        if (la < 1.2) v *= gap ? 0.3 : 0.55;
        else if (gap && la > w * (1 - gap)) v *= 0.22;
        if (pos % segLen < 1.2) v *= 0.6;
      }
      o[0] = base[0] * v; o[1] = base[1] * v; o[2] = base[2] * v;
    });
  }

  /** Porcelanato / placas com rejunte. */
  tiles(hex, groutHex, n, size, { vary = 0.05, cloud = 0.08, line = 1.2 } = {}) {
    const [r, g, b] = rgb(hex);
    const [gr, gg, gb] = rgb(groutHex);
    const w = size / n;
    return this.paint(size, (x, y, k, o) => {
      const tx = Math.floor(x / w);
      const ty = Math.floor(y / w);
      const lx = x - tx * w;
      const ly = y - ty * w;
      if (lx < line || ly < line || lx > w - line || ly > w - line) {
        o[0] = gr; o[1] = gg; o[2] = gb;
        return;
      }
      const v = 1 + (hash(tx, ty, 13) - 0.5) * vary + (this.f(this.N, x * k + tx * 61, y * k) - 0.5) * cloud
        + (this.f(this.D, x * k, y * k) - 0.5) * cloud * 0.5 + (hash(x, y, 2) - 0.5) * 0.03;
      o[0] = r * v; o[1] = g * v; o[2] = b * v;
    });
  }

  /** Mármore claro com veios (porcelanato marmorizado). */
  marble(hex, size, n = 2) {
    const [r, g, b] = rgb(hex);
    const w = size / n;
    return this.paint(size, (x, y, k, o) => {
      const t = (x / size) * TAU * 2 + (y / size) * TAU + (this.f(this.N, x * k, y * k) - 0.5) * 9 + (this.f(this.D, x * k, y * k) - 0.5) * 2.5;
      const vein = Math.pow(1 - Math.abs(Math.sin(t)), 22);
      let v = 1 - vein * 0.2 + (this.f(this.N, x * k + 90, y * k) - 0.5) * 0.05;
      if (x % w < 1 || y % w < 1) v *= 0.86;
      o[0] = r * v; o[1] = g * v; o[2] = b * v;
    });
  }

  grass(size) {
    const a = rgb('#5f7e3e');
    const c = rgb('#45632c');
    const l = rgb('#7f9c52');
    return this.paint(size, (x, y, k, o) => {
      const m = this.f(this.N, x * k, y * k);
      const blade = hash(x, y >> 2, 3);
      const t = Math.min(1, Math.max(0, (m - 0.3) * 2));
      let v = 0.86 + blade * 0.3 + (this.f(this.D, x * k, y * k) - 0.5) * 0.25;
      const hi = blade > 0.93 ? 0.5 : 0;
      v = Math.max(0.5, v);
      for (let i = 0; i < 3; i++) o[i] = ((a[i] * (1 - t) + c[i] * t) * (1 - hi) + l[i] * hi) * v;
    });
  }

  asphalt(size) {
    const [r, g, b] = rgb('#3b3c3e');
    return this.paint(size, (x, y, k, o) => {
      const h = hash(x, y, 21);
      let v = 1 + (this.f(this.N, x * k, y * k) - 0.5) * 0.16 + (h - 0.5) * 0.4;
      if (h > 0.985) v = 1.9;
      o[0] = r * v; o[1] = g * v; o[2] = b * v;
    });
  }

  /** Pedra em fiadas (churrasqueira, muro da cascata). */
  ashlar(size, tones) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a4744';
    ctx.fillRect(0, 0, size, size);
    const rows = 9;
    const h = size / rows;
    const m = Math.max(1.5, (size / 256) * 2);
    for (let j = 0; j < rows; j++) {
      let px = -hash(j, 1, 7) * size * 0.2;
      let i = 0;
      while (px < size) {
        const w = size * (0.1 + hash(i, j, 3) * 0.22);
        ctx.fillStyle = tones[Math.floor(hash(i, j, 5) * tones.length)];
        for (const dx of [0, size]) ctx.fillRect(px + dx + m, j * h + m, w - 2 * m, h - 2 * m);
        px += w;
        i++;
      }
    }
    return this.overlay(c, 0.28, 0.16);
  }

  /** Jardim vertical: folhas sobrepostas, com repetição sem emenda. */
  greenWall(size, count) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#26381c';
    ctx.fillRect(0, 0, size, size);
    const greens = ['#3f6b2a', '#56843a', '#2f5420', '#6a9a45', '#7aa856', '#48733a'];
    const s = size / 512;
    for (let i = 0; i < count; i++) {
      const x = hash(i, 1, 51) * size;
      const y = hash(i, 2, 51) * size;
      const rx = (4 + hash(i, 3, 51) * 9) * s;
      const ry = (2 + hash(i, 4, 51) * 4) * s;
      const rot = hash(i, 5, 51) * Math.PI;
      ctx.fillStyle = greens[Math.floor(hash(i, 6, 51) * greens.length)];
      for (const [dx, dy] of [[0, 0], [-size, 0], [0, -size], [-size, -size]]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, rx, ry, rot, 0, TAU);
        ctx.fill();
      }
    }
    return this.overlay(c, 0.18, 0.1);
  }

  /** Multiplica um canvas pelo ruído (dá textura a desenhos lisos). */
  overlay(c, amount, grain) {
    const size = c.width;
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    const k = this.S / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = 1 + (this.f(this.D, x * k, y * k) - 0.5) * amount + (hash(x, y, 77) - 0.5) * grain;
        const i = (y * size + x) * 4;
        d[i] *= v;
        d[i + 1] *= v;
        d[i + 2] *= v;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

// ---------- desenhos pequenos (sem ruído) ----------
function small(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

export const mosaic = () => small(256, (x, size) => {
  const n = 10;
  const w = size / n;
  x.fillStyle = '#e6f2f4';
  x.fillRect(0, 0, size, size);
  const blues = ['#2a8fb8', '#3aa2c8', '#1f7fa8', '#46b0d2', '#2896bf'];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      x.fillStyle = blues[Math.floor(hash(i, j, 37) * blues.length)];
      x.fillRect(i * w + 1.5, j * w + 1.5, w - 3, w - 3);
    }
  }
});

export const slats = () => small(128, (x, size) => {
  x.fillStyle = '#1e1f21';
  x.fillRect(0, 0, size, size);
  for (let j = 0; j < 16; j++) {
    x.fillStyle = 'rgba(255,255,255,0.08)';
    x.fillRect(0, j * 8, size, 2);
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(0, j * 8 + 7, size, 1);
  }
});

export const water = (seed) => small(256, (x, size) => {
  x.fillStyle = '#4fbfdc';
  x.fillRect(0, 0, size, size);
  x.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(255,255,255,${(0.08 + hash(i, 1, seed) * 0.2).toFixed(2)})`;
    const px = hash(i, 2, seed) * size;
    const py = hash(i, 3, seed) * size;
    for (const dx of [0, -size]) {
      x.beginPath();
      x.moveTo(px + dx, py);
      x.bezierCurveTo(px + dx + 20, py + (hash(i, 4, seed) - 0.5) * 30, px + dx + 40, py + (hash(i, 5, seed) - 0.5) * 30, px + dx + 60, py);
      x.stroke();
    }
  }
});

export const solar = () => small(256, (x, size) => {
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
});

export const tactile = () => small(128, (x, size) => {
  x.fillStyle = '#a3442f';
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 4; i++) {
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(i * 32 + 6, 0, 10, size);
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(i * 32 + 16, 0, 3, size);
  }
});

export const numberPlate = () => small(256, (x) => {
  x.fillStyle = '#141414';
  x.fillRect(20, 92, 46, 72);
  x.font = 'bold 120px Arial, sans-serif';
  x.textBaseline = 'middle';
  x.fillText('00', 84, 132);
});
