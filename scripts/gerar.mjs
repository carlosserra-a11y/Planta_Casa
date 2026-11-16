// Gera as versões para abrir fora do claude.ai a partir de artifact.html + js/:
//   index.html             página completa (usa a pasta js/), serve para GitHub Pages
//   dist/Casa-6x32.html    arquivo único, com todo o código embutido (precisa de internet para o Three.js)
// Uso: node scripts/gerar.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const write = (p, text) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), text);
};

const HEAD = [
  '<!doctype html>',
  '<html lang="pt-BR">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<style>[hidden]{display:none!important} body{margin:0}</style>',
  '',
].join('\n');

const page = read('artifact.html');
const split = page.indexOf('<div id="app">');
if (split < 0) throw new Error('artifact.html: não achei <div id="app">');
const head = page.slice(0, split);
const body = page.slice(split);
const doc = (b) => `${HEAD}${head}</head>\n<body>\n${b}</body>\n</html>\n`;

write('index.html', doc(body));

// Junta os módulos locais: cada um vira uma função que devolve o que exporta.
const ORDER = ['plan-data', 'materials', 'builder', 'house', 'furniture', 'walk', 'plan2d', 'prompt', 'main'];
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
    const names = what.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${names.join(', ')} } = __m['${mod}'];`;
  });
  src = src.replace(/^export\s+(function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm, (m, kw, id) => {
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
// Função de substituição: o código tem "$'" e "$&", que numa string de substituição seriam especiais.
write('dist/Casa-6x32.html', doc(body.replace(tag, () => `<script type="module">\n${bundle}\n</script>`)));

console.log('Gerados: index.html e dist/Casa-6x32.html');
