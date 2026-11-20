# Design System: Neruz Page View

Contrato visual da extensão (Estúdio, popup, boas-vindas) e da landing. Fonte da marca: kit de identidade v1.0 (`_entrada/identidade/Neruz-Page-View/`). Conceito e coreografia: `.equipe/briefs/direcao.md`. Tokens moram em `packages/ui/tokens.css` (prefixo `--pv-`) e são importados pela landing. Mudança aqui exige aviso ao art-director.

## 1. Cor

### 1.1 Base da marca (não alterar)
| Token | Hex | Uso |
|---|---|---|
| `--pv-cyan` | #00E5FF | Acento no escuro: o que mede ou age |
| `--pv-petrol` | #007D8A | Acento de fundo no claro, símbolo em fundo claro |
| `--pv-night` | #080D14 | Fundo base escuro, texto no claro |
| `--pv-graphite` | #141D29 | Superfície elevada no escuro |
| `--pv-line` | #304256 | Divisores decorativos no escuro |
| `--pv-ice` | #F4F8FC | Texto no escuro, fundo no claro |
| `--pv-mist` | #A6B5C5 | Texto secundário no escuro |

### 1.2 Tokens semânticos
| Token | Escuro (padrão) | Claro |
|---|---|---|
| `--pv-bg-mat` (bancada, área de telas) | #080D14 | #E8EEF4 |
| `--pv-bg-chrome` (barras, painéis, página da landing) | #0E1520 | #F4F8FC |
| `--pv-bg-raised` (cartões, inputs, popovers) | #141D29 | #FFFFFF |
| `--pv-bg-hover` | #1B2635 | #E1E9F1 |
| `--pv-line-soft` (divisor interno) | #1F2B3A | #DCE5EE |
| `--pv-line` (divisor, contorno decorativo) | #304256 | #CBD6E1 |
| `--pv-line-strong` (borda de input, controle: 3:1) | #64798F | #71849A |
| `--pv-text` | #F4F8FC | #080D14 |
| `--pv-text-2` | #A6B5C5 | #4A5A6C |
| `--pv-text-3` (placeholder, dica) | #8296AC | #55667A |
| `--pv-accent` (fundo de ação primária) | #00E5FF | #007D8A |
| `--pv-accent-hover` | #5CEEFF | #006B76 |
| `--pv-on-accent` | #080D14 | #FFFFFF |
| `--pv-accent-text` (link, rótulo ativo, texto pequeno) | #00E5FF | #006B76 |
| `--pv-focus` | #00E5FF | #006B76 |
| `--pv-danger` (gravação, erro) | #FF5A6A | #C42638 |
| `--pv-warning` (rolagem lateral) | #FFC247 | #8A5600 |
| `--pv-success` | #3DDC97 | #0B7A4E |
| `--pv-mat-grid` | rgba(244,248,252,.06) | rgba(8,13,20,.07) |
| `--pv-lamp` (luz de mesa, landing) | rgba(0,229,255,.08) | n/a |

