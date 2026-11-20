# Decisões de arquitetura (ADRs): Neruz Page View

Formato curto: contexto, decisão, alternativas, consequências. Status: Proposta (aguarda PoC ou aprovação), Aceita, Substituída. Data-base 2026-11-20. Critérios ponderados usados nas escolhas de stack: adequação ao problema (30%), maturidade e manutenção ativa (20%), adoção e ecossistema para contribuidores open source (15%), segurança e superfície de permissões (15%), custo e operação (10%), prazo (10%).

---

## ADR-001 Framework de extensão: WXT
**Status:** Aceita
**Contexto:** MV3 para Chrome, Edge, Opera, Brave e Firefox a partir de um código; HMR; geração de manifest por navegador; zip para lojas e fonte para AMO.
**Decisão:** WXT 0.21.x (0.21.5 em 26/10/2026), com Vite como peer dependency (>= 6.3.4; usar 8.x se a faixa permitir).
**Alternativas:** Plasmo (manutenção desacelerada, opinativo, Parcel); CRXJS (plugin Vite, foco Chrome, Firefox fraco); Extension.js (mais novo, menor base); Vite puro + web-ext (todo o encanamento por nossa conta).
**Consequências:** Builds `-b chrome` e `-b firefox` do mesmo código; entrypoints por arquivo; content scripts com `registration: 'runtime'`; storage tipado. WXT ainda é 0.x: fixar versão exata e ler o upgrade guide a cada salto de minor.

## ADR-002 UI da extensão: React 19 + React Compiler + React Aria + Zustand
**Status:** Aceita
**Contexto:** Estúdio é uma aplicação rica (grade redimensionável, biblioteca, editor de mockup, filas). Open source com meta de comunidade: contribuidores precisam reconhecer a stack. Acessibilidade obrigatória.
**Decisão:** React 19.2 com React Compiler, componentes acessíveis do React Aria Components, estado em Zustand 5.
**Alternativas:** Svelte 5 (bundle menor e ótimo DX, menos contribuidores e menos primitivas acessíveis maduras); Solid (desempenho excelente, ecossistema pequeno); Vue 3 (bom, menor sinergia com a equipe e com React Aria); vanilla/Lit (custo alto para a complexidade do Estúdio).
**Consequências:** Bundle maior que Svelte, irrelevante numa extensão carregada do disco. O peso real está nos iframes, não no React. Regra: trabalho pesado sempre em Workers.

## ADR-003 Monorepo: pnpm workspaces, sem Turborepo na v1
**Status:** Aceita
**Contexto:** Núcleo compartilhado para futuras extensões Neruz. Hoje: 2 apps e 6 pacotes pequenos.
**Decisão:** pnpm 12 workspaces, scripts `pnpm -r`/`--filter`. Lifecycle scripts de dependências bloqueados (padrão do pnpm desde a 10, liberar só por `onlyBuiltDependencies`), `minimumReleaseAge` de 7 dias (regra de segurança 14), `pnpm install --frozen-lockfile` no CI (equivalente ao `npm ci` citado no brief de segurança).
**Alternativas:** Turborepo 2.11 (cache e orquestração; complexidade especulativa para este tamanho); Nx (pesado); npm/yarn workspaces (menos rigor de dependências e de segurança).
**Consequências:** Turborepo entra por nova ADR quando houver 3+ extensões ou CI lento. O brief de segurança fala em `npm ci`/`npm audit`: trocar por `pnpm install --frozen-lockfile --ignore-scripts` e `pnpm audit --prod`.

## ADR-004 Superfície principal: página Estúdio em aba, popup só de atalhos
**Status:** Substituída em parte pela ADR-016 (2026-11-20): o Estúdio em aba continua; o popup deixa de existir.
**Contexto:** Várias telas lado a lado exigem largura. Side panel é estreito e não existe no Firefox (lá é `sidebar_action`).
**Decisão:** Estúdio = página HTML da extensão aberta em aba. Popup com atalhos (abrir no Estúdio, print rápido da aba, gravar aba). Sem side panel.
**Alternativas:** Side panel (estreito, API só Chromium); só popup (fecha ao perder foco, inviável para captura longa); injetar UI sobre a página do usuário (conflito de CSS, permissões amplas, revisão pior).
**Consequências:** Uma aba a mais para o usuário; em troca, espaço total, captura previsível e o Estúdio vira a "aba ativa" para `captureVisibleTab`/`tabCapture`.

