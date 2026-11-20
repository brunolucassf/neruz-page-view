# Arquitetura: Neruz Page View (Neruz Extensions)

Data-base: 2026-11-20. Perfil ADVANCED. Sem servidor, sem banco, sem rede própria. Decisões e alternativas em [DECISOES.md](DECISOES.md). Regras de segurança obrigatórias em `.equipe/briefs/seguranca.md` (este documento as respeita; a única exceção proposta está na ADR-011).

## 1. Resumo

Extensão Manifest V3 que abre qualquer site (inclusive localhost) em várias "telas" (iframes dimensionados) dentro de uma página própria da extensão, o **Estúdio**. Content scripts em cada frame espelham interação, preparam a página (aquecimento) e informam seções. A captura de imagem é feita por `tabs.captureVisibleTab` do próprio Estúdio, recortada e costurada; o vídeo vem da captura da aba do Estúdio (tabCapture no Chromium, getDisplayMedia no Firefox) e é codificado localmente com WebCodecs + Mediabunny. Tudo roda no dispositivo, em Web Workers quando pesado.

Monorepo pnpm com núcleo compartilhado para as próximas extensões Neruz e uma landing estática (Astro) com 3D e scroll coreografado.

## 2. Stack e versões (verificadas em nov/2026)

Versões exatas são fixadas no scaffold com `pnpm view <pacote> version` e gravadas sem `^` (regra de segurança 14).

| Camada | Escolha | Versão-alvo | Observação |
|---|---|---|---|
| Runtime de dev | Node.js LTS | 24.x | WXT 0.21 e Astro 7 exigem Node >= 22 |
| Pacotes / monorepo | pnpm workspaces | 12.x (12.17 em out/2026) | Sem Turborepo na v1 (ADR-003) |
| Framework de extensão | WXT | 0.21.x (0.21.5, 26/10/2026) | Vite, web-ext e TypeScript são peer deps; exige Vite >= 6.3.4 |
| Bundler | Vite | 8.x (se a faixa de peer do WXT aceitar; senão 7.x) | Conferir no scaffold |
| Linguagem | TypeScript | 6.x para ferramentas; 7.0 (Go, jul/2026) só para `tsc --noEmit` quando estável no WXT | TS 7 ainda sem API programática estável (prevista 7.1) |
| UI da extensão | React + React Compiler | 19.2.x | ADR-002 |
| Estado da UI | Zustand | 5.x | Store por domínio (telas, captura, configurações) |
| Primitivas acessíveis | React Aria Components | 1.x | Foco, teclado, diálogos, menus, sliders |
| Validação de schema | Valibot | 1.x | Import/export, mensagens, storage (regra 11) |
| Vídeo | WebCodecs + Mediabunny | 1.x | Mux MP4/WebM (~16 kB por writer, tree-shakable). mp4-muxer está descontinuado |
| GIF | gifenc (em Worker) | 1.x | Paleta por quadro; limite de tamanho |
| PDF | jsPDF (carregado sob demanda) | 3.x | Só imagens paginadas + relatório |
| ZIP | fflate (streaming, Worker) | 0.8.x | Também lê ZIP no import |
| Landing | Astro (estático) + Three.js + GSAP/ScrollTrigger + Lenis | Astro 7.x (Vite 8), Three r18x, GSAP 3.13+ | ADR-008. Saída estática, serve em qualquer hospedagem |
| Testes unitários | Vitest | 4.1.x | happy-dom; Browser Mode para Canvas/OffscreenCanvas |
| Testes e2e | Playwright (Chromium com `--load-extension`) | 1.5x | Firefox: `web-ext lint` + roteiro manual (ADR-009) |
| Lint/format | Biome | 2.x | Regra customizada/grit proíbe `innerHTML`, `eval`, `new Function` |

Validação da infraestrutura de Bruno: a extensão não usa servidor. A landing é HTML estático (Astro `output: 'static'`), servível pela hospedagem compartilhada/estática da Hostinger, sem Node em produção. Nenhum deploy sem "pode publicar".

## 3. Componentes e onde roda cada coisa

