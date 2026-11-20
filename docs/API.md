# API interna: Neruz Page View

**CONGELADO 2026-11-20 v1.2** (protocolo `v: 1`). Qualquer mudança depois desta data exige ADR em [DECISOES.md](DECISOES.md) e aviso ao Maestro. Base: [ARQUITETURA.md](ARQUITETURA.md) §3, §4, §7 e o relatório da POC (P1 a P4 no Chrome, 2026-11-20).

Changelog:
- **v1.2 (ADR-016):** sem popup; clique no ícone e atalho `_execute_action` abrem/focam o Estúdio (§6.5). Novos: `bg.studio.launch`, eventos `ui.openUrl` e `ui.actionClicked`, tipo `StudioLaunch`, campo `tryStartNow` em `bg.rec.arm`, chaves `session:studioOrigins` e `session:studioLaunch`. Removidos: `bg.popup.openStudio`, `bg.rec.trigger`, comando `record`; `bg.tab.capture` arquivado ("Print com moldura" é opção do painel de captura do Estúdio). `v` continua 1: extensão é empacotada inteira, não há versão publicada com popup.
- **v1.1:** revisão de segurança do contrato, sem mudança incompatível.
- **v1:** contrato inicial (ADR-014).

A extensão não tem servidor nem API HTTP. "API" aqui é o contrato de mensagens entre as superfícies da extensão (Estúdio, background, frame-agent, offscreen), os erros, os tempos-limite e os schemas de armazenamento. Implementação em `packages/core` (dono: software-architect).

## 1. Convenções

| Item | Regra |
|---|---|
| Transporte | Estúdio → frame: `tabs.sendMessage(studioTabId, msg, { frameId })`. Frame → background: `runtime.sendMessage`. Background → Estúdio: `runtime.Port` aberta pelo Estúdio (`runtime.connect({ name: 'npv-studio' })`). Estúdio → background e background → offscreen: `runtime.sendMessage`. Ícone/atalho → background: `action.onClicked` (§6.5), sem mensagem. Nunca `window.postMessage`. |
| Envelope | Toda mensagem é `Envelope` (§2). Receptor valida com Valibot antes de qualquer uso; falhou, responde `NPV-INVALID-MESSAGE` e descarta. |
| Versão | `v: 1`. Receptor com outra versão responde `NPV-VERSION-MISMATCH`. Mudança incompatível sobe `v` e exige ADR. Campo novo opcional não muda `v`. |
| `seq` | Inteiro >= 1, crescente por remetente e por sessão do Estúdio. A resposta repete o `seq` do pedido. |
| `frameId` | Número do `frameId` do Chrome. Estúdio → frame: frame de destino. Frame → background: o remetente preenche `-1`; o background **sobrescreve** com `sender.frameId` e nunca confia no valor recebido. Estúdio/offscreen ↔ background: `0`. |
| IDs de domínio | `screenId`: `s1` a `s16`. `presetId` e `kitId`: `^[a-z0-9-]{1,56}$`. IDs criados pelo usuário: `crypto.randomUUID()`. |
| Datas | Instantes em `number` (ms desde epoch, `Date.now()`); durações sempre com sufixo `Ms`. Datas em storage e export: ISO 8601 UTC (`toISOString()`). |
| Unidades | Sufixo explícito quando não for px CSS: `*Device` = px físicos. Retângulos: `Rect = { x, y, width, height }`. |
| Paginação | Não há listas paginadas. Listas têm teto fixo (indicado em cada tipo); acima do teto o emissor corta e marca `truncated: true`. |
| Tamanho | Mensagem serializada <= 256 kB. Imagens e vídeo nunca trafegam em mensagem: `ImageBitmap`/`VideoFrame` só dentro do Estúdio (Workers), vídeo do offscreen via `blobUrl` (§6). |
| Tempo-limite | Toda requisição tem teto (§8). Padrão 10 s. Nenhuma promessa sem teto, inclusive dentro do frame-agent (`Promise.race` contra o teto em `decode()`, `reader.read()` e similares). |

## 2. Envelope, resposta e erro

```ts
export const PROTOCOL_VERSION = 1;

export type Envelope<TType extends string, TPayload> = {
  v: 1;
  type: TType;
  frameId: number;
  seq: number;
  payload: TPayload;
};

export type Reply<TData> =
  | { v: 1; seq: number; ok: true; data: TData }
  | { v: 1; seq: number; ok: false; error: NpvError };

export type NpvError = {
  code: NpvErrorCode;
  message: string;            // técnico, em inglês, para o painel Diagnóstico; a UI traduz pelo code
  retryable: boolean;
  details?: Record<string, string | number | boolean>;
};
```