## ADR-005 Sem chrome.debugger
**Status:** Aceita
**Contexto:** `debugger` daria DPR, toque e UA por tela e captura além da viewport (`Page.captureScreenshot`), mas não pode ser opcional no Chrome, mostra a barra "depurando este navegador" e gera aviso forte na instalação.
**Decisão:** Não usar. Emulação por tamanho de iframe, `color-scheme` do iframe, CSSOM e (opcional) ADR-011. Captura por `captureVisibleTab` com costura.
**Alternativas:** debugger obrigatório (pior revisão e confiança); extensão "companheira" com debugger (dobra manutenção e confunde o público).
**Consequências:** Sem `pointer: coarse` e sem DPR independente por tela; documentado como limite honesto. Revisitar só se o PoC P3 falhar.

## ADR-006 Vídeo: captura da aba + WebCodecs + Mediabunny; GIF com gifenc
**Status:** Aceita (POC 2026-11-20)
**Evidência (P4, Chrome):** tabCapture (offscreen) → MediaStreamTrackProcessor → OffscreenCanvas → Mediabunny gerou MP4 H.264 1080×1920 de 2,2 MB, conferido por ffprobe e quadros extraídos (crop correto, reveals visíveis, sem barra de rolagem).
`getMediaStreamId` exige invocação do usuário; o quadro chega 3840×2160 com a aba escalada e centralizada, e o recorte por escala+centralização resolveu.
Correções no pipeline: leitura com teto (o tabCapture só emite em mudança) e repetição do último quadro para cumprir a duração.
**Limites:** ~26 a 30 fps efetivos (meta 30 depende da decimação e do encoder em dia); 1080 px nativos só se a tela ocupar ~1080 px físicos no quadro (abaixo disso, ampliação leve, ~1,2× na POC); gravação sempre por gesto na action/atalho (ADR-015).
**Contexto:** MP4, WebM e GIF locais, 1080×1920 e 16:9, sem servidor.
**Decisão:** Fonte `tabCapture` (Chromium, permissão opcional) ou `getDisplayMedia` (Firefox). Quadros recortados/compostos em OffscreenCanvas, `VideoEncoder` (H.264 para MP4, VP9 para WebM), mux com Mediabunny (sucessor do mp4-muxer/webm-muxer, que estão descontinuados). GIF com gifenc em Worker, até 720 px e 15 fps.
**Alternativas:** MediaRecorder puro (simples, mas sem controle de recorte, composição e bitrate; MP4 depende do navegador), fica como plano C; ffmpeg.wasm (núcleo ~30 MB, lento single-thread, multithread exige COOP/COEP que quebra os iframes); gifski-wasm (licença AGPL, incompatível com MIT).
**Consequências:** Firefox pode não ter encoder H.264 em todo SO: oferecer WebM e explicar. Extensão continua leve (dezenas de kB para mux).