```
                  ┌───────────── Navegador do usuário ─────────────┐
 clique no ícone  │  action.onClicked ─▶ Service worker / event page│
 ou atalho        │   (sem popup)          abre/foca o Estúdio,     │
 ──────────────▶  │   │                    DNR, permissões, msgs    │
                  │   ▼                                             │
                  │  ESTÚDIO (aba chrome-extension://.../studio)    │
                  │   ├ iframe tela 1 ─ content script (isolado)    │
                  │   ├ iframe tela 2 ─ content script (isolado)    │
                  │   ├ Workers: costura, encode, GIF, ZIP, PDF     │
                  │   └ captureVisibleTab / tabCapture / gDM        │
                  │  Offscreen (só Chromium): gravar aba comum      │
                  └─────────────────────────────────────────────────┘
```

| Superfície | Papel | Notas |
|---|---|---|
| **Estúdio** (`entrypoints/studio`, página HTML da extensão aberta em aba) | Aplicação principal: grade de telas, toolbar, biblioteca, captura, mockups, relatório, exportação | Não usa side panel: estreito demais para várias telas e inexistente no Firefox (que tem `sidebar_action`, outra API). Exportação por `<a download>` com Blob URL (sem permissão `downloads`) |
| **Ícone da extensão** (sem popup, ADR-016) | Clique ou atalho `_execute_action` abre o Estúdio com a URL da aba atual, já pedindo a permissão daquela origem no mesmo gesto; reaproveita o Estúdio daquela aba; página não suportada abre o Estúdio vazio com aviso. Sobre um Estúdio armado, o clique inicia (ou para) a gravação | Algoritmo em API.md §6.5. Idioma e demais opções ficam nas configurações do Estúdio |
| **Background** (`entrypoints/background`) | Service worker no Chromium, event page (scripts) no Firefox, gerado pelo WXT | Fino e sem estado em memória que precise sobreviver: estado persistido em `storage.session`. Funções: `action.onClicked` (abrir/focar Estúdio, gesto de gravação), criar/limpar regras DNR por aba do Estúdio, validar e rotear mensagens, ciclo de vida do offscreen |
| **Content script `frame-agent`** (isolado, registrado dinamicamente) | Em cada frame de origem autorizada: espelhamento, aquecimento, detecção de seções, rolagem para captura, ocultar fixos, aviso de rolagem lateral, emulação de reduzir movimento via CSSOM | Inerte fora do Estúdio: em `window.top === window` sai na hora; em subframe pergunta ao background (`frame.hello`), que responde com base em `sender.tab.id` pertencer ao conjunto de abas do Estúdio |
| **Script `frame-env`** (world MAIN, opcional, ADR-011) | Sobrescrever `matchMedia('(prefers-reduced-motion)')`, `navigator.userAgent/userAgentData/maxTouchPoints` | Lê configuração só de `window.name` (definido pelo atributo `name` do iframe). Não escuta eventos, não envia mensagens, não acessa API de extensão. Desligado por padrão até aprovação do security-engineer |
| **Offscreen document** (só Chromium, `reasons: ['USER_MEDIA']`) | Toda gravação Chromium (Estúdio e aba comum) com o stream de `tabCapture.getMediaStreamId`: recorte, composição, encode e mux | Provado no P4. Início por gesto: clique em "Gravar" no Estúdio se o navegador aceitar, senão clique no ícone/atalho com o Estúdio armado em primeiro plano (ADR-015, ADR-016); resultado volta ao Estúdio por `blobUrl` |
| **Workers** (dentro do Estúdio) | `stitch.worker`, `video.worker` (VideoEncoder + Mediabunny), `gif.worker`, `zip.worker`, `pdf` sob demanda | Transferência com `ImageBitmap`/`VideoFrame` transferíveis; nada de base64 |

### 3.1 Abrir sites em iframe