Eventos (`frame.*`, `ui.*`, `rec.progress`, `rec.started`, `rec.done`, `rec.failed`) não têm resposta; usam o mesmo `Envelope`.

### 2.1 Códigos de erro

| Código | Quando | `retryable` |
|---|---|---|
| `NPV-TIMEOUT` | Teto de §8 estourado (gerado pelo chamador) | sim |
| `NPV-INVALID-MESSAGE` | Falha de schema Valibot | não |
| `NPV-BAD-REQUEST` | Mensagem válida no schema mas com valor não autorizado (ex.: `blobUrl` não emitido para a gravação) | não |
| `NPV-VERSION-MISMATCH` | `v` diferente (ex.: content script órfão após atualização) | não |
| `NPV-FORBIDDEN-SENDER` | `sender.id !== runtime.id` ou origem do remetente não é página da extensão | não |
| `NPV-NOT-STUDIO-TAB` | `sender.tab.id` fora de `studioTabs`, ou `frame.hello` de `frameId === 0` | não |
| `NPV-FRAME-NOT-FOUND` | Sem receptor no frame (agente não injetado, frame navegou ou fechou) | sim |
| `NPV-IFRAME-BLOCKED` | Tela não carregou o site (sem `frame.hello` em 8 s, `chrome-error://`, top-level obrigatório) | não |
| `NPV-PERMISSION-MISSING` | Origem sem permissão de host concedida | não |
| `NPV-PERMISSION-DENIED` | Usuário recusou `permissions.request` | não |
| `NPV-DNR-FAILED` | `updateSessionRules` falhou | sim |
| `NPV-SCRIPT-REGISTER-FAILED` | `registerContentScripts`/`unregisterContentScripts` falhou | sim |
| `NPV-CAPTURE-RATE` | Fila de `captureVisibleTab` cheia ou cota do navegador estourada | sim |
| `NPV-CAPTURE-FAILED` | `captureVisibleTab` rejeitou | sim |
| `NPV-CANVAS-LIMIT` | Área acima do limite mesmo fatiando | não |
| `NPV-ELEMENT-NOT-FOUND` | Clique/digitação espelhados sem alvo no destino | não |
| `NPV-INPUT-SENSITIVE` | Tentativa de espelhar campo sensível (regra 7) | não |
| `NPV-REC-GESTURE-REQUIRED` | `getMediaStreamId` sem invocação do usuário fora de `tryStartNow`, ou armação expirada no clique do ícone | não |
| `NPV-REC-BUSY` | Já há gravação ativa ou armada | não |
| `NPV-REC-UNSUPPORTED` | Navegador sem `tabCapture`/offscreen e sem `getDisplayMedia` | não |
| `NPV-ENCODER-UNSUPPORTED` | Nenhum codec de `preferredCodecs` codificável | não |
| `NPV-REC-FAILED` | Erro no pipeline de gravação | sim |
| `NPV-STORAGE-INVALID` | Valor de storage ou arquivo importado fora do schema/tamanho | não |
| `NPV-ABORTED` | Operação cancelada pelo usuário ou pelo fechamento do Estúdio | não |
| `NPV-UNKNOWN` | Exceção não mapeada (sempre logada) | não |

## 3. Tipos compartilhados

```ts
export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type ScreenId = `s${number}`;                       // s1..s16

export type ScrollAnchor = {
  selector: string | null;   // <= 512 caracteres; null = sem seção, usa pageRatio
  offsetRatio: number;       // 0..1 dentro da âncora
  pageRatio: number;         // 0..1 da página
};

export type ElementLocator = {
  selector: string;          // id, data-*, aria, caminho nth-of-type curto; <= 512 caracteres
  text?: string;             // fallback por texto/aria, <= 120 caracteres
  point: { xRatio: number; yRatio: number };   // 0..1 dentro do elemento
};

export type Section = {
  selector: string;
  top: number;               // px CSS do documento
  height: number;
  label?: string;            // aria-label/heading, <= 80 caracteres
};                           // lista com teto 30 (ARQUITETURA §4.1)

export type OverflowReport = {
  overflowPx: number;        // scrollWidth - innerWidth, 0 se não houver
  offenders: { selector: string; rightPx: number }[];   // teto 20
  truncated: boolean;
};

export type FrameInfo = {
  frameId: number;
  screenId: ScreenId;
  presetId: string;
  origin: string;
  helloAt: number;
};
```

### 3.1 Nome do iframe