## ADR-007 Print: captureVisibleTab + costura em Worker, três modos
**Status:** Aceita (POC 2026-11-20)
**Evidência (P1 e P3, Chrome):** DNR de sessão por aba + `registerContentScripts` liberou 6/6 sites (XFO DENY, CSP frame-ancestors, github, linkedin), com 0 regras e 0 scripts após fechar a aba.
Modo Rápido: 3,5 s, 6 capturas, 390×4806. Modo Experiência: 23,4 s, 11 passos de aquecimento sem estouro de teto, 1170×14418 (zoom por aba 3× = DPR 3), reveals GSAP/Lenis/lazy visíveis e header sticky só no topo.
Correções: `waitStable` só com imagens na viewport e `decode()` com teto de 1,5 s; `hideScrollbar` durante a captura; mutações de DNR/registro serializadas (corrida provável, mitigada, não provada).
**Limites:** `captureVisibleTab` a ~2 capturas/s (intervalo mínimo 600 ms), tempo linear com a altura da página; login no iframe só com cookie `SameSite=None` (sites só com Lax aparecem deslogados, limite do navegador); comparação com GoFullPage pendente.
**Contexto:** Dor nº 1: print de página inteira que respeite animações de scroll.
**Decisão:** Fila com limite de 2 chamadas/s, recorte do iframe, costura em OffscreenCanvas; modos Rápido, Experiência (aquecimento com espera de estabilidade) e Momentos (uma imagem por seção). DPR alto via zoom por aba durante a captura.
**Alternativas:** DOM para imagem (html2canvas, modern-screenshot, snapdom): sem rede de permissão, mas falha em WebGL, vídeo, filtros, fontes cross-origin; inaceitável para sites de experiência. `Page.captureScreenshot` via debugger (rejeitado na ADR-005). Esticar o iframe à altura total: quebra `100vh` e animações.
**Consequências:** Captura Experiência é mais lenta (documentar tempo estimado na UI). Páginas acima do limite de canvas são fatiadas.

## ADR-008 Landing: Astro estático + Three.js + GSAP/ScrollTrigger + Lenis
**Status:** Aceita
**Contexto:** Single page com 3D e scroll coreografado no nível do Neruz Boost; 3 idiomas; sem cookies nem tracking; LCP < 2,5 s; hospedagem simples.
**Decisão:** Astro 7 (`output: 'static'`, Vite 8), Three.js carregado sob demanda após o LCP, GSAP 3 com ScrollTrigger (gratuito com plugins desde 2025, licença própria sem custo), Lenis para scroll suave com `prefers-reduced-motion` desligando-o. Rotas `/`, `/en/`, `/es/`, página `/privacy` (e traduções).
**Alternativas:** Next.js (servidor/SSR desnecessário, mais JS); Vite + React SPA (pior SEO e LCP); React Three Fiber dentro de Astro (útil se o 3D crescer; Three puro é mais leve para uma cena).
**Consequências:** HTML estático cabe na hospedagem da Hostinger sem Node. Licença do GSAP não é MIT: aceitável para a landing, não entra no pacote da extensão.

## ADR-009 Testes: Vitest 4 + Playwright (Chromium) + roteiro Firefox
**Status:** Aceita
**Contexto:** Lógica pura (costura, seções, seletores, schemas) e fluxos de extensão reais.
**Decisão:** Vitest 4.1 (happy-dom; Browser Mode para OffscreenCanvas/WebCodecs). Playwright com `launchPersistentContext` + `--load-extension`, `headless` novo no CI, ID da extensão lido do service worker. Fixtures locais em `tests/fixtures` (XFO DENY, CSP frame-ancestors, animações, sticky, lazy, Lenis, sitemap). Firefox: `web-ext lint` no CI + roteiro manual por release.
**Alternativas:** Puppeteer (bom com extensões, menos ergonomia de teste); Selenium/WebDriver BiDi para Firefox (instável para extensões hoje).
**Consequências:** Cobertura automática do Firefox menor; compensada por checklist manual e por toda a lógica estar em pacotes testáveis.

## ADR-010 Permissões mínimas, hosts sob demanda
**Status:** Aceita (alinhada a `.equipe/briefs/seguranca.md`)
**Contexto:** Maior risco de rejeição é a combinação "todos os sites + mudar cabeçalhos".
**Decisão:** Obrigatórias: `storage`, `scripting`, `activeTab`, `declarativeNetRequestWithHostAccess`, `offscreen` (Chromium). Opcionais: `tabCapture`, `clipboardWrite`, `optional_host_permissions` http/https pedidas por origem. Content script registrado em runtime só para origens concedidas. Regras DNR só de sessão, por `tabIds`.
**Alternativas:** `<all_urls>` obrigatório (aviso forte, revisão rigorosa); `declarativeNetRequest` (não pode ser opcional, gera aviso); `webRequest` (bloqueante não existe no MV3 do Chrome).
**Consequências:** Instalação sem avisos; primeiro uso por site pede um clique de permissão (UX precisa explicar em uma frase). Exportação sem `downloads` (via `<a download>`, ZIP organiza as pastas).