1. Usuário digita URL no campo do topo do Estúdio (troca de site a qualquer momento) ou vem da aba atual pelo clique no ícone (`bg.studio.launch`/`ui.openUrl`; a permissão da origem já foi pedida no gesto, ADR-016). Estúdio verifica `permissions.contains({origins:[origem]})`; se faltar, mostra cartão explicativo com botão que chama `permissions.request` (gesto do usuário). Opção "permitir todos os sites" pede `http://*/*` e `https://*/*` de uma vez.
2. Com permissão, o Estúdio pede ao background `dnr.enable({tabId})`. O background cria **regras de sessão** (`updateSessionRules`) com `condition: { tabIds:[tabIdDoEstudio], resourceTypes:['sub_frame'] }` e `action: modifyHeaders` removendo `x-frame-options`, `content-security-policy` e `content-security-policy-report-only` da resposta. `tabIds` só existe em regras de sessão, o que é desejado: somem ao reiniciar o navegador. Limpeza em `tabs.onRemoved` (evento não exige permissão `tabs`), ao fechar o Estúdio e no startup do worker.
3. Permissão usada: `declarativeNetRequestWithHostAccess` (sem aviso na instalação; age só em hosts concedidos). `declarativeNetRequest` não pode ser opcional e gera aviso, por isso não é usado.
4. Background registra `frame-agent` via `scripting.registerContentScripts` com `matches` = origens concedidas, `allFrames: true`, `matchOriginAsFallback: true`, `runAt: 'document_start'`. Atualiza a lista em `permissions.onAdded/onRemoved`.
5. Iframe: `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock"` (sem `allow-top-navigation`, impede frame-busting), `allow="fullscreen; clipboard-write; autoplay"`, `name="npv:<screenId>.<presetId>"` (só IDs, regras 18 e 19 de segurança; formato em API.md §3.1), `style="color-scheme: dark|light"` por tela.
6. Detecção de bloqueio para mensagem amigável: timeout de `frame.hello` + evento `load` + tentativa de leitura de `contentWindow.length`; casos: login com cookie SameSite (ver risco R4), site que exige top-level, `file://` sem acesso a arquivos, página interna do navegador.

### 3.2 Emulação por tela

| Aspecto | Como | Precisa de chrome.debugger? |
|---|---|---|
| Largura/altura (media queries de largura, vh, vw) | Tamanho real do iframe em px CSS; zoom visual do Estúdio por `transform: scale()` no contêiner | Não |
| Device pixel ratio (nitidez da saída) | Zoom por aba do Estúdio (`tabs.setZoomSettings({scope:'per-tab'})` + `setZoom`) durante a captura, para o DPR efetivo chegar ao do aparelho; OOPIFs herdam o zoom do frame principal. Prova obrigatória no PoC | Sim para DPR independente por tela; não adotado |
| `prefers-color-scheme` | Nativo: o documento do iframe segue o `color-scheme` do elemento iframe (Chrome e Firefox) | Não |
| `prefers-reduced-motion` em CSS | `frame-agent` reescreve `CSSMediaRule.media` nas folhas acessíveis; folhas cross-origin são buscadas com a permissão de host e reinjetadas como `<style>` | Não |
| `prefers-reduced-motion` em JS (GSAP matchMedia, framer-motion) | `frame-env` (MAIN, ADR-011) | Não |
| User-Agent em JS | `frame-env` por tela | Não |
| User-Agent no cabeçalho HTTP | DNR `modifyHeaders` de requisição por `tabIds` vale para a aba inteira, não por frame. Padrão: não altera. Modo "Tela única fiel" abre uma tela sozinha numa aba de Estúdio própria e aí aplica o UA móvel no cabeçalho | Sim para por frame; não adotado |
| `pointer: coarse` / `hover: none` / toque | Não emulável sem debugger. Documentado como limite; o clique espelhado basta para a revisão visual | Sim; não adotado |
| `env(safe-area-inset-*)`, notch, barra do navegador | Desenhados pelo Estúdio como moldura; a altura útil do iframe desconta a barra do navegador do aparelho | Parcial; não adotado |

Decisão (ADR-005): **não usar `chrome.debugger`**. Ela não pode ser opcional no Chrome, mostra a barra amarela "está depurando este navegador" e pesa na revisão. O ganho (DPR e toque por tela, captura além da viewport) não paga o custo de confiança.

### 3.3 Espelhamento