Atributo `name` do iframe: `npv:<screenId>.<presetId>`, ex.: `npv:s1.iphone-15`. Regex de leitura `^npv:(s(?:[1-9]|1[0-6]))\.([a-z0-9-]{1,56})$`, subconjunto da regex da regra 18 de segurança. Só IDs, nunca texto livre nem JSON (regra 19). O `frame-env` (ADR-011) usa só o `presetId` e consulta a tabela empacotada; o `frame-agent` usa o `screenId`.

A página pode reescrever o próprio `window.name` e qualquer subframe aninhado pode ter nome `npv:*`. Por isso: o `frame-env` lê o nome uma vez, em `document_start`, antes de scripts da página, exige `window.parent === window.top` e ignora leituras posteriores. O `frame-agent` trata o nome como alegação: o background confere `screenId` contra as telas registradas pelo Estúdio e `presetId` contra a tabela; `frame.hello` duplicado de `screenId` já ocupado com outro `frameId`/origem é rejeitado (o primeiro vence até `frame.bye` ou navegação).

## 4. `frame.*` (frame-agent → background → Estúdio)

Regras do background para toda mensagem `frame.*`: `sender.id === runtime.id`; `sender.frameId !== 0`; `sender.tab.id` pertence a `studioTabs`; `frameId` do envelope sobrescrito por `sender.frameId`. Falhou qualquer uma: descarta (e responde erro só ao `frame.hello`). Aceita, repassa ao Estúdio dono da aba pela Port.

O frame-agent aceita comandos `studio.*` apenas de `sender.id === runtime.id` com `sender.url` começando na origem da extensão. Em `window.top === window` ele sai antes de registrar qualquer listener.

| type | Payload | Resposta | Notas |
|---|---|---|---|
| `frame.hello` | `{ screenId: ScreenId; presetId: string; origin: string; url: string }` | `Reply<{ accepted: true; mirror: boolean }>` ou erro `NPV-NOT-STUDIO-TAB` | Enviado em `document_start`. Erro ou teto (3 s): agente fica inerte para sempre nesse documento. Background grava `FrameInfo` em `storage.session` |
| `frame.ready` | `{ url: string; title: string; scrollHeight: number }` | evento | Após `load` |
| `frame.bye` | `{}` | evento | Em `pagehide`; o background libera o `screenId` daquele `frameId` |
| `frame.stable` | `{ sinceLoadMs: number; timedOut: boolean }` | evento | Primeira estabilidade após `load` (relatório "tempo até estável") |
| `frame.sections` | `{ sections: Section[]; truncated: boolean }` | evento | Após `ready` e quando mudar |
| `frame.scroll` | `{ anchor: ScrollAnchor }` | evento | Só com input confiável (`isTrusted`) nos últimos 1500 ms; descarta durante janela de eco de 150 ms após `studio.applyScroll`; teto 60/s via rAF |
| `frame.click` | `{ target: ElementLocator }` | evento | Só `isTrusted` |
| `frame.navigate` | `{ url: string; kind: 'push' \| 'replace' \| 'traverse' \| 'reload' \| 'load' }` | evento | `navigation.currententrychange`, fallback por checagem de `location.href` |
| `frame.input` | `{ target: ElementLocator; value: string }` | evento | `value` <= 2000 caracteres. Nunca `password`, cartão, OTP ou `autocomplete` sensível (regra 7): o agente não emite |
| `frame.overflow` | `OverflowReport` | evento | Quando `overflowPx` muda |
| `frame.autoscroll.ended` | `{ reason: 'complete' \| 'stopped'; scrollY: number; elapsedMs: number }` | evento | Fim de `studio.autoscroll.start` |
| `frame.error` | `{ error: NpvError }` | evento | Erros não ligados a um pedido |

## 5. `studio.*` (Estúdio → frame-agent, pedido e resposta)

Todas respondem `Reply<T>`. Na falta de receptor, o Estúdio converte o erro do navegador em `NPV-FRAME-NOT-FOUND`.

