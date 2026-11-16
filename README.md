# Planta Casa 6×32

Modelo 3D navegável de um sobrado contemporâneo em lote de **6,00 × 32,00 m**: 3 quartos (1 suíte com closet), 2 banheiros no pavimento superior, sala, cozinha e garagem no térreo, e área de churrasco com piscina nos fundos. A fachada segue fotos de referência (cinza claro, faixa preta na platibanda, porcelanato amadeirado, persiana preta em moldura branca e janela alta preta).

## Como abrir

**No celular ou no computador:** https://carlosserra-a11y.github.io/Planta_Casa/

No iPhone, abra o link no Safari e use **Compartilhar → Adicionar à Tela de Início**: a casa vira um ícone e abre em tela cheia, como um app.

| Arquivo | Para quê |
|---|---|
| `index.html` + `js/` | Versão publicada no GitHub Pages. Abrir direto do disco não funciona (módulos JS); use um servidor, por exemplo `python -m http.server`. |
| `dist/Casa-6x32.html` | Arquivo único: baixe e abra no navegador do computador (precisa de internet para carregar o Three.js). No iPhone, prefira o link acima: a pré-visualização de arquivos do iOS não roda o 3D. |
| `artifact.html` | Mesma página no formato do Artifact do claude.ai (sem `<head>`). É a fonte das outras duas. |
| `PROMPT-casa-6x32.md` | Prompt completo do projeto, para IA de render/3D ou para entregar ao arquiteto. |

## O que dá para fazer

- **Explorar 3D**: girar em volta da casa, câmeras prontas (fachada, aérea, fundos, lateral, de cima) e cortes "Sem laje" e "Só térreo".
- **Caminhar**: primeira pessoa, da calçada até a piscina, subindo a escada. Computador: clique na cena, `W A S D` anda, `Shift` corre, `Esc` solta o mouse. Celular: arraste para olhar e use o círculo para andar.
- **Planta 2D**: térreo e superior com cotas e área de cada ambiente; roda do mouse ou botões para aproximar.
- **Dia / Noite**: a noite acende as luzes, parecido com as fotos de referência.

## Programa e medidas principais

- Recuo frontal de 5,00 m com 1 vaga coberta + 1 descoberta.
- Térreo (pé-direito 2,80 m): garagem, hall com pé-direito duplo e escada reta (17 espelhos de 17,6 cm, pisada 28 cm), lavabo sob a escada, estar (25,7 m²), jantar (13,7 m²), cozinha com ilha (22,8 m²).
- Superior: suíte master (18,1 m²) com closet (6,3 m²) e banho (7,9 m²), hall íntimo com estudo, banho social (4,0 m²), quarto 2 (9,1 m²), quarto 3 (8,7 m²).
- Fundos: área gourmet coberta com churrasqueira (17,1 m²), lavanderia (4,3 m²), piscina 3,00 × 4,50 m (prof. 1,40 m, prainha 0,35 m), deck e solário.
- Área construída aproximada: 214 m².

> Estudo preliminar. Recuos, taxa de ocupação, área permeável e construção nas divisas precisam ser confirmados com a prefeitura e com um arquiteto/engenheiro.

## Desempenho

- Celulares e aparelhos com pouca memória entram no **modo leve**: texturas de 256 px, sem relevo, sombras mais simples, 8 luzes noturnas em vez de 24 e sem desfoque nos painéis.
- A cena só é redesenhada quando algo muda (câmera, passeio, botões); parada, só a água da piscina anima em ritmo baixo.
- As sombras do sol são calculadas uma vez e refeitas só quando a vista muda.
- A resolução se ajusta sozinha se o aparelho não mantiver uns 40 quadros por segundo.
- Para forçar um modo, acrescente `#leve` ou `#alta` ao endereço.

## Estrutura do código

`js/plan-data.js` guarda medidas, ambientes e pontos do passeio; `textures.js` gera as texturas (ruído fractal que repete sem emenda: madeira, chapisco, porcelanato, mármore, grama, pedra); `materials.js` monta os materiais; `house.js` monta paredes, lajes, escada, fachada, lote e piscina; `furniture.js` coloca móveis e luzes; `walk.js` faz o modo caminhar (colisão e escada); `plan2d.js` desenha a planta SVG a partir do mesmo modelo, com zoom e pinça; `main.js` liga cena, câmeras e interface. Three.js 0.160 vem minificado do jsDelivr (`/+esm`), sem importmap, para funcionar também em iPhones mais antigos.

Depois de editar `artifact.html` ou `js/`, regenere as outras versões:

```bash
node scripts/gerar.mjs
```
