# Planta Casa 6×32

Modelo 3D navegável de um sobrado contemporâneo em lote de **6,00 × 32,00 m**: 3 quartos (1 suíte com closet), 2 banheiros no pavimento superior, sala, cozinha e garagem no térreo, e área de churrasco com piscina nos fundos. A fachada segue fotos de referência (cinza claro, faixa preta na platibanda, porcelanato amadeirado, persiana preta em moldura branca e janela alta preta).

## Como abrir

| Arquivo | Para quê |
|---|---|
| `dist/Casa-6x32.html` | Arquivo único: baixe e abra no navegador (precisa de internet para carregar o Three.js). |
| `index.html` + `js/` | Versão para servidor ou GitHub Pages. Abrir direto do disco não funciona (módulos JS); use um servidor, por exemplo `python -m http.server`. |
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

## Estrutura do código

`js/plan-data.js` guarda medidas, ambientes e pontos do passeio; `house.js` monta paredes, lajes, escada, fachada, lote e piscina; `furniture.js` coloca móveis e luzes; `walk.js` faz o modo caminhar (colisão e escada); `plan2d.js` desenha a planta SVG a partir do mesmo modelo; `main.js` liga cena, câmeras e interface. Three.js 0.160 vem do jsDelivr por importmap.

Depois de editar `artifact.html` ou `js/`, regenere as outras versões:

```bash
node scripts/gerar.mjs
```