| type | Payload | `data` da resposta | Teto |
|---|---|---|---|
| `studio.ping` | `{}` | `{}` | 3 s |
| `studio.metrics` | `{}` | `{ scrollHeight; scrollWidth; innerWidth; innerHeight; devicePixelRatio; scrollY: number }` | 10 s |
| `studio.measure` | `{}` | `{ sections: Section[]; overflow: OverflowReport; truncated: boolean }` | 10 s |
| `studio.applyScroll` | `{ anchor: ScrollAnchor }` | `{ scrollY: number; usedFallback: boolean }` | 3 s |
| `studio.applyClick` | `{ target: ElementLocator }` | `{ strategy: 'selector' \| 'text' }` ou `NPV-ELEMENT-NOT-FOUND` | 3 s |
| `studio.applyInput` | `{ target: ElementLocator; value: string }` | `{}` ou `NPV-ELEMENT-NOT-FOUND`/`NPV-INPUT-SENSITIVE` | 3 s |
| `studio.navigate` | `{ url: string }` | `{}` | 10 s |
| `studio.scrollTo` | `{ top: number }` | `{ scrollY: number }` (após 1 rAF, `behavior: 'instant'`) | 10 s |
| `studio.waitStable` | `{ maxMs?: number }` (padrão e máximo 4000) | `{ waitedMs: number; timedOut: boolean }` | 8 s |
| `studio.warmup` | `{ stepRatio?: number; maxSteps?: number }` (padrão 0,5 e 60; máximo 120) | `{ steps; timeouts; durationMs; scrollHeight: number }` | 90 s |
| `studio.hideFixed` | `{}` | `{ hiddenCount: number }` | 10 s |
| `studio.restoreFixed` | `{}` | `{ restoredCount: number }` | 10 s |
| `studio.hideScrollbar` | `{ hidden: boolean }` | `{}` | 10 s |
| `studio.autoscroll.start` | `{ durationMs: number; easing: 'linear' \| 'inOutSine'; stops?: { selector: string; pauseMs: number }[] }` (`durationMs` 1000 a 600000; `stops` teto 30) | `{ totalScroll: number }` (resposta imediata; o fim chega em `frame.autoscroll.ended`) | 10 s |
| `studio.autoscroll.pause` | `{}` | `{ scrollY: number }` | 3 s |
| `studio.autoscroll.resume` | `{}` | `{ scrollY: number }` | 3 s |
| `studio.autoscroll.stop` | `{}` | `{ scrollY: number }` | 3 s |
| `studio.emulate` | `{ reducedMotionCss: boolean }` | `{ rulesRewritten: number; sheetsSkipped: number }` | 10 s |

Regras do agente:
- `studio.waitStable`: considera só imagens dentro da viewport; `image.decode()` com teto de 1500 ms; laço com teto de `maxMs`. Nunca fica sem responder (correção do P3).
- `studio.hideFixed`/`restoreFixed`: ocultam `position: fixed/sticky` via classe em `<html>` e estilo injetado pelo agente; idempotentes.
- `studio.hideScrollbar { hidden: true }` antes de print e de gravação; `false` ao terminar, inclusive em erro (`finally` no Estúdio).
- Watchdog do autoscroll no Estúdio: `durationMs + soma das pausas + 5000`. Pausa manual com teto de 10 min; depois o Estúdio envia `stop` e finaliza a gravação.

## 6. `bg.*`, `ui.*` e `rec.*` (Estúdio ↔ background ↔ offscreen)

O background só aceita `bg.*` de `sender.id === runtime.id`; como isso também vale para content scripts, não basta. Todo `bg.*` exige `sender.frameId === 0`, `sender.url` começando com `chrome-extension://<id>/studio.html` (`moz-extension://` no Firefox); não há outra página da extensão que envie `bg.*`. `onConnect` da Port `npv-studio` aplica a mesma checagem. Content script só envia `frame.*`. `rec.start`/`rec.stop` só são aceitos pelo offscreen se vierem do background (campo `target: 'offscreen'` fora do envelope, `sender.id` checado).

### 6.1 Regras do background

1. **Mutações serializadas:** `bg.studio.enable`, `bg.studio.disable`, `bg.scripts.sync`, abrir/focar Estúdio do `action.onClicked` (depois do pedido de permissão, §6.5), limpeza em `tabs.onRemoved`, `permissions.onAdded/onRemoved` e `runtime.onStartup` passam por uma única fila serial (uma promessa encadeada). Nenhum unregister/register de content script nem `updateSessionRules` fora dela (corrida observada no P1).
2. `frame.hello` só de `sender.frameId !== 0` em aba presente em `studioTabs`; `sender.id` checado em toda mensagem. O `origin` do `FrameInfo` vem de `sender.origin`/`sender.url`, nunca do payload do hello; `frameId` e `tabId` só de `sender`. Registra só se `tabId` estiver em `studioTabs`.
3. Estado que precisa sobreviver ao reinício do service worker fica em `storage.session` (§7.2), nunca em variável de módulo.
4. A Port `npv-studio` é o sinal de vida do Estúdio: `onDisconnect` dispara `disable` da aba na fila serial.
5. A cada boot do worker, dentro da fila serial, reconciliar `getSessionRules`/`getRegisteredContentScripts` com `storage.session`; o que não tiver aba viva em `studioTabs` é removido (`onStartup` não roda a cada despertar do worker). Não alterar `storage.session.setAccessLevel`: manter `TRUSTED_CONTEXTS` (content script não lê).