### 1.3 Pares verificados (WCAG, calculados)
| Texto / elemento | Fundo | Razão | Uso permitido |
|---|---|---|---|
| #F4F8FC | #080D14 / #0E1520 / #141D29 / #1B2635 | 18,26 / 17,16 / 15,90 / 14,31 | qualquer |
| #A6B5C5 | #080D14 / #0E1520 / #141D29 / #1B2635 | 9,31 / 8,75 / 8,11 / 7,30 | qualquer |
| #8296AC | #080D14 / #141D29 / #1B2635 | 6,41 / 5,58 / 5,02 | texto pequeno |
| #00E5FF | #080D14 / #0E1520 / #141D29 / #1B2635 | 12,66 / 11,90 / 11,03 / 9,93 | qualquer |
| #080D14 | #00E5FF / #5CEEFF | 12,66 / 14,03 | texto de botão |
| #FF5A6A | #080D14 / #141D29 / #1B2635 | 6,42 / 5,59 / 5,03 | texto pequeno |
| #FFC247 · #3DDC97 | #141D29 | 10,55 · 9,60 | qualquer |
| #64798F (borda) | #0E1520 / #141D29 / #1B2635 | 4,08 / 3,78 / 3,40 | não texto (3:1) |
| #080D14 | #F4F8FC / #E8EEF4 / #FFFFFF | 18,26 / 16,67 / 19,48 | qualquer |
| #4A5A6C | #F4F8FC / #E8EEF4 / #FFFFFF | 6,63 / 6,05 / 7,07 | qualquer |
| #55667A | #F4F8FC / #E8EEF4 / #FFFFFF | 5,52 / 5,04 / 5,89 | texto pequeno |
| #006B76 | #F4F8FC / #E8EEF4 / #FFFFFF | 5,85 / 5,34 / 6,24 | texto pequeno de acento |
| #FFFFFF | #007D8A / #006B76 | 4,88 / 6,24 | texto de botão |
| #007D8A | #F4F8FC / #E8EEF4 | 4,58 / 4,18 | **só não texto** (ícone, borda ativa, logo) |
| #C42638 · #8A5600 · #0B7A4E | #E8EEF4 | 4,88 · 5,27 · 4,60 | texto pequeno |
| #71849A (borda) | #F4F8FC / #E8EEF4 / #FFFFFF | 3,60 / 3,29 / 3,84 | não texto (3:1) |
| #00E5FF | #F4F8FC | 1,44 | **proibido** |
Regras: informação nunca só por cor (estado leva ícone ou texto). `--pv-line` (1,65 a 1,89) é só decorativo; contorno de controle usa `--pv-line-strong`.

### 1.4 Site de demonstração da landing (conteúdo fictício, não é marca)
`--demo-cream` #F3E9DA · `--demo-ink` #221A15 (14,25:1 no creme) · `--demo-terracotta` #C4532D (3,78:1: só título ≥24 px ou forma).

## 2. Tipografia
Fontes do kit (OFL), auto-hospedadas em woff2 com subset latin + latin-ext (pt/es), `font-display: swap`; nada de Google Fonts (sem requisição externa). Variáveis: `Sora-Variable` e `Inter-Variable`. Preload só da Sora 600 na landing.
- `--pv-font-display`: "Sora", system-ui, sans-serif · pesos 600 (títulos), 700 (chamadas curtas).
- `--pv-font-ui`: "Inter", system-ui, sans-serif · 400, 500, 600.
- Números de medida, tempo e contagem: Inter com `font-feature-settings: "tnum" 1, "zero" 1`.

### 2.1 Landing (fluida, 360 a 1920)
| Token | Família/peso | Tamanho | Entrelinha | Espaçamento |
|---|---|---|---|---|
| `--pv-fs-display` | Sora 600 | clamp(2.5rem, 1.6rem + 4.2vw, 6.5rem) | 1.02 | -0.03em |
| `--pv-fs-h2` | Sora 600 | clamp(2rem, 1.35rem + 2.9vw, 4.5rem) | 1.05 | -0.025em |
| `--pv-fs-h3` | Sora 600 | clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem) | 1.2 | -0.01em |
| `--pv-fs-lead` | Inter 400 | clamp(1.0625rem, 0.98rem + 0.45vw, 1.375rem) | 1.5 | 0 |
| `--pv-fs-body` | Inter 400 | clamp(1rem, 0.97rem + 0.15vw, 1.0625rem) | 1.6 | 0 |
| `--pv-fs-small` | Inter 500 | 0.8125rem | 1.45 | 0 |
| `--pv-fs-eyebrow` | Inter 600, caixa alta | 0.75rem | 1.3 | 0.14em |
| `--pv-fs-cota` | Inter 500 tnum | 0.75rem | 1 | 0.02em |
Telas grandes: `html { font-size: 16px }`, 20px a partir de 2560, 28px a partir de 3840 (tudo em rem escala junto). Medida máxima de texto: 62ch. Títulos com `text-wrap: balance`; es/pt podem ser 30% mais longos.