- Fonte da verdade: o frame em que o usuário interage (evento `isTrusted`). O `frame-agent` emite eventos normalizados ao background por `runtime.Port`; o background repassa ao Estúdio, que decide destinos e envia via `tabs.sendMessage(tabId, msg, {frameId})`. Nada de `window.postMessage`.
- Scroll: por âncora, não por pixel. Mensagem leva `{anchorSelector, offsetRatioDentroDaAncora, pageRatio}`; o destino localiza a mesma seção (alturas diferem entre larguras) e cai para `pageRatio`. Limite de 60 msg/s com rAF; trava de eco por `originFrameId` + janela de 150 ms.
- Clique: seletor estável (id, data-*, aria, caminho nth-of-type curto) + ponto relativo no elemento; destino faz `element.click()` ou `PointerEvent` sintético. Limite conhecido: eventos sintéticos têm `isTrusted=false` (alguns sites ignoram).
- Navegação: `navigation` API (`currententrychange`) com fallback de checagem de `location.href`; o Estúdio navega as demais telas para o mesmo caminho.
- Digitação: só entre frames de mesma origem, nunca campos password/cartão/OTP/`autocomplete` sensível (regra 7). Define `value` e dispara `input`/`change`.

### 3.4 Desempenho

Limite padrão de 8 telas ativas (configurável até 16 com aviso). Tela fora da área visível por mais de 10 s é **congelada**: o Estúdio guarda um snapshot (`ImageBitmap`) e troca o iframe por `about:blank`; volta ao entrar na área. Lotes de captura e de várias páginas em fila serial (uma tela por vez capturando). `content-visibility: auto` nas tiles. Nenhum trabalho pesado na thread do Estúdio.

## 4. Motor de captura

### 4.1 Print

Primitiva única: `tabs.captureVisibleTab` do Estúdio (limite de 2 chamadas por segundo, controlado por uma fila com token bucket), recorte pelo `getBoundingClientRect` do iframe e montagem em `OffscreenCanvas` no `stitch.worker`.

| Modo | Algoritmo |
|---|---|
| Rápido | Rola por viewport, captura, oculta `position: fixed/sticky` a partir do segundo trecho, costura. Sem espera além de `fonts.ready` e decode das imagens visíveis |
| Experiência | Aquecimento: rola devagar até o fim em passos de 0,5 viewport, em cada passo espera estabilidade (sem mutação de DOM por 300 ms, `document.getAnimations()` concluídas ou em loop infinito, imagens `complete` + `decode()`, sem novos recursos em `PerformanceObserver` por 500 ms, teto de 4 s por passo). Volta ao topo, repete a costura com a página já "revelada". Bibliotecas de smooth scroll (Lenis, Locomotive) são tratadas com `scrollTo` instantâneo + evento `scroll` + espera |
| Momentos | Detecta seções (landmarks, `section`, filhos diretos de `main` com altura >= 40% da viewport, limitado a 30) e captura uma imagem de viewport por seção após a estabilidade; cada imagem é um "momento" |
| Área | Seleção retangular sobre a tile; recorte do quadro |
| Todas as telas | Fila sequencial por tela; resultado vai para mockups/ZIP |

**Print com moldura** (nome aprovado por Bruno, P16; antes "print bonito"): opção do painel de captura do Estúdio, aplicada ao print da tela aberta (não existe mais print de aba comum fora do Estúdio, ADR-016). Mockup: composição em `OffscreenCanvas` com molduras SVG próprias (sem arte oficial de fabricante), fundo editável (cor, gradiente, imagem do usuário). Exportação PNG, JPEG, WebP via `convertToBlob`.

Tamanho máximo de canvas (~16k px de altura no Chromium; limites de área): páginas mais longas são divididas em partes numeradas, nunca truncadas em silêncio.

### 4.2 Vídeo