### 6.2 Mensagens `bg.*`

| type | De | Payload | `data` da resposta | Teto |
|---|---|---|---|---|
| `bg.studio.enable` | Estúdio | `{}` (aba = `sender.tab.id`) | `{ tabId: number; grantedOrigins: string[]; ruleIds: number[] }` | 10 s |
| `bg.studio.disable` | Estúdio | `{}` | `{}` | 10 s |
| `bg.scripts.sync` | Estúdio | `{}` | `{ origins: string[] }` | 10 s |
| `bg.frames.list` | Estúdio | `{}` | `{ frames: FrameInfo[] }` | 3 s |
| `bg.studio.launch` | Estúdio | `{}` (aba = `sender.tab.id`) | `StudioLaunch` (consome a entrada de `session:studioLaunch` daquela aba; sem entrada, devolve `{ url: null, notice: null, permission: 'not-requested' }`) | 3 s |
| `bg.rec.arm` | Estúdio | `RecConfig & { tryStartNow?: boolean }` | `{ armedUntil: number; started: boolean }` (expira em 60 s e só vale para a aba que armou). `tryStartNow`: o background tenta `getMediaStreamId` já; recusado pelo navegador, fica armado com `started: false`, sem erro | 3 s |
| `bg.rec.cancel` | Estúdio | `{}` | `{}` (desarma ou interrompe com `rec.stop`) | 10 s |
| `bg.rec.release` | Estúdio | `{ blobUrl: string }` | `{}` (offscreen revoga a URL e fecha). `blobUrl` precisa ser o emitido pelo offscreen para aquela gravação (`blob:chrome-extension://<id>/...`); qualquer outro valor: `NPV-BAD-REQUEST` | 10 s |

Reservado, sem contrato (entra por ADR antes da feature): `bg.tab.record` (gravar aba comum). Arquivados na v1.2 (ADR-016), não reutilizar o nome: `bg.tab.capture` (o "Print com moldura" é opção do painel de captura do Estúdio, sobre a tela aberta, com `captureVisibleTab` do próprio Estúdio), `bg.popup.openStudio`, `bg.rec.trigger`.

### 6.3 Gravação (Chromium)

Gravação sempre nasce de **gesto do usuário no ícone ou no atalho `_execute_action` com o Estúdio em primeiro plano** (POC P4: `tabCapture.getMediaStreamId` só aceita alvo com `activeTab`; o clique na página do site concede `activeTab` à aba do site, não ao Estúdio, por isso não existe gravação com um clique só a partir da página comum, ADR-016). Fluxo:

1. Estúdio entra no modo gravação (só a tela escolhida, zoom por aba para a tela ocupar a maior altura possível), envia `studio.hideScrollbar { hidden: true }` e `bg.rec.arm` com `RecConfig` e `tryStartNow: true` (o clique em "Gravar" é gesto dentro do Estúdio). `started: true`: segue no passo 3 sem pedir nada. `started: false`: a UI pede "Clique no ícone da extensão ou use o atalho para começar".
2. Gesto: `action.onClicked` com `tab.id` = Estúdio armado (§6.5; o atalho chega pelo mesmo evento). Armação expirada: `rec.failed` com `NPV-REC-GESTURE-REQUIRED` pela Port. Sem armação: `ui.actionClicked`. Gravando: o mesmo clique para (`rec.stop`). Pedido de `bg.rec.arm` com gravação já ativa ou armada: `NPV-REC-BUSY`.
3. Background: `tabCapture.getMediaStreamId({ targetTabId })`, cria o offscreen (`reasons: ['USER_MEDIA']`) se não existir, envia `rec.start`. Emite `rec.started` ao Estúdio pela Port.
4. Estúdio, ao receber `rec.started`, envia `studio.autoscroll.start`. Offscreen emite `rec.progress` a cada ~1 s.
5. Fim: offscreen responde `rec.start`; background emite `rec.done` (ou `rec.failed`). Estúdio faz `fetch(blobUrl)`, guarda no OPFS, envia `bg.rec.release`.