### 2.2 Extensão (px fixos, densidade)
| Token | Uso | Tamanho/entrelinha | Peso |
|---|---|---|---|
| `--pv-ui-11` | cota, selo, atalho | 11/16 | Inter 500 tnum |
| `--pv-ui-12` | rótulo, cabeçalho de tela, item de lista | 12/16 | Inter 500 |
| `--pv-ui-13` | texto padrão | 13/20 | Inter 400 |
| `--pv-ui-14` | botão, título de painel | 14/20 | Inter 600 |
| `--pv-ui-16` | título de seção | 16/22 | Sora 600 |
| `--pv-ui-20` | título de estado vazio, cartão de bloqueio | 20/28 | Sora 600 |
| `--pv-ui-24` | boas-vindas | 24/32 | Sora 700 |

## 3. Espaçamento e grade
Base 4 px: `--pv-space-0` 0 · `-1` 2 · `-2` 4 · `-3` 6 · `-4` 8 · `-5` 12 · `-6` 16 · `-7` 20 · `-8` 24 · `-9` 32 · `-10` 40 · `-11` 48 · `-12` 64 · `-13` 80 · `-14` 96 · `-15` 128 · `-16` 160 (px).
- Landing: `--pv-section-y` clamp(6rem, 4rem + 8vw, 12rem); margem lateral clamp(1.25rem, 4vw, 4rem); conteúdo máx. 1440 px (texto), palco máx. 1680 px.
- Extensão: barra 48 · biblioteca 240 (trilho 56) · painel 280 · cabeçalho de tela 28 · régua 24 · dock 44 · espaço entre telas 32 · padding de painel 16 · alvo mínimo 32 em controle denso, 44 no popup e em botões primários.

## 4. Forma: chanfro de 45° é a assinatura
| Token | Valor | Onde |
|---|---|---|
| `--pv-cut-xs` | 3px | chips, selos, bandeiras da régua |
| `--pv-cut-sm` | 6px | botões secundários, cartões de modo (só canto superior direito) |
| `--pv-cut-md` | 8px (hover 12px na landing) | botão primário, toast, mini barra, cartão de bloqueio |
| `--pv-cut-lg` | 16px | painéis de cena, molduras genéricas da landing |
| `--pv-cut-xl` | clamp(16px, 2vw, 32px) | janela da hero |
| `--pv-radius-xs` | 2px | barras de progresso, marcadores |
| `--pv-radius-sm` | 4px | inputs, selects, botões de ícone, itens de lista |
Variantes de chanfro: **completo** (4 cantos, como a viewport do símbolo) · **janela** (superior esquerdo, superior direito, inferior esquerdo; inferior direito reto, como a janela do símbolo; só em contêineres grandes) · **dente** (só superior direito). Nunca misturar raio e chanfro no mesmo componente. Sem pílulas, sem raios grandes.

Implementação (o clip-path cortaria o anel de foco):
```css
.pv-cut { position: relative; isolation: isolate; background: none; }
.pv-cut::before { content: ""; position: absolute; inset: 0; z-index: -1; background: var(--fill);
  clip-path: polygon(var(--c) 0, calc(100% - var(--c)) 0, 100% var(--c), 100% calc(100% - var(--c)),
    calc(100% - var(--c)) 100%, var(--c) 100%, 0 calc(100% - var(--c)), 0 var(--c)); }
.pv-cut:focus-visible::after { content: ""; position: absolute; inset: -3px; z-index: -2; background: var(--pv-focus);
  clip-path: /* mesmo polígono com --c + 1.25px */; }
```
Borda de 1 px em elemento chanfrado: duas camadas (`::after` na cor da borda com o polígono cheio, `::before` com `inset: 1px` na cor do fundo). Ícones próprios desenhados na grade 24 com chanfros de 45°.

## 5. Elevação, sombra e luz
- Escuro: elevação por tom de superfície + filete superior `inset 0 1px 0 rgba(244,248,252,.04)`. Popover/menu: `0 12px 32px -8px rgba(0,0,0,.6), 0 0 0 1px var(--pv-line)`. Mini barra e toast: `0 8px 24px -6px rgba(0,0,0,.55)`.
- Claro: `--pv-shadow-1` 0 1px 2px rgba(8,13,20,.08) · `--pv-shadow-2` 0 8px 24px -8px rgba(8,13,20,.18).
- Laser (único brilho permitido): `0 0 0 1px var(--pv-cyan), 0 0 10px rgba(0,229,255,.35)` só na guia de redimensionar ativa, na linha do comparador e no CTA em hover. Nunca em texto nem no logo.
- Luz de mesa (landing): radial-gradient elíptico `--pv-lamp` sob a tela ativa da cena, 1 por vez.
- Sombra seca das molduras na landing: `0 40px 60px -30px rgba(0,0,0,.7)` deslocada para baixo, sem cor.

