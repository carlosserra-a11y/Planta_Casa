// Gera as versões para abrir fora do claude.ai a partir de artifact.html + js/:
//   index.html             página completa (usa a pasta js/), publicada no GitHub Pages
//   dist/Casa-6x32.html    arquivo único, com todo o código embutido (precisa de internet para o Three.js)
//   icon-180.png           ícone para "Adicionar à Tela de Início" (iPhone/Android)
//   manifest.webmanifest   dados do app para o celular
// Uso: node scripts/gerar.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const write = (p, data) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), data);
};

const HEAD = [
  '<!doctype html>',
  '<html lang="pt-BR">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<meta name="description" content="Modelo 3D navegável do sobrado 6 × 32 m: passeio por dentro, planta baixa e prompt do projeto.">',
  '<meta name="theme-color" content="#1c1b19">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Casa 6x32">',
  '<link rel="apple-touch-icon" href="icon-180.png">',
  '<link rel="icon" type="image/png" href="icon-180.png">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<style>[hidden]{display:none!important} body{margin:0}</style>',
  '',
].join('\n');

const page = read('artifact.html');
const split = page.indexOf('<div id="app">');
if (split < 0) throw new Error('artifact.html: não achei <div id="app">');
const head = page.slice(0, split);
const body = page.slice(split);
const doc = (h, b) => `${HEAD}${h}</head>\n<body>\n${b}</body>\n</html>\n`;

write('index.html', doc(head, body));

// ---------- arquivo único ----------
const ORDER = ['plan-data', 'textures', 'materials', 'builder', 'house', 'furniture', 'walk', 'plan2d', 'prompt', 'main'];
const external = new Set();
const parts = ORDER.map((name) => {
  const exported = [];
  let src = read(`js/${name}.js`);
  src = src.replace(/^import\s+(.+?)\s+from\s+'([^']+)';[ \t]*$/gm, (line, what, from) => {
    if (!from.startsWith('./')) {
      external.add(line.trim());
      return '';
    }
    const mod = from.slice(2).replace(/\.js$/, '');
    if (!ORDER.includes(mod)) throw new Error(`js/${name}.js importa ${from}, que não está na lista ORDER`);
    const names = what.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${names.join(', ')} } = __m['${mod}'];`;
  });
  src = src.replace(/^export\s+(async\s+function|function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm, (m, kw, id) => {
    exported.push(id);
    return `${kw} ${id}`;
  });
  if (/^export\s/m.test(src)) throw new Error(`js/${name}.js: export não suportado pelo gerador`);
  return `__m['${name}'] = (() => {\n${src}\nreturn { ${exported.join(', ')} };\n})();`;
});
const bundle = [...external, 'const __m = {};', ...parts].join('\n');
if (bundle.includes('</script')) throw new Error('o código contém </script>, não dá para embutir');

const tag = '<script type="module" src="js/main.js"></script>';
if (!body.includes(tag)) throw new Error('artifact.html: não achei a tag do js/main.js');
const singleHead = head.replace(/^<link rel="modulepreload" href="js\/[^"]+">\r?\n/gm, '');
// Função de substituição: o código tem "$'" e "$&", que numa string de substituição seriam especiais.
const singleBody = body.replace(tag, () => `<script type="module">\n${bundle}\n</script>`);
write('dist/Casa-6x32.html', doc(singleHead, singleBody).replace(/\n<link rel="(apple-touch-icon|icon|manifest)"[^>]*>/g, ''));

// ---------- ícone e manifesto ----------
write('icon-180.png', iconPng(180));
write('manifest.webmanifest', `${JSON.stringify({
  name: 'Casa 6×32',
  short_name: 'Casa 6x32',
  description: 'Modelo 3D navegável do sobrado 6 × 32 m',
  start_url: './',
  display: 'fullscreen',
  orientation: 'any',
  background_color: '#1c1b19',
  theme_color: '#1c1b19',
  icons: [{ src: 'icon-180.png', sizes: '180x180', type: 'image/png' }],
}, null, 2)}\n`);

console.log('Gerados: index.html, dist/Casa-6x32.html, icon-180.png e manifest.webmanifest');

/** Ícone: a fachada da casa (caixa cinza, faixa preta, madeira e janela alta). */
function iconPng(n) {
  const px = new Uint8Array(n * n * 4);
  const s = n / 180;
  const rect = (x1, y1, x2, y2, [r, g, b]) => {
    for (let y = Math.round(y1 * s); y < Math.round(y2 * s); y++) {
      for (let x = Math.round(x1 * s); x < Math.round(x2 * s); x++) {
        const i = (y * n + x) * 4;
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
      }
    }
  };
  rect(0, 0, 180, 180, [28, 27, 25]);
  rect(0, 150, 180, 180, [58, 56, 52]);
  rect(34, 58, 146, 150, [198, 194, 185]); // volume da casa
  rect(30, 48, 150, 62, [16, 16, 17]); // faixa preta da platibanda
  rect(42, 72, 92, 104, [245, 244, 240]); // moldura branca
  rect(48, 78, 86, 98, [24, 25, 27]); // persiana
  rect(96, 68, 118, 150, [155, 102, 60]); // painel amadeirado
  rect(122, 66, 140, 150, [20, 21, 23]); // janela alta
  rect(125, 70, 137, 146, [196, 214, 222]);
  rect(130, 70, 132, 146, [20, 21, 23]);
  rect(34, 112, 92, 118, [16, 16, 17]); // viga da garagem
  rect(40, 118, 88, 150, [120, 116, 108]); // garagem
  rect(100, 118, 114, 150, [120, 78, 45]); // porta
  const raw = Buffer.alloc((n * 4 + 1) * n);
  for (let y = 0; y < n; y++) {
    raw[y * (n * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * n * 4, n * 4).copy(raw, y * (n * 4 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