```ts
export type RecConfig = {
  rect: Rect;            // px físicos, relativo à viewport do Estúdio (área da tela gravada)
  viewport: Size;        // px físicos da viewport do Estúdio (innerWidth/innerHeight * devicePixelRatio)
  durationMs: number;    // 1000 a 600000
  outWidth: number;      // ex.: 1080 ou 1920; par; <= 3840
  outHeight: number;     // ex.: 1920 ou 1080; par; <= 3840
  fps: 30;
  backgroundColor: string;           // #rrggbb, preenche barras (POC: #111111)
  preferredCodecs: ('avc' | 'vp9')[];  // padrão ['avc', 'vp9']
};

export type RecStartPayload = RecConfig & { streamId: string };

export type RecResult = {
  blobUrl: string;
  codec: 'avc' | 'vp9';
  extension: 'mp4' | 'webm';
  mimeType: 'video/mp4' | 'video/webm';
  bytes: number;
  receivedFrames: number;
  encodedFrames: number;
  sourceRect: Rect;      // recorte efetivo no quadro do tabCapture, px do quadro
  videoSeconds: number;
  wallSeconds: number;
  stoppedEarly: boolean;
};
```

| type | Direção | Payload | Resposta | Teto |
|---|---|---|---|---|
| `rec.start` | background → offscreen | `RecStartPayload` | `Reply<RecResult>` | `durationMs + 30000` |
| `rec.stop` | background → offscreen | `{}` | `Reply<{}>`; o `rec.start` pendente resolve com `stoppedEarly: true` | 10 s |
| `rec.progress` | offscreen → background → Estúdio | `{ phase: 'starting' \| 'recording' \| 'finalizing'; elapsedMs: number; receivedFrames: number; encodedFrames: number }` | evento | |
| `rec.started` | background → Estúdio | `{ startedAt: number }` | evento | |
| `rec.done` | background → Estúdio | `RecResult` | evento | |
| `rec.failed` | background → Estúdio | `{ error: NpvError }` | evento | |

Regras do pipeline no offscreen (provadas no P4):
- **Recorte por escala e centralização:** o quadro do tabCapture contém a aba inteira escalada para caber e centralizada. `scale = min(frameW / viewport.width, frameH / viewport.height)`; `offsetX = (frameW - viewport.width * scale) / 2`; `offsetY = (frameH - viewport.height * scale) / 2`; `sourceRect = { x: offsetX + rect.x * scale, y: offsetY + rect.y * scale, width: rect.width * scale, height: rect.height * scale }`. Calculado no primeiro quadro.
- Composição em `OffscreenCanvas` com encaixe "contain" no `outWidth × outHeight`, barras na `backgroundColor`.
- **Duração exata:** `reader.read()` sempre em `Promise.race` contra o tempo restante (o tabCapture só emite em mudança). Quadros decimados para `fps`; se não chegar quadro novo no intervalo, **repete o último quadro** até `durationMs`.
- Codec: `getFirstEncodableVideoCodec(preferredCodecs, { width: outWidth, height: outHeight })`; nenhum: `NPV-ENCODER-UNSUPPORTED`. Mux com Mediabunny.

### 6.4 Firefox

Sem offscreen e sem tabCapture. O Estúdio grava a si mesmo com `getDisplayMedia` (seletor do navegador, que já é gesto) e `requestVideoFrameCallback`, usando o mesmo `RecConfig`/`RecResult` por chamada de função local (módulo `packages/capture/video`), sem mensagens `rec.*`. Recorte idêntico, com `viewport` = tamanho do quadro escolhido pelo usuário quando ele escolher a aba do Estúdio; outra superfície escolhida: `NPV-REC-FAILED` com `details.reason = 'wrong-surface'`. Validação no P5 (construção, antes da auditoria). No Firefox o clique no ícone sobre o Estúdio nunca inicia gravação (não há `rec.*`): emite `ui.actionClicked`.

### 6.5 Ícone e atalho (ADR-016)

Manifest sem `default_popup`. `commands`: só `_execute_action` (sugestão `Alt+Shift+P`), que dispara `action.onClicked` igual ao clique. Sem `contextMenus`.

```ts
export type StudioNotice =
  | 'browser-page'      // chrome:, edge:, about:, view-source:, outra extensão, aba sem tab.url
  | 'store-page'        // lojas de extensões (chromewebstore.google.com, chrome.google.com/webstore, microsoftedge.microsoft.com/addons, addons.mozilla.org)
  | 'file-access';      // file: sem "Permitir acesso a URLs de arquivo"

export type StudioLaunch = {
  url: string | null;                 // URL da aba de origem (http/https/file), <= 2048 caracteres; null = Estúdio vazio
  notice: StudioNotice | null;        // aviso de uma frase quando url é null por página não suportada
  permission: 'granted' | 'denied' | 'not-requested';   // resultado do pedido feito no gesto; 'denied' cobre recusa e rejeição por falta de gesto
};
```