1. Fonte: Chromium usa `tabCapture` (permissão opcional) para a aba do Estúdio, sempre via offscreen, iniciado por gesto com a gravação armada no Estúdio: o próprio clique em "Gravar" se o navegador aceitar, senão clique no ícone/atalho sobre o Estúdio (ADR-015, ADR-016, fluxo em API.md §6.3). Gravar com um clique só a partir da página do site não é possível: o `activeTab` desse clique vale para a aba do site, não para o Estúdio; Firefox usa `getDisplayMedia` no próprio Estúdio (o usuário escolhe a aba no seletor do navegador).
2. Modo gravação: o Estúdio mostra só a tela escolhida, sem chrome de UI, oculta a barra de rolagem do iframe, ajusta zoom por aba para a tela ocupar a maior altura física possível (para 1080 px nativos a tela precisa ocupar ~1080 px físicos no quadro; recomendado abrir o Estúdio em janela dedicada alta) e executa o roteiro de scroll automático (seções detectadas, velocidade, pausas manuais pela mini barra) dentro do `frame-agent`.
3. Pipeline: `MediaStreamTrackProcessor` (Chromium, no offscreen) ou `requestVideoFrameCallback` em `<video>` (Firefox) produz `VideoFrame`; recorte por escala+centralização (o quadro do tabCapture traz a aba escalada e centralizada) e encaixe em 1080×1920 ou 1920×1080 com composição de fundo/mockup em `OffscreenCanvas`; leitura com teto e repetição do último quadro até a duração pedida; `VideoEncoder` (H.264 `avc1` para MP4, VP9 para WebM) e Mediabunny faz o mux. Cursor opcional desenhado por cima a partir das posições do `frame-agent`.
4. Fallback: se `VideoEncoder` não suportar H.264 no navegador/SO, oferece WebM e explica; `MediaRecorder` fica como plano C.
5. GIF: re-decodifica o vídeo final, reduz para até 720 px de largura e 15 fps, `gifenc` no worker, limite de 30 s com aviso.

Rejeitado: ffmpeg.wasm (núcleo ~30 MB, lento sem multithread e o multithread exige isolamento cross-origin, COOP/COEP, que quebra os iframes). Detalhe na ADR-006.

### 4.3 PDF, relatório e ZIP

- PDF: jsPDF carregado sob demanda; imagem longa fatiada em páginas A4/carta, ou página única "contínua".
- Relatório: HTML autocontido (imagens embutidas) e PDF. Só fatos: URL, data, telas, dimensões, tempo até estável, rolagem lateral detectada (elementos que passam da largura), páginas que bloquearam iframe. Rodapé fixo: "Capturas geradas automaticamente para apoiar sua revisão. Vale a conferência do profissional responsável pelo projeto." (traduzido nativamente).
- ZIP (fflate em streaming): `neruz-page-view_<host>_<AAAA-MM-DD_HHmm>/<pagina>/<tela>/{print,momentos,mockup,video}/...` + `relatorio.html`.
- Armazenamento temporário: OPFS do Estúdio; apagado após exportar e ao fechar o Estúdio (requisito de privacidade).

### 4.4 Várias páginas

Lista colada, `sitemap.xml` (fetch do Estúdio com permissão de host da origem, só mesma origem, até 5 MB, sitemaps aninhados até 2 níveis) ou links internos lidos do DOM pelo `frame-agent`. Limite padrão de 25 páginas, máximo 100, timeout por página. Fila serial reutilizando o mesmo conjunto de telas.

## 5. Permissões (manifest)

| Chave | Valor | Aviso na instalação |
|---|---|---|
| `permissions` | `storage`, `scripting`, `activeTab`, `declarativeNetRequestWithHostAccess`, `offscreen` (só build Chromium) | Nenhum |
| `optional_permissions` | `tabCapture` (só Chromium), `clipboardWrite` | Pedido sob demanda |
| `optional_host_permissions` | `http://*/*`, `https://*/*` (cobre localhost) | Pedido por origem, com gesto |
| `host_permissions` | vazio | |
| `action` | ícone e título, **sem `default_popup`** (ADR-016) | |
| `commands` | só `_execute_action` (sugestão `Alt+Shift+P`), mesmo efeito do clique | |
| `contextMenus` | não usado na v1 (ADR-016) | |
| Proibidos | `debugger`, `tabs`, `webNavigation`, `cookies`, `history`, `downloads`, `unlimitedStorage`, `declarativeNetRequest`, `<all_urls>` obrigatório | CI compara com allowlist |
| CSP | `script-src 'self' 'wasm-unsafe-eval'` só se algum wasm entrar (hoje nenhum); `object-src 'self'` | |
| Firefox | `browser_specific_settings.gecko.id`, `data_collection_permissions: {required:["none"]}`; sem `offscreen`/`tabCapture` | |

Resultado: instalação sem nenhum aviso de permissão; o pedido de acesso acontece no primeiro site, explicado em uma frase.

## 6. Dados (alto nível)

Sem dados pessoais. `storage.local` via `storage.defineItem` do WXT, versionado com migrações:

- `settings` (idioma, tema da UI, limite de telas, atalhos, modos padrão de captura)
- `devices.custom[]`, `devices.favorites[]`, `kits[]` `{id, name, deviceIds[], orientation}`
- `captureDefaults` (formato, qualidade, mockup, fundo)
- Catálogo de aparelhos (Essenciais 12 + biblioteca ~45) **empacotado** em `packages/devices` como JSON tipado, nunca baixado.
- `storage.session`: `studioTabs[]`, regras DNR ativas, estado de gravação.

Export/import: JSON `{schema: 'neruz.pageview.settings', version, data}` validado com Valibot, máx. 1 MB. Schemas, versões, padrões e migrações de cada chave: [API.md](API.md) §7.

## 7. Contrato interno (resumo; a especificação congelada está em [API.md](API.md), v1.2 de 2026-11-20, ADR-014 e ADR-016)

Mensagens tipadas em `packages/core/messaging` como união discriminada no envelope `{v, type, frameId, seq, payload}` validada com Valibot no receptor; respostas `Reply` com erro tipado `NPV-*` e teto de tempo em todo pedido. Famílias:

- `frame.*` (frame-agent → background → Estúdio pela Port `npv-studio`): `hello`, `ready`, `stable`, `sections`, `scroll`, `click`, `navigate`, `input`, `overflow`, `autoscroll.ended`, `error`.
- `studio.*` (Estúdio → frame): `ping`, `metrics`, `measure`, `applyScroll`, `applyClick`, `applyInput`, `navigate`, `scrollTo`, `waitStable`, `warmup`, `hideFixed`, `restoreFixed`, `hideScrollbar`, `autoscroll.start|pause|resume|stop`, `emulate`.
- `bg.*` (Estúdio → background): `studio.enable|disable|launch`, `scripts.sync`, `frames.list`, `rec.arm|cancel|release`.
- `ui.*` (background → Estúdio pela Port, eventos): `openUrl`, `actionClicked`. Ícone e atalho entram por `action.onClicked`, sem mensagem.
- `rec.*` (background ↔ offscreen, eventos ao Estúdio): `start`, `stop`, `progress`, `started`, `done`, `failed`.
- Background rejeita `sender.id` diferente, `sender.tab.id` fora de `studioTabs` e `frame.hello` de `frameId 0`; mutações de DNR e registro de scripts numa fila serial única.

## 8. i18n

- Fonte única: `packages/i18n/locales/{pt-BR,en,es}.yml` com chaves por domínio (`studio.toolbar.capture`). Tradução nativa feita pelo copywriter, nunca automática.
- Build gera `_locales/{pt_BR,en,es}/messages.json` para manifest e loja (`__MSG_extName__`, `__MSG_extDescription__`). `default_locale: "en"` (fallback mundial das lojas); pt-BR é o idioma principal de conteúdo e o primeiro escrito.
- UI: runtime próprio leve e tipado em `packages/i18n` (não `browser.i18n`, que não troca idioma em tempo de execução). Idioma padrão = `i18n.getUILanguage()` mapeado para pt-BR/en/es; troca manual nas configurações. Plurais e números com `Intl.PluralRules`/`Intl.NumberFormat`/`Intl.DateTimeFormat`.
- Landing: rotas Astro `/` (pt-BR), `/en/`, `/es/`, mesmas chaves de marca vindas de `packages/i18n` quando fizer sentido.

## 9. Observabilidade

Sem telemetria (promessa central). Em seu lugar:
- Logger interno com níveis, desligado em produção; painel "Diagnóstico" no Estúdio mostra versão, navegador, permissões, últimas 200 entradas em memória e botão "copiar diagnóstico" (texto que o usuário cola numa issue do GitHub, sem URLs por padrão).
- Erros amigáveis com código curto (`NPV-IFRAME-BLOCKED`, `NPV-CAPTURE-RATE`, `NPV-ENCODER-UNSUPPORTED` e demais), lista completa em [API.md](API.md) §2.1, também publicada na wiki do repositório.

## 10. Estrutura do repositório e donos