## ADR-011 Script world MAIN mínimo para emulação em JS (exceção à regra 6 de segurança)
**Status:** Aceita com condições (security-engineer, regras 18 a 22 do brief de segurança)
**Contexto:** Regra 6 proíbe world MAIN. Sem ele, não há como fazer `matchMedia('(prefers-reduced-motion)')` e `navigator.userAgent` refletirem a tela (GSAP matchMedia, framer-motion e detecção de mobile por UA ignoram a emulação só de CSS).
**Decisão proposta:** `frame-env` em world MAIN, `document_start`, que lê configuração apenas de `window.name` com prefixo `npv:` (definido pelo atributo `name` do iframe), aplica as sobrescritas e termina. Não escuta eventos, não envia mensagens, não toca APIs de extensão, não confia em nada da página. Desligado por padrão até aprovação.
**Alternativas:** Sem MAIN (reduzir movimento só em CSS, UA só no modo tela única); debugger (rejeitado, ADR-005); comunicação MAIN ↔ isolado por eventos (rejeitada, superfície de ataque).
**Consequências:** A página pode ler `window.name` (só IDs: `npv:<screenId>.<presetId>`, formato em docs/API.md §3.1, subconjunto da regex da regra 18). Se recusado, a UI marca "reduzir movimento" como "apenas CSS".
**Pendência:** a política de privacidade e a justificativa de `scripting` devem citar o script `frame-env` (world MAIN, o que faz e o que não faz), conforme a regra 22. Responsável: privacy. Sem isso, a ADR não libera o padrão `emulateEnvInMainWorld: true` nem a publicação.

## ADR-012 i18n: fonte única YAML, _locales gerado, runtime próprio na UI
**Status:** Aceita
**Contexto:** pt-BR, en, es nativos; manifest e loja usam `_locales`; usuário quer trocar idioma sem mudar o navegador.
**Decisão:** `packages/i18n/locales/*.yml` como fonte; gerador cria `_locales/{pt_BR,en,es}/messages.json` (manifest e loja); UI usa runtime tipado próprio com troca em tempo de execução e `Intl.*`. `default_locale: "en"`.
**Alternativas:** `@wxt-dev/i18n`/`browser.i18n` puro (não troca idioma em runtime); i18next (pesado para o caso).
**Consequências:** Uma fonte de verdade para extensão e landing; tradução continua humana (copywriter).

## ADR-013 Ferramentas de qualidade: Biome 2 e TypeScript 6 (TS 7 depois)
**Status:** Aceita
**Contexto:** Lint e format rápidos num monorepo; TypeScript 7 (Go) estável desde jul/2026, mas sem API programática estável e WXT/Vite ainda dependem do pacote clássico.
**Decisão:** Biome 2 com regras que proíbem `innerHTML` com dado externo, `eval` e `new Function`. TypeScript 6.x como peer; `tsc` do TS 7 só para checagem quando o WXT declarar suporte (nova ADR).
**Alternativas:** ESLint 9 + typescript-eslint + Prettier (mais plugins, mais lento e mais configuração).
**Consequências:** Algumas regras específicas de React Hooks dependem do suporte do Biome; se faltarem, adicionar ESLint só com `eslint-plugin-react-hooks` (nova ADR).

## ADR-014 Contrato de mensagens v1 congelado
**Status:** Aceita (2026-11-20)
**Contexto:** Trabalho paralelo (motor, UI, testes) precisa de um contrato fixo. A POC mostrou dois modos de falha silenciosa: comando sem resposta (`waitStable` preso em `decode()`) e corrida em mutações de registro/DNR.
**Decisão:** docs/API.md v1: envelope `{v, type, frameId, seq, payload}` validado com Valibot no receptor; resposta `Reply` com `NpvError` tipado (códigos `NPV-*`); teto em todo pedido (padrão 10 s, tabela própria para warmup, waitStable e gravação); `frameId` de mensagens vindas de frame sempre sobrescrito por `sender.frameId`; background → Estúdio por `runtime.Port` (também sinal de vida do Estúdio); mutações de DNR/registro numa fila serial única; nome do iframe `npv:<screenId>.<presetId>`.
**Alternativas:** Mensagens sem envelope como na POC (sem versão nem correlação, difícil de evoluir); `window.postMessage` entre Estúdio e iframes (a página do site leria e forjaria mensagens); background decidir o espelhamento sozinho como na POC (menos latência, mas espalha regra de UI no worker; o Estúdio decide e o custo é um salto a mais, aceitável a 60 msg/s).
**Consequências:** Mudança de contrato vira ADR e aviso ao Maestro (v1.2: ADR-016). Campo opcional novo não sobe `v`. Content scripts órfãos após atualização recebem `NPV-VERSION-MISMATCH` e ficam inertes.