## 6. Movimento
### 6.1 Curvas
| Token | Curva | Uso |
|---|---|---|
| `--pv-ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | entradas e saídas de interface |
| `--pv-ease-in-out` | cubic-bezier(0.65, 0, 0.35, 1) | movimento na tela, gaveta, trilho |
| `--pv-ease-hover` | cubic-bezier(0.2, 0, 0, 1) | hover, cor |
| `--pv-ease-expo` | cubic-bezier(0.16, 1, 0.3, 1) | revelações da landing (GSAP `expo.out`) |
| `--pv-ease-cut` | cubic-bezier(0.7, 0, 0.2, 1) | chanfros, máscaras diagonais, construção do símbolo (GSAP CustomEase "cut": `M0,0 C0.7,0 0.2,1 1,1`) |
| linear | linear | progresso, indicador de carregamento, rolagem automática |
Nunca ease-in sozinho em interface. Molas (cursor da landing, alça da hero): rigidez 400, amortecimento 40, sem quique.

### 6.2 Durações
| Token | Valor | Uso |
|---|---|---|
| `--pv-dur-press` | 100ms | :active scale(.97) |
| `--pv-dur-fast` | 140ms | hover, toggle, cor |
| `--pv-dur-base` | 200ms | tooltip (1º com 400 ms de atraso), dropdown, toast (entra) |
| `--pv-dur-exit` | 120ms | saídas |
| `--pv-dur-panel` | 260ms | gaveta, trilho da biblioteca, dessaturar tela congelada (240) |
| `--pv-dur-reveal` | 700ms | revelação de cena (landing) |
| `--pv-dur-scene` | 1200ms | troca de forma entre cenas fora do scrub |
| `--pv-dur-intro` | 1600ms | entrada da landing |
| `--pv-dur-wipe` | 900ms | virada claro/escuro diagonal |
Sequências: 40 ms entre itens, sem bloquear a interação. Scroll: Lenis `lerp 0.1`; ScrollTrigger `scrub: 0.6`. Ações por teclado, redimensionar e zoom: 0 ms (1:1).

### 6.3 Reduced-motion (`prefers-reduced-motion: reduce`)
Mantém opacidade e cor (crossfade de 200 ms); remove translate, scale, rotate, pin, parallax, Lenis, rolagem suave e WebGL animado. Pulso de gravação vira ponto fixo; indicador de carregamento vira texto com opacidade. Gestos do usuário (arrastar alça, comparador, redimensionar) continuam 1:1. A rolagem automática do vídeo é função, não decoração: continua, com velocidade ajustável. Respeitar também `prefers-reduced-transparency` (mini barra opaca) e `forced-colors` (bordas com `CanvasText`, chanfros viram retângulos).

## 7. Breakpoints
360 · 414 · 768 · 1024 · 1440 · 1920 · 2560 · 3840 (mobile-first, `min-width`). Extensão: a janela do Estúdio abaixo de 1280 recolhe a biblioteca em trilho; abaixo de 900 vira 1 coluna com painel de captura como gaveta inferior e botão Capturar fixo. Landing: régua lateral e cursor de cota a partir de 1024 com `(pointer: fine)`; WebGL a partir de 768 com `(pointer: fine)` ou GPU ok, nunca com Save-Data.

## 8. Componentes da extensão
- **Botão**: primário (ciano, chanfro md, 44 px no painel/popup, 32 px na barra) · secundário (fundo raised, borda line-strong, raio sm) · fantasma (só texto, hover bg-hover) · ícone (32×32, raio sm, rótulo em tooltip e aria-label). Pressionado .97. Carregando: o próprio botão vira barra de progresso.
- **Campo**: 32 px (barra) / 40 px (estado vazio, popup), raio sm, borda line-strong, foco anel 2 px focus + 2 px de afastamento.
- **Alternador** (Espelhar, escuro por tela): trilho 28×16 raio xs, polegar quadrado chanfrado; ligado = ciano + rótulo de estado.
- **Cartão de modo** (rádio): chanfro dente, título 14/600, linha de explicação 12 text-2; selecionado = borda accent 1 px + marca de corte no canto.
- **Tela**: cabeçalho 28 px + iframe + 4 marcas de corte (L 10 px, traço 1,5 px, afastamento 6 px). Estados: ativa (marcas e nome accent), inativa (text-3), congelada (dessaturada, chip "Pausada", botão Ativar), carregando, bloqueada, rolagem lateral (fio warning 2 px à direita + chip).
- **Régua**: 24 px, traço 10/50/100 px com alturas 4/8/12, números a cada 100 em ui-11; bandeira chanfrada xs por tela; guia de redimensionar = laser.
- **Indicador de carregamento**: octógono do ícone em line, segmento accent de 25% do perímetro girando 1,2 s linear.
- **Mini barra de gravação**: 40 px, chanfro md, graphite 94% + blur 12 px, ponto danger 8 px, tempo tnum, botões de ícone, alça de arrasto à esquerda.
- **Fila / dock**: item 44 px, nome, etapa em text-2, barra 2 px radius-xs, Cancelar.
- **Toast**: chanfro md, raised, ícone de estado + texto + até 2 ações, entra 8 px de baixo (200 ms), sai 120 ms, aria-live polite (erro: assertive).
- **Cartão de bloqueio/permissão**: máx. 320 px, centralizado na tela, raised, borda line, ícone text-2 24 px, título ui-20, corpo ui-13 text-2, ações empilhadas.
- **Ícones**: Lucide (MIT) 16/20 px, traço 1.75, `stroke-linejoin: miter`, `stroke-linecap: square`. Próprios (grade 24, chanfro 45°): espelhar, girar tela, cota, moldura, momentos, rolagem lateral, pausada, kit.

### 8.1 Molduras e componentes da construção
**Molduras do Print com moldura** (`packages/ui/src/frames/`, manifesto em `frames.json`). Genéricas: sem entalhe, sem ilha, sem botões de fabricante, sem logos. Assinatura: corpo chanfrado a 45° (filete superior de luz, contorno de 2 unidades em `line`), anel interno em `chrome`/`hover` em volta da tela. Arquivos `frame-<aparelho>-<dark|light>.svg`; unidades do viewBox = px CSS do aparelho a 1x (exportar a 2x/3x multiplicando tudo).
| Aparelho | viewBox (L × A) | `#screen` x, y, w, h | Proporção da tela | Chanfro do corpo |
|---|---|---|---|---|
| `phone` | 422 × 876 | 16, 16, 390, 844 | 9:19,5 | 28, 4 cantos |
| `foldable` (aberto) | 768 × 864 | 16, 16, 736, 832 | 23:26 (2 folhas de 368) | 28, 4 cantos; dobra em x 384 |
| `tablet` | 824 × 1080 | 28, 28, 768, 1024 | 3:4 | 36, 4 cantos |
| `notebook` | 1688 × 1000 | 124, 28, 1440, 900 | 16:10 | 28, só superiores (tampa); base trapezoidal |
| `monitor` | 1968 × 1318 | 24, 24, 1920, 1080 | 16:9 | 32, 4 cantos; pé em T |
| `browser` | 1444 × 962 | 2, 48, 1440, 900 | 16:10 | 20, variante janela (inferior direito reto) |
Contrato do compositor (sem ambiguidade):
1. Ordem de pintura: fundo → sombra seca → SVG da moldura **sem** `#overlay` → print no retângulo `#screen` → `#overlay` (só `foldable`: dobra de 1 unidade a 14%/12% de opacidade).
2. Encaixe: print escalado pela largura do `#screen` (`scale = w / larguraDoPrint`), alinhado ao topo, recortado na altura do `#screen` (print de página inteira usa só a 1ª dobra; aparelho girado usa a mesma moldura rotacionada 90° com `#screen` trocado para h × w). A tela é retangular: sem recorte extra.
3. A área também vem no atributo `data-screen="x y w h"` da raiz e em `frames.json` (`frames.<id>.screen`). `browser` tem `#address` (campo de endereço; texto opcional do domínio em Inter 500 13 un., `text-2`, a partir de `data-text-x`/`data-text-y`).
4. Tema da moldura: `dark` = corpo `#141D29`, contorno `#304256`, tela vazia `#080D14`; `light` = corpo `#F4F8FC`, contorno `#CBD6E1`, tela vazia `#FFFFFF`. Padrão: moldura segue o tema da tela ativa (escuro por tela ligado = `dark`).
5. Sombra seca (canvas): `shadowColor rgba(0,0,0,.55)` no escuro / `rgba(8,13,20,.22)` no claro, `shadowOffsetY = 4%` da altura da moldura, `shadowBlur = 6%`; nunca colorida, nunca brilho.
6. Margem do fundo em volta da moldura: 12% do maior lado da moldura; saída final arredondada para pares.