Algoritmo do `action.onClicked(tab)` no background:

1. **Síncrono, antes de qualquer `await`:** classificar `tab.url`. Só URL `http:`/`https:`/`file:` dispara pedido de permissão (um Estúdio nunca tem esse esquema, então não há corrida com o worker recém-acordado). Sem `tab.url` ou com esquema de extensão: ler `session:studioTabs`; se `tab.id` estiver lá, vai ao passo 4, senão é página não suportada. URL suportada: `permissionPromise = permissions.request({ origins: [originPattern(tab.url)] })` dentro de `try` (`http://localhost/*` para localhost com porta; padrão de match não tem porta). Exceção síncrona ou rejeição: `permission = 'denied'`.
2. Aguardar `permissionPromise` fora da fila serial (o diálogo não bloqueia limpeza de DNR). Cliques repetidos na mesma aba enquanto o diálogo está aberto são ignorados (conjunto em memória, transitório).
3. Na fila serial: procurar em `session:studioOrigins` um Estúdio vivo com `originTabId === tab.id`.
   - Achou: `tabs.update(studioTabId, { active: true })`, `windows.update(windowId, { focused: true })`, evento `ui.openUrl` (`StudioLaunch`) pela Port. Port ausente (Estúdio carregando): grava em `session:studioLaunch` para o `bg.studio.launch`.
   - Não achou: grava `StudioLaunch` provisório, `tabs.create({ url: browser.runtime.getURL('/studio.html'), index: tab.index + 1, windowId: tab.windowId })`, registra `{ studioTabId, originTabId: tab.id }` e move o `StudioLaunch` para o `studioTabId`.
4. **Aba clicada é Estúdio:** `session:recording.state === 'armed'` com `tabId` igual e `armedUntil` no futuro: inicia (§6.3 passo 3). `'armed'` vencido: `rec.failed` `NPV-REC-GESTURE-REQUIRED` e volta a `idle`. `'recording'`: `rec.stop`. Outros: `ui.actionClicked`.

| type | Direção | Payload | Notas |
|---|---|---|---|
| `ui.openUrl` | background → Estúdio (Port) | `StudioLaunch` | Estúdio reaproveitado. Navega as telas só se `url` mudou; `permission: 'denied'` mostra o cartão de permissão |
| `ui.actionClicked` | background → Estúdio (Port) | `{ recording: 'idle' \| 'finalizing' }` | Clique no ícone sobre o Estúdio sem gravação para iniciar ou parar; a UI aponta o painel de captura |

Ao abrir, o Estúdio sempre chama `bg.studio.launch` antes de `bg.studio.enable` e depois trata `ui.openUrl` pela Port. Nunca lê URL de query string ou hash.

## 7. Armazenamento

Acesso só por `storage.defineItem` do WXT com `version` e `migrations`; todo valor lido passa pelo schema Valibot (falhou: volta ao padrão e loga `NPV-STORAGE-INVALID`). Sem dados pessoais, sem URLs visitadas em `storage.local`.

### 7.1 `storage.local`

| Chave | Tipo | Versão | Padrão | Migração |
|---|---|---|---|---|
| `local:settings` | `Settings` | 1 | ver tipo | v1 inicial |
| `local:devices.custom` | `CustomDevice[]` (teto 100) | 1 | `[]` | v1 inicial |
| `local:devices.favorites` | `string[]` de `presetId` (teto 100) | 1 | `[]` | v1 inicial; IDs inexistentes são removidos na leitura |
| `local:kits` | `Kit[]` (teto 50) | 1 | `[]` | v1 inicial |
| `local:captureDefaults` | `CaptureDefaults` | 1 | ver tipo | v1 inicial |