## ADR-015 Gravação no Chromium: offscreen único, armada no Estúdio, iniciada por gesto
**Status:** Aceita (POC 2026-11-20); gesto revisto pela ADR-016: sem popup, o gesto é o clique no ícone (ou o atalho `_execute_action`) com o Estúdio armado em primeiro plano. `bg.rec.trigger` e o comando `record` saem do contrato.
**Contexto:** P4 provou que `tabCapture.getMediaStreamId` exige invocação do usuário (action ou atalho); na automação só passou com allowlist. ARQUITETURA previa gravar dentro do próprio Estúdio.
**Decisão:** Toda gravação Chromium (Estúdio e, depois, aba comum) passa pelo offscreen. O Estúdio "arma" a gravação (`bg.rec.arm`, válida 60 s) e o início acontece no gesto: atalho `record` ou popup aberto sobre a aba do Estúdio (`bg.rec.trigger`). Resultado volta como `blobUrl` do offscreen, lido pelo Estúdio e liberado com `bg.rec.release`. Firefox grava no Estúdio com `getDisplayMedia` (o seletor já é o gesto).
**Alternativas:** Gravar no próprio Estúdio com `getMediaStreamId` + `getUserMedia` (não provado sem invocação; disputa a thread da UI); `getDisplayMedia` também no Chromium (seletor do navegador a cada gravação, pior UX, sem controle do alvo); `MediaRecorder` (plano C, sem controle de recorte e composição).
**Consequências:** Um passo a mais na UX ("clique no ícone ou use o atalho para começar"), que o copywriter precisa explicar em uma frase. Construção deve testar se um clique dentro do Estúdio já conta como invocação; se contar, `arm` e gesto viram um clique sem mudar o contrato. Permissão `tabCapture` continua opcional.

## ADR-016 Clique no ícone abre o Estúdio com a URL da aba, sem popup
**Status:** Aceita (2026-11-20). Substitui a ADR-004 na parte do popup e revisa o gesto da ADR-015. Pedido de Bruno (P15): "quando clicar já abre direto o estúdio, não tem essa etapa adicional".
**Contexto:** O popup era uma etapa a mais entre o clique e o trabalho. Sem `default_popup`, o Chromium e o Firefox disparam `action.onClicked`, que concede `activeTab` à aba clicada (dá `tab.url` sem a permissão `tabs`) e conta como invocação do usuário. O atalho especial `_execute_action` dispara o mesmo evento quando não há popup.
**Decisão:**
1. Manifest sem `default_popup`; `entrypoints/popup` removido. `commands` só com `_execute_action` (atalho sugerido `Alt+Shift+P`, configurável em `chrome://extensions/shortcuts`); os comandos `open-studio`, `quick-print` e `record` saem. Atalho e clique seguem o mesmo caminho.
2. `action.onClicked(tab)`, nesta ordem:
   - **Aba clicada é um Estúdio** (`tab.id` em `studioTabs`): gravação armada e válida inicia a gravação (o clique concede `activeTab` ao próprio Estúdio, que é o alvo do `tabCapture`); gravando, para a gravação (`rec.stop`, resultado preservado); sem armação, emite `ui.actionClicked` ao Estúdio (a UI mostra onde está a gravação). Nunca abre outro Estúdio.
   - **Aba com URL suportada** (`http:`, `https:`; `file:` só com `extension.isAllowedFileSchemeAccess()`): chama `permissions.request({ origins: [<origem>/*] })` **de forma síncrona, antes de qualquer `await`**, para o pedido caber no gesto. Concedida (ou já existente, sem diálogo), o Estúdio abre já carregando a URL. Recusada ou rejeitada por falta de gesto: o Estúdio abre com a URL no campo e o cartão de permissão de hoje (ARQUITETURA §3.1), sem erro na cara do usuário.
   - **Página não suportada** (sem `tab.url`, `chrome:`, `edge:`, `about:`, `chrome-extension:` de outra extensão, `view-source:`, lojas de extensões, `file:` sem acesso): abre o Estúdio vazio com aviso de uma frase e o campo de URL em foco.