**Fundos editáveis** (`bg-<id>.svg`, viewBox 1920 × 1200, `preserveAspectRatio="xMidYMid slice"`: cobre qualquer proporção sem esticar). Editar = trocar `fill` de `#bg` e, se quiser, `opacity` ou `display:none` de `#grid` (grade de base de corte 64 un., cruz a cada 512, guias de 45° nos cantos).
| Id | `#bg` | Grade | Moldura recomendada |
|---|---|---|---|
| `night` | #080D14 | #F4F8FC a 5% | `light` (ou `dark` com contorno visível só por perto: evitar como padrão) |
| `ice` (padrão) | #E8EEF4 | #080D14 a 6% | `dark` ou `light` |
| `petrol` | #007D8A | #F4F8FC a 10% | `dark` ou `light` |
Mais duas opções na interface: **Cor** (seletor livre, aplica em `#bg`, grade desligada) e **Transparente** (sem fundo, PNG com alfa, sombra mantida). Nunca degradê.

**Slot-fantasma da grade** (fim da bancada, ux §7.5):
- Mesmo tamanho da última tela adicionada (mín. 240 × 320 px, máx. 390 × 844 no zoom atual); se a bancada ficar vazia, vira o grande: 480 × 320 centralizado com a frase "Adicione uma tela para começar" em ui-13 `text-2`.
- Corpo: fundo transparente, borda tracejada 1,5 px `line` (traço 6, vão 6) desenhada em SVG com `vector-effect: non-scaling-stroke` e chanfro **completo** `--pv-cut-md`; as 4 marcas de corte da tela (L 10 px, traço 1,5 px, afastamento 6 px) em `line-strong`. Sem cabeçalho de 28 px: no lugar dele, espaço vazio do mesmo tamanho para alinhar com as telas.
- Centro: ícone próprio "+" (grade 24, hastes de 1,75 px com pontas a 45°) em `text-2` e rótulo "+ Adicionar tela" ui-13/500 `text-2`; abaixo, dica ui-11 `text-3` "ou arraste da biblioteca".
- Hover (fino) e foco: borda e marcas passam a `accent-text`, fundo `bg-hover` a 40%, tracejado anda 12 px em 600 ms linear uma vez (o "laser" mede o espaço); 140 ms `--pv-ease-hover`. Foco: anel padrão 2 + 2 px seguindo o chanfro. Pressionado .97 (100 ms). Alvo inteiro clicável (`<button>`), nome acessível "Adicionar tela".
- Arrastar da biblioteca sobre o slot: borda vira contínua `accent`, `--pv-lamp` a 8% embaixo. Reduced-motion: tracejado não anda; só troca de cor.
- Claro: borda `line` #CBD6E1 fica abaixo de 3:1, por isso o tracejado usa `line-strong` nos dois temas e as marcas usam `text-3`.