```ts
export type Settings = {
  locale: 'pt-BR' | 'en' | 'es' | 'auto';        // padrão 'auto'
  theme: 'dark' | 'light' | 'system';            // padrão 'system'
  maxScreens: number;                            // 1..16, padrão 8
  freezeOffscreenAfterMs: number;                // padrão 10000
  mirror: { scroll: boolean; click: boolean; navigate: boolean; input: boolean };  // padrão true, true, true, false
  emulateEnvInMainWorld: boolean;                // ADR-011, padrão false
};

export type CustomDevice = {
  id: string;                                    // UUID
  name: string;                                  // 1..60
  width: number; height: number;                 // px CSS, 200..7680
  dpr: number;                                   // 1..4
  type: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'tv';
  frame: 'none' | 'phone' | 'tablet' | 'laptop' | 'monitor';
  userAgentPresetId?: string;
};

export type Kit = {
  id: string;                                    // UUID
  name: string;                                  // 1..60
  deviceIds: string[];                           // presetId ou UUID, 1..16
  orientation: 'portrait' | 'landscape';
};

export type CaptureDefaults = {
  printMode: 'fast' | 'experience' | 'moments'; // padrão 'experience'
  imageFormat: 'png' | 'jpeg' | 'webp';          // padrão 'png'
  imageQuality: number;                          // 0.5..1, padrão 0.92 (jpeg/webp)
  videoFormat: 'mp4' | 'webm';                   // padrão 'mp4' (cai para webm sem H.264)
  videoSize: '1080x1920' | '1920x1080';          // padrão '1080x1920'
  videoDurationMs: number;                       // 3000..600000, padrão 15000
  mockup: { enabled: boolean; background: { kind: 'solid' | 'gradient'; colors: string[] } };
};
```

Regra de migração: cada salto de `version` tem função pura `(old) => new` em `packages/core/storage/migrations.ts`, com teste Vitest. Nunca apaga dado do usuário sem migrar.

### 7.2 `storage.session` (não persiste ao fechar o navegador)

| Chave | Tipo | Uso |
|---|---|---|
| `session:studioTabs` | `number[]` | Abas com Estúdio ativo |
| `session:dnrRules` | `{ tabId: number; ruleIds: number[] }[]` | Regras de sessão por aba (limpeza) |
| `session:frames` | `{ tabId: number; frames: FrameInfo[] }[]` | Frames aceitos no `frame.hello` |
| `session:recording` | `{ state: 'idle' \| 'armed' \| 'recording' \| 'finalizing'; tabId?: number; armedUntil?: number; config?: RecConfig; startedAt?: number }` | Máquina de estado da gravação |
| `session:studioOrigins` | `{ studioTabId: number; originTabId: number \| null }[]` (teto 50) | Reaproveitar o Estúdio da aba de origem (§6.5). `tabs.onRemoved` do Estúdio remove a linha; da origem, põe `originTabId: null` |
| `session:studioLaunch` | `{ studioTabId: number; launch: StudioLaunch }[]` (teto 50) | Entrega pendente ao `bg.studio.launch`; consumida na leitura |

Todas versão 1, sem migração (são descartadas no reinício).

### 7.3 Export/import de configurações

```ts
export type SettingsExport = {
  schema: 'neruz.pageview.settings';
  version: 1;
  exportedAt: string;        // ISO 8601
  data: { settings: Settings; devicesCustom: CustomDevice[]; devicesFavorites: string[]; kits: Kit[]; captureDefaults: CaptureDefaults };
};
```

Arquivo máximo 1 MB; validado inteiro com Valibot antes de gravar; erro: `NPV-STORAGE-INVALID`, nada é gravado parcialmente.

## 8. Tetos de tempo e de taxa

| Operação | Teto |
|---|---|
| Padrão de qualquer pedido sem linha própria | 10 s |
| `frame.hello` (lado do agente) | 3 s |
| Detecção de iframe bloqueado (sem `frame.hello` após `load`) | 8 s |
| `studio.waitStable` | 8 s (laço 4 s + decode 1,5 s + margem) |
| `studio.warmup` | 90 s |
| `rec.start` | `durationMs + 30 s` |
| `captureVisibleTab` | intervalo mínimo 600 ms (~2 por segundo, token bucket no Estúdio); fila cheia (> 200 pedidos): `NPV-CAPTURE-RATE` |
| Espelhamento de scroll | 60 mensagens/s por frame |

## 9. Organização em `packages/core`

```
packages/core/
├─ messaging/envelope.ts     Envelope, Reply, PROTOCOL_VERSION, helpers send/handle com teto
├─ messaging/errors.ts       NpvErrorCode, NpvError
├─ messaging/frame.ts        schemas e tipos frame.*
├─ messaging/studio.ts       schemas e tipos studio.*
├─ messaging/background.ts   schemas e tipos bg.*, ui.*, StudioLaunch
├─ messaging/recording.ts    RecConfig, RecResult, rec.*
├─ storage/items.ts          defineItem de §7
├─ storage/migrations.ts
└─ types.ts                  Size, Rect, ScrollAnchor, ElementLocator, Section, OverflowReport, FrameInfo
```

Cada tipo TS é derivado do schema Valibot (`v.InferOutput`), nunca escrito à parte.