```
/
├─ apps/
│  ├─ page-view/                 WXT
│  │  ├─ entrypoints/
│  │  │  ├─ background.ts        inclui action.onClicked (sem popup, ADR-016)
│  │  │  ├─ studio/              Estúdio (React)
│  │  │  ├─ offscreen/           só Chromium
│  │  │  ├─ frame-agent.content.ts   registrado dinamicamente (registration: 'runtime')
│  │  │  └─ frame-env.content.ts     world MAIN, ADR-011
│  │  ├─ src/features/{screens,mirror,capture,video,mockup,report,pages,settings}/
│  │  ├─ public/                 ícones, molduras SVG
│  │  └─ wxt.config.ts
│  └─ landing/                   Astro estático
├─ packages/
│  ├─ core/                      tipos, protocolo de mensagens, storage schemas, utilitários (sem DOM de UI)
│  ├─ capture/                   costura, aquecimento, detecção de seções, encoders (vídeo, GIF, PDF, ZIP), workers
│  ├─ devices/                   catálogo de aparelhos + kits Essenciais (dados)
│  ├─ ui/                        design system React (tokens CSS, componentes sobre React Aria)
│  ├─ i18n/                      locales YAML, runtime e gerador de _locales
│  └─ config/                    tsconfig base, biome.json, manifest allowlist
├─ tests/
│  ├─ e2e/                       Playwright
│  └─ fixtures/                  servidor local com sites de teste (XFO DENY, CSP frame-ancestors, animações de scroll, sticky, lazy, Lenis, sitemap)
├─ docs/                         ARQUITETURA, DECISOES, API, DESIGN-SYSTEM, PRIVACIDADE, BUILD (reprodutível p/ AMO)
├─ pnpm-workspace.yaml
└─ package.json
```

| Pasta | Dono |
|---|---|
| `apps/page-view/entrypoints/background.ts`, `offscreen/` | frontend-engineer (motor; revisão: security-engineer) |
| `apps/page-view/entrypoints/*.content.ts`, `src/features/mirror` | frontend-engineer (motor; `frame-env` com revisão obrigatória do security-engineer) |
| `apps/page-view/entrypoints/studio`, `src/features/*` (UI) | frontend-engineer (UI) |
| `packages/capture` | frontend-engineer (motor) |
| `apps/page-view/wxt.config.ts`, manifest, scaffold do monorepo (`package.json`, `pnpm-workspace.yaml`) | devops-engineer (revisão de permissões: security-engineer) |
| `packages/core` | software-architect (contrato); implementação: frontend-engineer; mudanças por ADR |
| `packages/devices` | software-architect (dados aprovados por Bruno) |
| `packages/ui` | frontend-engineer + art-director (tokens) |
| `packages/i18n/locales` | copywriter; runtime e gerador: frontend-engineer |
| `packages/config`, CI | devops-engineer; allowlist de permissões: security-engineer |
| `apps/landing` | frontend-engineer (landing) + art-director |
| `tests/` | qa-engineer |
| `docs/` | software-architect (ARQUITETURA, DECISOES, API); privacy (PRIVACIDADE); devops-engineer (BUILD) |

Motor e UI ficam com o mesmo papel (frontend-engineer); quando houver pacotes paralelos, os caminhos de escrita de cada pacote devem ser disjuntos e o contrato é docs/API.md.

## 11. Diferenças Firefox (build `wxt -b firefox`)

| Item | Chromium | Firefox |
|---|---|---|
| Background | Service worker | Event page (`background.scripts`), gerado pelo WXT |
| Gravação | `tabCapture` + offscreen | `getDisplayMedia` no Estúdio (seletor do navegador); sem offscreen |
| Host permissions | Opcionais (nossa escolha) | Opcionais por padrão no MV3, mesma UX |
| DNR | Sessão com `tabIds` | Suportado (modifyHeaders de resposta); validar no P5 (construção, antes da auditoria) |
| `location.ancestorOrigins` | Existe | Não existe; por isso a checagem de Estúdio é sempre via background |
| WebCodecs H.264 encode | Sim (Windows) | Depende do SO; fallback WebM |
| `MediaStreamTrackProcessor` | Sim | Não; usar `requestVideoFrameCallback` |
| Manifest | | `gecko.id`, `data_collection_permissions`, `strict_min_version` |
| Revisão AMO | | Código-fonte + build reproduzível (docs/BUILD.md) |

Edge, Opera e Brave usam o build Chromium. Brave Shields pode bloquear recursos dentro dos iframes (mensagem amigável).

## 12. Riscos técnicos