**Interruptor "Print com moldura" com miniatura** (linha do painel de captura, 280 px):
- Desligado (1 linha, 44 px): alternador §8 (trilho 28 × 16, polegar quadrado chanfrado xs) + rótulo "Print com moldura" ui-13/500 `text`; à direita, miniatura apagada (opacidade .45, sem fundo). `role="switch"`, `aria-checked`, rótulo clicável.
- Ligado: trilho `accent`, polegar `on-accent`, rótulo de estado ui-11 `accent-text` ("Ligado"). A linha expande (260 ms `--pv-ease-in-out`, só altura via grid-template-rows 0fr→1fr; reduced-motion: sem animação) e mostra, abaixo, 2 controles de 32 px: **Aparelho** (nome + "Trocar", fantasma) e **Fundo** (4 amostras quadradas 20 px chanfro xs: Gelo, Noite, Petróleo, Cor; 5ª amostra Transparente com xadrez 4 px `line-soft`; selecionada = contorno 1 px `accent` + 2 px de afastamento).
- Miniatura: 56 × 56 px, chanfro dente `--pv-cut-sm`, fundo = fundo escolhido, moldura escolhida dentro com 10% de margem, tela com o último quadro da tela ativa (ou `bg-mat` se ainda não houver). Borda 1 px `line`. Ao trocar aparelho ou fundo: crossfade de 140 ms entre a miniatura antiga e a nova (nunca escala); reduced-motion igual (só opacidade). Clicar na miniatura abre a prévia em tamanho real num popover (`--pv-dur-base`).
- Teclado: Espaço alterna; Tab vai a Aparelho, depois às amostras (setas escolhem, rádio). Leitor de tela anuncia "Print com moldura, ligado, celular, fundo Gelo".