3. **Reaproveitamento:** o background guarda `originTabId → studioTabId` em `storage.session`. Se já há Estúdio vivo daquela aba de origem, foca a aba e a janela (`tabs.update`, `windows.update`, sem permissão `tabs`) e envia `ui.openUrl`; o Estúdio só navega se a URL mudou. Aba de origem fechada desfaz o vínculo; o Estúdio continua aberto. Clique em outra aba abre outro Estúdio.
4. O Estúdio não lê a URL da query string: pede `bg.studio.launch` ao abrir e recebe o mesmo `StudioLaunch` do `ui.openUrl` (um caminho só para novo e reaproveitado; nada de entrada não confiável na URL da página).
5. "Print com moldura" (P16, antes "print bonito") é opção do painel de captura do Estúdio, sobre a tela já aberta, com o motor da ADR-007. `bg.tab.capture` sai do contrato (arquivado); `bg.tab.record` continua reservado.
6. Menu de contexto do ícone: não na v1. Pediria a permissão `contextMenus` (sem aviso, mas mais uma linha na allowlist e na revisão) para atalhos que o Estúdio já tem; o menu nativo do navegador (fixar, gerenciar, atalhos) basta. Reavaliar por ADR se houver ação frequente fora do Estúdio.
**Gravação com um clique só a partir da página comum: não.** `tabCapture.getMediaStreamId` só aceita como alvo aba com `activeTab` concedido; o clique na página do site concede `activeTab` à aba do site, não ao Estúdio que ele abre (e que é o que precisa ser gravado, com as telas, molduras e scroll coreografado). Capturar a aba do site não serve: não é o enquadramento do produto. **Fluxo mínimo:** (1) clique no ícone abre o Estúdio; (2) no Estúdio, escolher a tela e "Gravar" arma (`bg.rec.arm`); (3) clique no ícone ou atalho com o Estúdio em primeiro plano inicia. São dois cliques no ícone no total, e a UI do passo 2 aponta para o ícone. Se o teste da ADR-015 provar que um clique dentro do Estúdio já conta como invocação, o passo 3 some sem mudar o contrato (`bg.rec.arm` já leva `tryStartNow: true`: o background tenta `getMediaStreamId` na hora; se o Chrome recusar, a gravação fica armada e a resposta traz `started: false`, sem erro).
**Alternativas:** Manter o popup com um botão "Abrir no Estúdio" (a etapa que Bruno pediu para tirar); side panel como antessala (estreito, só Chromium, ADR-004); abrir o Estúdio passando a URL na query string (simples, mas cria entrada que outra página da extensão ou um link poderia forjar e duplica o caminho do reaproveitamento); pedir permissão de host só dentro do Estúdio (funciona, mas acrescenta um clique no primeiro uso de cada site); gravar a aba do site direto do clique (um clique, mas grava o site cru, sem as telas do Estúdio).
**Consequências:** Uma superfície a menos para construir, testar e traduzir; o primeiro uso de um site vira clique no ícone + "Permitir" no diálogo do navegador. Some o "print rápido de qualquer aba" sem abrir o Estúdio; quem quiser print abre o Estúdio (um clique). A landing e textos que mostram popup precisam mudar. Chamar `permissions.request` dentro de `action.onClicked` no service worker não está documentado como garantido: a construção testa no Chrome e no Firefox; se falhar, o caminho de recusa (cartão no Estúdio) já cobre sem mudar o contrato. Evitar `await` antes do pedido é regra de implementação, não sugestão.