| ID | Risco | Mitigação |
|---|---|---|
| R1 | Revisão das lojas por remoção de cabeçalhos e acesso a sites | Zero aviso na instalação, hosts sob demanda, regras só de sessão por aba, justificativa pronta (brief de privacidade), código aberto |
| R2 | `captureVisibleTab` em página da extensão com iframes cross-origin: permissão e fidelidade | PoC P1. Plano B: `activeTab` concedido ao clicar no ícone sobre o Estúdio; plano C: tabCapture de um quadro |
| R3 | Resolução de saída (1080 px de largura para celular de 360 px CSS; 1920 de altura em monitor 1080p) | Zoom por aba durante a captura; para vídeo vertical, testar se o tamanho pedido ao tabCapture faz o Chromium renderizar acima do visível. PoC P3. Se não, upscale de qualidade e aviso honesto da resolução real |
| R4 | Login em sites dentro do iframe (cookies SameSite em contexto de terceiros) | Confirmado no P1: só cookies `SameSite=None; Secure` mantêm a sessão; sites só com Lax aparecem deslogados (limite do navegador). Mensagem amigável + modo "Tela única fiel" em aba normal |
| R5 | Sites com smooth scroll, scroll-jacking e animações ligadas a scroll quebram a costura | Modo Momentos como saída garantida; detecção de Lenis/Locomotive; fixtures dedicadas |
| R6 | Muitas telas travam o navegador (OOPIFs do mesmo site dividem processo) | Limite de telas, congelamento, fila serial |
| R7 | Espelhamento de clique impreciso (isTrusted, layouts diferentes) | Seletor estável + fallback por texto/aria; aviso discreto quando não encontra o alvo |
| R8 | Firefox: DNR, WebCodecs H.264 e getDisplayMedia com UX diferente | P5 na construção, antes da auditoria (não bloqueia o corte inicial); recursos degradam com mensagem, não somem em silêncio |
| R9 | ADR-011 (script MAIN) conflita com a regra 6 de segurança | Desligado até aprovação; sem ele, reduzir movimento só vale para CSS e UA só no modo tela única |
| R10 | Canvas gigante estoura memória | Fatiamento automático e limites de área |
| R11 | `permissions.request` dentro de `action.onClicked` no service worker sem garantia documentada (Chrome e Firefox) | Chamada síncrona antes de qualquer `await`; recusa ou rejeição caem no cartão de permissão do Estúdio, sem mudar contrato. Teste na construção nos dois navegadores |

## 13. Prova de conceito recomendada (corte inicial)

Objetivo: provar as 5 incertezas que podem derrubar o produto antes de qualquer UI caprichada. Um Estúdio cru, duas telas (390×844 e 1440×900), Chrome primeiro.

- **P1 Iframe + permissão + cabeçalhos:** abrir `https://github.com` (XFO deny), um site com CSP `frame-ancestors 'self'`, `http://localhost:4321` e um site logado; pedir permissão por origem; regras de sessão; confirmar limpeza.
- **P2 Espelhamento de scroll por âncora** entre as duas telas, sem eco.
- **P3 Print Experiência** de uma página com animações de entrada (fixture com GSAP ScrollTrigger + Lenis + lazy images + header sticky), saída em DPR 3 para a tela de celular via zoom por aba; comparar com GoFullPage.
- **P4 Vídeo** de 15 s com scroll automático, 1080×1920 MP4 via tabCapture + WebCodecs + Mediabunny; medir resolução real e fps.
- **P5 Firefox:** mesmo P1 e P4 (getDisplayMedia, WebM se faltar H.264). **Momento: construção, antes da auditoria** (não bloqueia o corte inicial).

Critério de saída: P1 a P4 passam no Chrome; P5 documenta as degradações. Resultado vira ADR de confirmação (ou de troca de abordagem) antes da construção paralela.

**Resultado (2026-11-20):** P1 a P4 passaram no Chrome (relatório da POC). ADR-006 e ADR-007 aceitas; novas ADR-014 (contrato v1) e ADR-015 (gravação por gesto via offscreen). Pendências: P5 Firefox (construção, antes da auditoria), comparação com GoFullPage, teste de clique dentro do Estúdio como invocação do tabCapture (`bg.rec.arm` com `tryStartNow`), teste de `permissions.request` no `action.onClicked` (R11). ADR-016 (2026-11-20) retirou o popup: contrato v1.2.