## 9. Componentes da landing
- **CTA da loja**: chanfro md (hover 12 px + fio ciano no contorno 280 ms), Sora 600 1rem, altura 52 px (desktop) / 48 px (celular), rótulo sem largura fixa. Secundário: link com sublinhado de 1 px que cresce da esquerda.
- **Janela elástica**: chanfro xl variante janela, borda 1 px line, barra superior de 32 px com três traços curtos (genéricos, não os semáforos do macOS), cota acima, alça vertical de 4×40 px na borda direita (área de toque 44).
- **Molduras genéricas**: celular (proporção 9:19,5, chanfro lg, sem entalhe, sem botões laterais), dobrável (duas folhas com dobra de 1 px), tablet (3:4), notebook (tela 16:10 + base trapezoidal em linha), monitor (16:9 + pé em T). Tudo em line/graphite, nenhuma referência a fabricante.
- **Cota**: linha de 1 px com terminais a 45°, número tnum no meio sobre o fundo.
- **Régua de rolagem**: fixa à direita, 32 px, traços a cada 100 px de página, bandeiras das 8 cenas (botões com aria-label da cena).
- **Cartão de permissão (cena 6)**: chanfro dente, cabeçalho em cota com o nome técnico da permissão, texto do copy, "por quê" expansível (botão com aria-expanded).
- **Bloco de código (cena 7)**: Inter tnum 0.875rem sobre graphite, numeração de linha text-3, caret ciano.
- **Rodapé**: logo horizontal ≥180 px, links, "Desenvolvido por Fonte Dev · Bruno Lucas" com link para https://fontedev.com.

## 10. Logo e ícone
- Arquivos: `02-logos` (SVG em curvas) e `03-icones` (PNG 16 a 1024, favicon.ico). Manifest: 16/32/48/128 do kit.
- Mínimos: horizontal 180 px · vertical 140 px · símbolo 32 px. Entre 16 e 24 px use **somente** a redução óptica do kit (icone-16/19/20/24.png). Para SVG na barra do Estúdio (20 px), use a geometria óptica do `gerar-kit.py` sem o quadro de fundo: `<path d="M2 3H14V6H12V5H4V11H7V13H2Z M9 7H14V14H9Z M11 9V12H12V9Z" fill-rule="evenodd"/>` em viewBox 16, cor accent.
- Proteção: espessura de uma haste em volta (12/128 do tamanho do símbolo, cerca de 9,4%).
- Cor: ciano #00E5FF em fundo escuro; petróleo #007D8A em fundo claro; branco/preto do kit em fundos de foto. Nunca ciano em fundo claro.
- Proibido: sombra, brilho, 3D, contorno extra, deformação, recolorir, mexer nos recortes. A animação de construção na landing termina na geometria exata e é um elemento de marca, não o logo funcional.
- Ícone da extensão: sempre com a base escura incorporada (octógono acima de 24 px, quadrado raio 3 nos ópticos).
- Grafia: "Neruz Page View" (nunca "Neros"); "Page View" em destaque, "NERUZ" em caixa alta espaçada acima.
