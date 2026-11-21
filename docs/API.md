# API interna: Neruz Page View

**CONGELADO 2026-11-21 v1.6** (protocolo `v: 1`). Qualquer mudança depois desta data exige ADR em [DECISOES.md](DECISOES.md) e aviso ao Maestro. Base: [ARQUITETURA.md](ARQUITETURA.md) §3, §4, §7 e o relatório da POC (P1 a P4 no Chrome, 2026-11-20).

Changelog:
- **v1.6 (ADR-021, ADR-022):** novo comando `studio.autoscroll.speed` (velocidade ao vivo na mini barra de gravação) com regra de recálculo da linha do tempo restante, teto pelo `RecConfig.durationMs` e folga de desaceleração no planejamento (§5, §5.1, §8); `AutoscrollTimeline` ganha `rate` e a função pura `retimeAutoscroll` (§9). §7.1 `local:devices.favorites`: aceita `presetId` do catálogo e `CustomDevice.id` de telas personalizadas existentes; regra de limpeza na leitura, na exclusão, no export e no import (ADR-022). Aditivo: `v` continua 1, nenhum formato gravado muda.
- **v1.5 (ADR-019, ADR-020):** recurso "Várias páginas" e relatório. Novos comandos `studio.collectLinks` e `studio.pageFacts` (§5); novos códigos `NPV-SITEMAP-FAILED`, `NPV-STORAGE-FULL` e `NPV-BATCH-LIMIT` (§2.1); nova chave `local:studio.batch` versão 1 (§7.1); tetos do lote, da leitura do sitemap e dos dois comandos (§8); nova §10 com tipos do lote (fila, estado, resultado por página e por tela), regras de lista, sitemap e links, permissões por origem, estrutura do ZIP, `relatorio.html`/`relatorio.json` e OPFS temporário com limpeza; `packages/core/batch` na §9. Mensagens existentes, `bg.*`, `rec.*` e `v` intactos: tudo é aditivo e a extensão é empacotada inteira.
- **v1.4 (ADR-018):** só armazenamento. `local:studio.framedCapture` sobe para versão 2: `background` ganha `'custom'`, novos `backgroundColor` (cor livre, `#RRGGBB`) e `scope` (`'fold' | 'full'`, "quanto da página"), com migração pura v1 → v2 (§7.1). Limites e validação de `local:settings`, `local:captureDefaults` e `local:devices.custom` registrados como estão no código (pacote 020), sem mudança de formato. Cada chave tem uma única declaração `defineItem` no app (`apps/page-view/src/features/storage/items.ts`); schemas, padrões e migrações em `packages/core/storage` (§7.1, §9). Export aceita `framedCapture` v1 ou v2 e grava sempre v2 (§7.3). Mensagens, `bg.*`, `rec.*` e `v` intactos.
- **v1.3 (ADR-017):** só armazenamento. Novas chaves `local:studio.onboarding` (`StudioOnboarding`) e `local:studio.framedCapture` (`FramedCapture`, preferência do "Print com moldura"), ambas versão 1 (§7.1); campo opcional `framedCapture` no export (§7.3); regra de onde vivem os `defineItem` de UI (§7.1). `local:devices.favorites` e `local:kits` conferidos contra o código: sem divergência. Contrato de vídeo (`bg.rec.*`, `rec.*`, `RecConfig`, `RecResult`) conferido contra `packages/core/messaging/recording.ts` antes da integração: **sem mudança**. `v` continua 1.
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
| `NPV-SITEMAP-FAILED` | Leitura do sitemap sem nenhuma URL aproveitável; `details.reason`: `'not-found' \| 'http' \| 'too-large' \| 'not-xml' \| 'cross-origin' \| 'network' \| 'timeout' \| 'empty'` (v1.5, §10.3) | `reason` `network`/`timeout`: sim; demais: não |
| `NPV-STORAGE-FULL` | OPFS ou memória temporária sem espaço (`QuotaExceededError`, teto de memória sem OPFS) (v1.5, §10.7) | não |
| `NPV-BATCH-LIMIT` | Lote acima de um teto da §10.1 (páginas, origens, capturas); `details.limit`: `'pages' \| 'origins' \| 'captures'` (v1.5) | não |
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
| `studio.autoscroll.speed` (v1.6) | `{ factor: number; maxRemainingMs: number }` (`factor` finito, `AUTOSCROLL_FACTOR_MIN` 0.25 a `AUTOSCROLL_FACTOR_MAX` 4; `maxRemainingMs` inteiro 0 a 600000) | `{ factor: number; isClamped: boolean; remainingMs: number; scrollY: number }` ou `NPV-BAD-REQUEST` com `details.reason: 'not-running'` | 3 s |
| `studio.emulate` | `{ reducedMotionCss: boolean }` | `{ rulesRewritten: number; sheetsSkipped: number }` | 10 s |
| `studio.collectLinks` (v1.5) | `{ max?: number }` (padrão e máximo 500) | `{ links: { url: string; text: string \| null }[]; total: number; truncated: boolean }` | 5 s |
| `studio.pageFacts` (v1.5) | `{}` | `{ url: string; title: string; httpStatus: number \| null; hasPasswordField: boolean }` | 3 s |

Regras do agente:
- `studio.collectLinks` (v1.5): percorre `document.links` (só o documento do frame, sem subframes) em ordem de documento; usa a propriedade `href` (já absoluta); mantém só `http:`/`https:` com `origin === location.origin`; ignora elementos com atributo `download`; remove o hash; descarta URL com mais de 2048 caracteres; deduplica por `href` normalizado. `text`: `aria-label` ou `textContent` com espaços colapsados, até 120 caracteres, `null` se vazio. `total` = links válidos encontrados antes do corte; `truncated: total > max`. O agente nunca segue link nem faz `fetch`.
- `studio.pageFacts` (v1.5): `url` = `location.href` (<= 2048, cortado); `title` = `document.title` com espaços colapsados, <= 200; `httpStatus` = `performance.getEntriesByType('navigation')[0].responseStatus` quando existir e for > 0, senão `null` (Chrome 109+, Firefox 129+); `hasPasswordField` = existe `input[type=password]` visível (`getClientRects().length > 0` e `visibility` diferente de `hidden`) no documento do frame. O agente não lê valor de campo nenhum.
- O Estúdio trata as duas respostas como dado da página (não confiável): revalida cada URL com `normalizePageUrl` (§10.2) e confere a origem contra o `FrameInfo.origin` do background, nunca contra o que o agente disse.
- `studio.waitStable`: considera só imagens dentro da viewport; `image.decode()` com teto de 1500 ms; laço com teto de `maxMs`. Nunca fica sem responder (correção do P3).
- `studio.hideFixed`/`restoreFixed`: ocultam `position: fixed/sticky` via classe em `<html>` e estilo injetado pelo agente; idempotentes.
- `studio.hideScrollbar { hidden: true }` antes de print e de gravação; `false` ao terminar, inclusive em erro (`finally` no Estúdio).
- Watchdog do autoscroll no Estúdio: `durationMs + soma das pausas + 5000`; depois de cada `studio.autoscroll.speed` aceito, passa a ser `agora + remainingMs + 5000` (§5.1). Pausa manual com teto de 10 min; depois o Estúdio envia `stop` e finaliza a gravação. O teto duro continua sendo `RecConfig.durationMs`: ao atingi-lo, o offscreen encerra o vídeo mesmo com a rolagem incompleta.

### 5.1 Velocidade ao vivo (`studio.autoscroll.speed`, v1.6, ADR-021)

Semântica de `factor`: multiplicador **absoluto** sobre a velocidade de rolagem do plano enviado em `studio.autoscroll.start` (a velocidade escolhida nas configurações do vídeo é `1`). Não é cumulativo: mandar `2` duas vezes resulta em `2`, não `4`. Só as partes de movimento mudam; pausas por seção (`stops[].pauseMs`), pausa marcada e pausa manual não são escaladas. Easing, posição das paradas e `totalScroll` não mudam.

Recálculo no agente (função pura `retimeAutoscroll` em `packages/core/scroll/autoscroll-timeline.ts`):
1. `e` = tempo decorrido atual do autoscroll (o mesmo `elapsedOf` usado no `step`, congelado se estiver em pausa manual).
2. Segmentos que terminaram até `e` ficam idênticos. O segmento em curso: se for `move`, é cortado em `e` (parte passada mantida; parte restante vai de `t(e)` até `toTime`); se for `pause`, mantém o `endMs` (pausa não acelera).
3. Cada `move` restante passa a durar `(toTime - fromTime) × plan.durationMs / rate`; `startMs`/`endMs` são reencadeados a partir de `e`. `totalMs` = fim do último segmento.
4. Invariante (com teste): `sampleAutoscroll(novo, x)` = `sampleAutoscroll(antigo, x)` para todo `x <= e`. A posição não salta; `startedAt`, `pausedAt` e `pausedTotalMs` do agente não mudam.
5. `AutoscrollTimeline.rate` guarda o fator vigente (`buildAutoscrollTimeline` cria com `1`).

```ts
export const AUTOSCROLL_FACTOR_MIN = 0.25;
export const AUTOSCROLL_FACTOR_MAX = 4;
export type AutoscrollTimeline = { plan: AutoscrollPlan; segments: AutoscrollSegment[]; totalMs: number; rate: number };
export type AutoscrollRemaining = { moveBaseMs: number; pauseLeftMs: number };
export function retimeAutoscroll(timeline: AutoscrollTimeline, elapsedMs: number, rate: number): AutoscrollTimeline;
export function measureAutoscrollRemaining(timeline: AutoscrollTimeline, elapsedMs: number): AutoscrollRemaining;
export function resolveAutoscrollFactor(requested: number, remaining: AutoscrollRemaining, maxRemainingMs: number): { factor: number; isClamped: boolean };
```

Teto (o vídeo não pode passar de `RecConfig.durationMs`, fixado no início e que o offscreen não estende):
- O Estúdio envia `maxRemainingMs = RecConfig.durationMs - (Date.now() - startedAt) - tailMs - SPEED_SAFETY_MS`, com `tailMs` do driver (padrão 400) e `SPEED_SAFETY_MS = 2000`; `startedAt` = `rec.started.startedAt` no Chromium, instante local do primeiro quadro no Firefox (§6.4); valor negativo vira `0`.
- O agente mede o que falta: `moveBaseMs` (soma, a `rate = 1`, dos movimentos restantes) e `pauseLeftMs` (resto da pausa em curso + pausas futuras). Fator mínimo viável: `moveBaseMs / (maxRemainingMs - pauseLeftMs)` se o denominador for > 0, senão `AUTOSCROLL_FACTOR_MAX`. Fator aplicado = `clamp(pedido, max(AUTOSCROLL_FACTOR_MIN, mínimo viável), AUTOSCROLL_FACTOR_MAX)`; `isClamped` = aplicado diferente do pedido. Acelerar nunca é limitado pelo teto.
- Resposta: `factor` aplicado, `remainingMs = totalMs - e` (sem contar pausas manuais futuras), `scrollY` atual.
- Sem autoscroll ativo (não iniciado ou já terminado): `NPV-BAD-REQUEST`, `details.reason: 'not-running'`. O Estúdio ignora em silêncio (corrida normal com o fim da rolagem).

Regras do Estúdio:
- Um pedido de velocidade por vez; cliques durante um pedido em voo guardam só o último valor e mandam ao voltar a resposta (sem fila).
- A UI mostra o `factor` da resposta, não o pedido; `isClamped: true` mostra aviso curto ("Mais devagar que isso não cabe no tempo do vídeo"). Valores oferecidos pela UI são decisão de UX dentro de 0.25 a 4 (sugestão: 0.5×, 1×, 1.5×, 2×).
- Após resposta: `expectedMs` da barra de progresso = `elapsedMs` do último `rec.progress` + `remainingMs` + `tailMs`; watchdog reiniciado como acima.
- Folga de desaceleração no plano: `RecConfig.durationMs = min(600000, scrollMs / SLOWEST_UI_FACTOR + pausas + 3000 + 120000)`, com `SLOWEST_UI_FACTOR` = menor fator que a UI oferece (0.5 na sugestão). Custo zero quando não se usa: o vídeo termina em `frame.autoscroll.ended` + `tailMs`, não no teto. Planos que batem 600000 são resolvidos pelo clamp.
- Velocidade disponível só com `stage === 'recording'`; Firefox usa o mesmo comando (é `studio.*`).

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
| `local:settings` | `Settings` | 1 | `DEFAULT_SETTINGS` (ver tipo) | v1 inicial; limites registrados na v1.4 sem mudança de formato |
| `local:devices.custom` | `CustomDevice[]` (teto 100) | 1 | `[]` | v1 inicial; item fora do schema invalida a lista inteira (volta a `[]` e loga) |
| `local:devices.favorites` | `string[]` de `presetId` do catálogo ou `CustomDevice.id` (teto 100) | 1 | `[]` | v1 inicial; limpeza conforme "Favoritos" abaixo (v1.6, ADR-022), sem mudança de formato |
| `local:kits` | `Kit[]` (teto 50) | 1 | `[]` | v1 inicial |
| `local:captureDefaults` | `CaptureDefaults` | 1 | `DEFAULT_CAPTURE_DEFAULTS` (ver tipo) | v1 inicial; limites registrados na v1.4 sem mudança de formato |
| `local:studio.onboarding` | `StudioOnboarding` | 1 | `{ hasSeenWelcome: false, hasSeenAddHint: false, isEssentialsOpen: true }` | v1 inicial (v1.3, ADR-017) |
| `local:studio.framedCapture` | `FramedCapture` | **2** | `{ isEnabled: true, frameDeviceId: null, background: 'ice', backgroundColor: '#C8D4E0', scope: 'fold' }` | v1 inicial (v1.3, ADR-017). v1 → v2 (v1.4, ADR-018): `migrateFramedCaptureV1ToV2` mantém os três campos e acrescenta `backgroundColor: '#C8D4E0'`, `scope: 'fold'`. `frameDeviceId` fora de `FrameKind` é lido como `null` |
| `local:studio.batch` | `BatchPreferences` | 1 | `{ pageLimit: 25, source: 'list' }` | v1 inicial (v1.5, ADR-019). `pageLimit` fora de 1..100 invalida o valor (volta ao padrão e loga). Não entra no export (estado de UI, como `onboarding`) |

Onde vivem os itens (v1.4, ADR-018):
- **Schemas Valibot, tipos, padrões (`DEFAULT_*`), limites (`MIN_*`/`MAX_*`) e migrações** de todas as chaves `local:*` ficam em `packages/core/storage` (`schemas.ts`, `migrations.ts`), código puro, sem dependência de WXT, com teste Vitest.
- **Cada chave tem exatamente uma declaração `storage.defineItem`**, em `apps/page-view/src/features/storage/items.ts`, com `version` e `migrations` desta tabela. Nenhum outro arquivo chama `defineItem` para chave `local:*`; `library/persistence.ts`, `settings/persistence.ts` e os stores importam os itens e as funções `load*`/`save*` de lá.
- A leitura passa por um único `readChecked` que, ao falhar, volta ao padrão e loga `NPV-STORAGE-INVALID` com a chave (nunca o valor).
- A gravação valida com o mesmo schema antes de `setValue`; valor inválido não é gravado.

Favoritos (`local:devices.favorites`, v1.6, ADR-022):
- Um ID é **válido** se existe no catálogo (`findDevice(id)`) **ou** na lista de telas personalizadas de referência. Só IDs que não existem em nenhum dos dois são removidos. Ordem preservada; duplicados removidos (fica a primeira ocorrência); teto 100 depois da limpeza.
- Leitura: `loadFavorites(customDeviceIds: readonly string[])` recebe os IDs de `local:devices.custom` já lidos (sem valor padrão: o parâmetro é obrigatório, para nenhum chamador esquecer as personalizadas). Quem lê favoritos lê `devices.custom` antes. A leitura filtra em memória e **não regrava** a chave (se `devices.custom` cair no padrão `[]` por erro de schema, os favoritos personalizados voltam quando a lista for corrigida ou reimportada).
- Excluir uma tela personalizada remove o ID dela dos favoritos na mesma ação, e grava as duas chaves.
- Export (§7.3): `devicesFavorites` = favoritos filtrados contra catálogo + IDs de `devicesCustom` do **mesmo** arquivo.
- Import: depois de validar o arquivo, filtra `devicesFavorites` contra catálogo + `devicesCustom` **importado**, grava `devices.custom` e `devices.favorites`, e o store da biblioteca recarrega os dois.

Limites de `local:settings` e `local:captureDefaults` (iguais ao código do pacote 020; constantes exportadas de `packages/core/storage/schemas.ts`):

| Campo | Regra |
|---|---|
| `Settings.maxScreens` | inteiro, `MIN_MAX_SCREENS` 1 .. `MAX_MAX_SCREENS` 16 |
| `Settings.freezeOffscreenAfterMs` | número ≥ 0 (0 = nunca congelar) |
| `CaptureDefaults.imageQuality` | `MIN_IMAGE_QUALITY` 0.5 .. `MAX_IMAGE_QUALITY` 1 |
| `CaptureDefaults.videoDurationMs` | 3000 .. 600000 |
| `CaptureDefaults.mockup.background.colors` | `#RRGGBB`, 1 .. 4 itens (v1.4 fecha o formato; valor gravado fora dele é inválido e volta ao padrão) |
| `CustomDevice.name` | 1 .. 60 caracteres, `trim` aplicado antes de validar |
| `CustomDevice.width`, `height` | 200 .. 7680 px CSS, inteiros |
| `CustomDevice.dpr` | 1 .. 4 |
| `CustomDevice.id` | UUID (`v.uuid()`) |

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

export type StudioOnboarding = {
  hasSeenWelcome: boolean;                       // boas-vindas da biblioteca já fechada
  hasSeenAddHint: boolean;                       // dica "adicionar tela" já vista
  isEssentialsOpen: boolean;                     // seção "Essenciais" da biblioteca aberta
};

export type FrameKind = 'phone' | 'foldable' | 'tablet' | 'laptop' | 'desktop';   // DeviceCategory sem 'tv'
export type FrameBackground = 'ice' | 'night' | 'petrol' | 'transparent';
export type FramedScope = 'fold' | 'full';      // 'fold' = só a primeira dobra; 'full' = página inteira dentro da moldura

export type FramedCapture = {                    // versão 2 (v1.4)
  isEnabled: boolean;                            // "Print com moldura" ligado no painel de captura
  frameDeviceId: FrameKind | null;               // nome mantido por compatibilidade: guarda a moldura escolhida; null = moldura do tipo da tela ativa
  background: FrameBackground | 'custom';        // 'custom' = usa backgroundColor
  backgroundColor: string;                       // /^#[0-9A-F]{6}$/ (gravado em maiúsculas), padrão '#C8D4E0'; guardado mesmo com background predefinido (última cor livre)
  scope: FramedScope;                            // padrão 'fold'
};

export type FramedCaptureV1 = {                  // só leitura: migração e import de arquivo v1.3
  isEnabled: boolean;
  frameDeviceId: FrameKind | null;
  background: FrameBackground;
};

export type BatchPreferences = {                 // v1.5
  pageLimit: number;                             // inteiro, MIN_PAGE_LIMIT 1 .. MAX_PAGE_LIMIT 100, padrão DEFAULT_PAGE_LIMIT 25
  source: BatchSource;                           // última fonte usada no alvo "Várias páginas", padrão 'list'
};
```

`FramedCapture` é a fonte da verdade do "Print com moldura" (ADR-016 item 5). `CaptureDefaults.mockup` fica para o editor de mockup e para o vídeo; os dois não se sincronizam.

Mapeamento para o compositor: `background === 'custom'` → `{ kind: 'color', color: backgroundColor }`; senão `{ kind: 'preset', id: background }`. Escolher predefinido não apaga `backgroundColor`. O seletor de cor grava a cada confirmação (não a cada movimento do controle; arraste contínuo usa debounce de 300 ms).

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
  data: { settings: Settings; devicesCustom: CustomDevice[]; devicesFavorites: string[]; kits: Kit[]; captureDefaults: CaptureDefaults; framedCapture?: FramedCapture };
};
```

`framedCapture` é opcional (v1.3): arquivo sem ele mantém o valor atual. `local:studio.onboarding` nunca entra no export.

v1.4: `SettingsExport.version` continua `1`. No import, `framedCapture` é validado como `FramedCapture` (v2) **ou** `FramedCaptureV1`; v1 passa por `migrateFramedCaptureV1ToV2` antes de gravar. O export grava sempre v2. Arquivo da v1.4 aberto por build v1.3 é rejeitado inteiro (`NPV-STORAGE-INVALID`); aceito, não há build v1.3 publicada.

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
| `studio.collectLinks` (v1.5) | 5 s |
| `studio.pageFacts` (v1.5) | 3 s |
| `studio.autoscroll.speed` (v1.6) | 3 s; um pedido em voo por vez, último valor vence |
| Lote: carregar uma página (troca de `src` até `frame.ready` em cada tela) | 8 s até `frame.hello` (senão `iframe-blocked`) e 30 s até `frame.ready` (senão `load-timeout`) |
| Lote: capturar uma página em uma tela (estabilidade, aquecimento, costura, moldura, gravação no OPFS) | 180 s (senão `capture-timeout`) |
| Lote: nova tentativa de captura após `NPV-CAPTURE-RATE`/`NPV-CAPTURE-FAILED` | 1 tentativa, após 1 s |
| Sitemap: um arquivo (fetch + leitura) | 15 s |
| Sitemap: leitura inteira (todos os arquivos) | 60 s, até 50 arquivos |
| ZIP: montagem | sem teto fixo; progresso a cada entrada; cancelável (`NPV-ABORTED`) |

## 9. Organização em `packages/core`

```
packages/core/
├─ messaging/envelope.ts     Envelope, Reply, PROTOCOL_VERSION, helpers send/handle com teto
├─ messaging/errors.ts       NpvErrorCode, NpvError
├─ messaging/frame.ts        schemas e tipos frame.*
├─ messaging/studio.ts       schemas e tipos studio.*
├─ messaging/background.ts   schemas e tipos bg.*, ui.*, StudioLaunch
├─ messaging/recording.ts    RecConfig, RecResult, rec.*
├─ scroll/autoscroll-timeline.ts  buildAutoscrollTimeline, sampleAutoscroll, retimeAutoscroll, measureAutoscrollRemaining, resolveAutoscrollFactor, AUTOSCROLL_FACTOR_MIN/MAX (puro, com teste; v1.6)
├─ storage/schemas.ts        schemas Valibot, tipos, DEFAULT_* e limites de §7 (sem WXT)
├─ storage/migrations.ts     funções puras (old) => new, com teste
├─ batch/types.ts            schemas e tipos da §10 (BatchConfig, BatchState, BatchPage, ScreenResult, BatchReport...) e constantes de teto
├─ batch/url.ts              normalizePageUrl, isSamePage, parseUrlList, originPattern do lote (puro, com teste)
├─ batch/sitemap.ts          parseSitemapDocument(doc: Document), parseRobotsSitemaps(text), parseSitemapText(text) (puro; o fetch fica no app)
├─ batch/paths.ts            rootFolderName, pageFolderName, screenFolderName, fileName, sanitizeZipPath (puro, com teste)
├─ batch/eta.ts              estimateRemainingMs (puro, com teste)
├─ batch/report.ts           buildBatchReport (estado → BatchReport) e renderReportHtml (BatchReport + textos + miniaturas → string), puro, com teste de escape
└─ types.ts                  Size, Rect, ScrollAnchor, ElementLocator, Section, OverflowReport, FrameInfo
```

Cada tipo TS é derivado do schema Valibot (`v.InferOutput`), nunca escrito à parte.

As declarações `storage.defineItem` (dependem de WXT) ficam fora de `packages/core`, num único arquivo do app: `apps/page-view/src/features/storage/items.ts` (v1.4, ADR-018).

O código do app do lote fica em `apps/page-view/src/features/batch/` (dono: frontend-engineer): store, executor da fila, leitura do sitemap (fetch), OPFS, worker do ZIP e UI.

## 10. Várias páginas e relatório (v1.5, ADR-019 e ADR-020)

Tudo roda no Estúdio. Não há mensagem nova no background: o lote usa as telas já abertas, `captureVisibleTab` do próprio Estúdio (motor da §4.1 da ARQUITETURA), `bg.scripts.sync` depois de permissões novas e os dois comandos novos do agente (§5). O estado do lote vive só na memória do Estúdio (store Zustand); fechar o Estúdio encerra o lote e apaga os temporários.

### 10.1 Constantes e tetos

```ts
export const DEFAULT_PAGE_LIMIT = 25;
export const MIN_PAGE_LIMIT = 1;
export const MAX_PAGE_LIMIT = 100;
export const MAX_BATCH_CAPTURES = 400;        // páginas × telas
export const MAX_BATCH_ORIGINS = 10;          // origens distintas num lote
export const MAX_CANDIDATES = 5000;           // URLs na lista de revisão antes do corte por pageLimit
export const MAX_COLLECTED_LINKS = 500;       // studio.collectLinks
export const MAX_LIST_INPUT_CHARS = 200_000;  // texto colado
export const MAX_PAGE_URL_LENGTH = 2048;
export const SITEMAP_MAX_FILE_BYTES = 5 * 1024 * 1024;   // por arquivo, depois de descompactar
export const SITEMAP_MAX_DEPTH = 2;           // aninhamento abaixo do arquivo informado
export const SITEMAP_MAX_FILES = 50;
export const PAGE_LOAD_TIMEOUT_MS = 30_000;
export const SCREEN_CAPTURE_TIMEOUT_MS = 180_000;
export const ZIP_PART_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const MEMORY_FALLBACK_MAX_BYTES = 512 * 1024 * 1024;
```

Validação no "Começar": `urls.length` em 1..`pageLimit` (lista maior é cortada na revisão, nunca em silêncio: a UI mostra quantas ficaram de fora); `urls.length × screens.length <= 400`; origens distintas <= 10. Falhou: `NPV-BATCH-LIMIT` com `details.limit`, e o botão explica o teto em uma frase. Lote não começa com gravação ativa ou armada (`session:recording.state !== 'idle'`): botão desabilitado.

### 10.2 Lista de URLs (fonte `'list'`) e normalização

`normalizePageUrl(raw: string, base?: string): { ok: true; url: string } | { ok: false; reason: 'invalid' | 'scheme' | 'too-long' | 'not-page' }`:
1. `trim`; vazio é ignorado (não conta). Sem esquema e começando com `/`: resolve contra `base` (URL da tela 1, se houver). Sem esquema e sem `/` (ex.: `site.com/sobre`): prefixa `https://`.
2. `new URL()`; falhou: `invalid`. Esquema diferente de `http:`/`https:`: `scheme`. Mais de 2048 caracteres: `too-long`.
3. Remove o hash e usuário/senha da URL; porta padrão some (o `URL` já faz). Mantém a query.
4. Caminho terminado em extensão de arquivo que não é página (`pdf, zip, rar, 7z, gz, jpg, jpeg, png, gif, webp, avif, svg, ico, mp4, webm, mov, mp3, wav, xml, json, txt, csv, css, js, woff, woff2, ttf, doc, docx, xls, xlsx, ppt, pptx`): `not-page`.

`parseUrlList(text, base?)`: corta o texto em 200 000 caracteres; separadores: quebra de linha, espaço, tabulação, vírgula, ponto e vírgula. Retorna `CandidateList` com a ordem original, sem duplicadas (comparação pelo `url` normalizado) e contagem de descartes por motivo.

`isSamePage(a, b)`: mesma origem e mesmo `pathname` sem a barra final; query e hash ignorados. Usado na detecção de redirecionamento.

### 10.3 Sitemap (fonte `'sitemap'`)

Fetch feito pelo Estúdio (página da extensão com permissão de host da origem; sem CORS). Entrada: URL digitada ou, vazio, a origem da tela 1.

1. **Permissão antes de qualquer `await`:** no clique em "Ler sitemap", a primeira instrução é `permissions.request({ origins: [originPattern(url)] })` (mesma regra da §6.5; já concedida, não abre diálogo). Recusa: `NPV-PERMISSION-DENIED`, cartão de permissão. Concedida: `bg.scripts.sync` e segue.
2. **Descoberta:** caminho terminado em `.xml`, `.xml.gz` ou `.txt`: usa a URL. Senão (origem ou outra página): lê `<origem>/robots.txt` e usa as linhas `Sitemap:` da mesma origem (até 5); nenhuma: tenta `<origem>/sitemap.xml` e depois `<origem>/sitemap_index.xml`. Nada encontrado: `NPV-SITEMAP-FAILED` `reason: 'not-found'`.
3. **Fetch de cada arquivo:** `fetch(url, { credentials: 'omit', cache: 'no-store', redirect: 'follow', signal })`, `signal` = teto de 15 s por arquivo combinado com o de 60 s da leitura inteira e com o Cancelar. `new URL(response.url).origin` diferente da origem do sitemap: arquivo descartado (`cross-origin`). `!response.ok`: `http` (guarda `status`). Corpo lido por `reader.read()` com soma de bytes; passou de 5 MB: aborta o arquivo (`too-large`). Primeiros bytes `1F 8B`: passa por `DecompressionStream('gzip')`, com o mesmo teto de 5 MB aplicado ao descompactado.
4. **Leitura:** `.txt` ou `content-type` `text/plain`: uma URL por linha (`parseSitemapText`). Senão `new DOMParser().parseFromString(text, 'application/xml')`; `parsererror`: `not-xml`. Raiz por `localName` (namespace ignorado): `urlset` → cada `url > loc`; `sitemapindex` → cada `sitemap > loc`, que entra na fila de arquivos com `level + 1`. O arquivo informado é nível 0; índice que apareça no nível 2 não é seguido (conta em `beyondDepth`). `lastmod`, `priority` e `changefreq` são ignorados. Nunca executa nem carrega nada referenciado no XML.
5. **Filtro:** cada `loc` passa por `normalizePageUrl`; origem diferente da do sitemap: `offOrigin`, descartada. Para ao chegar em 5000 candidatos (`truncated: true`) ou 50 arquivos.
6. Resultado sem nenhuma URL: `NPV-SITEMAP-FAILED` com o `reason` do arquivo raiz (ou `empty`). Com URLs: `SitemapResult`, mesmo com arquivos falhos (viram fato na revisão).

```ts
export type SitemapFile = {
  url: string;
  level: 0 | 1 | 2;
  status: 'ok' | 'failed' | 'skipped';
  reason: 'http' | 'too-large' | 'not-xml' | 'cross-origin' | 'network' | 'timeout' | 'beyond-depth' | 'file-limit' | null;
  httpStatus: number | null;
  urlCount: number;
};

export type SitemapResult = CandidateList & { files: SitemapFile[] };   // teto 50 arquivos
```

### 10.4 Links internos (fonte `'links'`)

Um nível só, sem rastrear: o Estúdio envia `studio.collectLinks` ao frame da tela 1 (ou da tela escolhida), revalida cada URL (§5, regras do agente) e monta a `CandidateList`. A URL da própria página entra primeiro. Origem é a do `FrameInfo` daquela tela; link de outra origem não entra.

### 10.5 Fila, estado e resultado

```ts
export type BatchSource = 'list' | 'sitemap' | 'links';

export type CandidateList = {
  source: BatchSource;
  urls: string[];                          // normalizadas, únicas, na ordem da fonte, teto MAX_CANDIDATES
  discarded: { invalid: number; scheme: number; tooLong: number; notPage: number; duplicate: number; offOrigin: number; beyondDepth: number };
  truncated: boolean;
};

export type BatchScreen = {
  screenId: ScreenId;
  presetId: string;
  label: string;                           // nome do aparelho, <= 60
  width: number; height: number;           // px CSS no início do lote
  dpr: number;
  orientation: 'portrait' | 'landscape';
  folder: string;                          // §10.6
};

export type BatchConfig = {
  id: string;                              // crypto.randomUUID()
  source: BatchSource;
  urls: string[];                          // 1..pageLimit
  screens: BatchScreen[];                  // 1..16, na ordem do Estúdio
  printMode: 'fast' | 'experience' | 'moments';
  imageFormat: 'png' | 'jpeg' | 'webp';
  imageQuality: number;                    // 0.5..1
  framed: FramedCapture | null;            // cópia do painel no início; null = sem "Print com moldura"
  locale: 'pt-BR' | 'en' | 'es';           // idioma do relatório, resolvido de Settings.locale no início
  createdAt: number;
};

export type PageStatus = 'pending' | 'loading' | 'capturing' | 'done' | 'partial' | 'failed' | 'skipped' | 'cancelled';
export type ScreenStatus = 'pending' | 'done' | 'failed' | 'skipped' | 'cancelled';

export type PageIssue =
  | 'iframe-blocked'       // sem frame.hello em 8 s ou chrome-error:// (inclui redirecionamento para origem sem acesso)
  | 'load-timeout'         // frame.hello recebido, sem frame.ready em 30 s
  | 'login-redirect'       // URL final não é a pedida (isSamePage falso) e há campo de senha visível: a página não é capturada
  | 'agent-missing'        // NPV-FRAME-NOT-FOUND ou NPV-VERSION-MISMATCH depois do hello
  | 'permission-missing'   // origem sem permissão no momento da página
  | 'capture-timeout'      // passou de SCREEN_CAPTURE_TIMEOUT_MS
  | 'capture-failed'       // NPV-CAPTURE-FAILED/NPV-CAPTURE-RATE após a nova tentativa, NPV-CANVAS-LIMIT, erro de codificação
  | 'storage-full';        // NPV-STORAGE-FULL ao gravar

export type PageNote =
  | 'redirected'           // URL final diferente da pedida (isSamePage falso), capturada mesmo assim
  | 'http-error'           // httpStatus >= 400, capturada mesmo assim (a página de erro é o fato)
  | 'password-field'       // campo de senha visível sem redirecionamento, capturada
  | 'stable-timeout'       // studio.waitStable com timedOut em alguma tela
  | 'split-into-parts';    // print dividido em partes (limite de canvas) em alguma tela

export type ScreenResult = {
  screenId: ScreenId;
  status: ScreenStatus;
  issue: PageIssue | null;
  error: NpvError | null;                  // técnico; só no relatorio.json
  stableMs: number | null;                 // frame.stable.sinceLoadMs
  stableTimedOut: boolean;
  scrollHeight: number | null;             // px CSS
  overflow: OverflowReport | null;         // studio.measure
  parts: number;                           // partes do print; 0 sem print
  files: string[];                         // caminhos relativos à raiz do ZIP, teto 40
  durationMs: number | null;
};

export type BatchPage = {
  index: number;                           // 1..100, ordem da fila
  url: string;                             // pedida
  finalUrl: string | null;                 // studio.pageFacts da primeira tela que respondeu
  title: string | null;                    // <= 200, texto puro
  httpStatus: number | null;
  status: PageStatus;
  issue: PageIssue | null;                 // falha que vale para a página inteira (ex.: login-redirect)
  notes: PageNote[];                       // sem repetição
  folder: string;                          // §10.6
  startedAt: number | null;
  endedAt: number | null;
  screens: ScreenResult[];                 // mesma ordem de BatchConfig.screens
};

export type BatchPhase = 'idle' | 'collecting' | 'reviewing' | 'running' | 'paused' | 'exporting' | 'done' | 'cancelled';
export type BatchPauseReason = 'user' | 'hidden' | 'storage-full';

export type BatchState = {
  phase: BatchPhase;
  pauseReason: BatchPauseReason | null;
  candidates: CandidateList | null;        // fase 'reviewing'
  config: BatchConfig | null;
  pages: BatchPage[];
  currentIndex: number | null;             // contador "12 de 40" = currentIndex de pages.length
  startedAt: number | null;
  endedAt: number | null;
  etaMs: number | null;                    // null = calculando
  exportParts: { fileName: string; bytes: number }[];
};
```

Status da página no fim: todas as telas `done` → `done`; algumas → `partial`; nenhuma → `failed`. `issue` da página só quando a falha vale para todas as telas (`login-redirect`, ou a mesma `issue` em todas).

**Algoritmo por página (serial; nunca duas páginas ao mesmo tempo):**
1. Antes da primeira página: no clique em "Começar", primeira instrução `permissions.request({ origins: <padrões de todas as origens do lote> })` (já concedidas não abrem diálogo; recusa parcial: páginas das origens negadas ficam `failed` com `permission-missing` sem tentar). Depois `bg.scripts.sync`. O Estúdio suspende o espelhamento (ignora `frame.scroll/click/input/navigate` para espelhar), o congelamento de telas fora da vista (`freezeOffscreenAfterMs`) e guarda a URL atual de cada tela para restaurar no fim.
2. `loading`: troca o atributo `src` de todos os iframes para `url` (não usa `studio.navigate`, que depende de agente vivo). Por tela: sem `frame.hello` em 8 s → `iframe-blocked`; com hello e sem `frame.ready` em 30 s → `load-timeout`.
3. `studio.pageFacts` na primeira tela pronta. `!isSamePage(url, finalUrl) && hasPasswordField` → página `failed`, `issue: 'login-redirect'`, sem captura. Senão anota `redirected`, `http-error` e `password-field` conforme o caso.
4. `capturing`: uma tela por vez, na ordem: `studio.waitStable`, modo de print de `BatchConfig.printMode` (mesmo motor e mesmas regras de `hideFixed`/`hideScrollbar` com `finally`), `studio.measure` (rolagem lateral), "Print com moldura" se `framed`, miniatura (§10.8), gravação no OPFS. Teto de 180 s por tela; `NPV-CAPTURE-RATE`/`NPV-CAPTURE-FAILED` tem uma nova tentativa após 1 s.
5. Fecha a página (`endedAt`, status), recalcula `etaMs` e segue.
6. Fim do lote (ou cancelamento): restaura o `src` de cada tela, o espelhamento e o congelamento; `phase: 'done'` ou `'cancelled'`; passa para a exportação.

**Controles:** Pausar (termina a tela em andamento e para; `pauseReason: 'user'`); Retomar; Pular página (aborta a página atual por `AbortSignal`, telas restantes `skipped`, página `skipped`); Cancelar (aborta a atual, restantes `cancelled`, oferece baixar o que já foi feito). Aba do Estúdio oculta (`visibilitychange` para `hidden`) pausa sozinha com `pauseReason: 'hidden'`, porque `captureVisibleTab` captura a aba visível; volta sozinha ao ficar visível. Com o lote rodando, `beforeunload` pede confirmação.

**Estimativa (`estimateRemainingMs`):** antes da primeira página concluída, `restantes × telas × base` com `base` = 8 s (`fast`), 25 s (`experience`), 20 s (`moments`), mais 5 s de carga por página; depois, média das últimas 5 páginas concluídas × páginas restantes. A UI arredonda para minutos ("cerca de 6 min").

### 10.6 Estrutura do ZIP

```
neruz-page-view_<host>_<AAAA-MM-DD_HHmm>/
├─ relatorio.html
├─ relatorio.json
├─ 001-inicio/
│  ├─ 01-iphone-15/
│  │  ├─ print.<ext>                      ou print-parte-01.<ext>, print-parte-02.<ext>...
│  │  ├─ momentos/momento-01.<ext>...     só no modo 'moments'
│  │  └─ moldura.<ext>                    só com "Print com moldura"
│  └─ 02-galaxy-s24/...
└─ 002-sobre/...
```

Regras de nome (`packages/core/batch/paths.ts`):
- `<host>`: `hostname` da primeira página (IDN em punycode, como vem do `URL`), porta vira `-<porta>`; lote com mais de uma origem: `<host>-mais-<n>`. `<AAAA-MM-DD_HHmm>`: hora local do início. O arquivo baixado tem o mesmo nome + `.zip`.
- Pasta da página: índice com 3 dígitos + `-` + slug do `pathname` (segmentos unidos por `-`, `NFD` sem diacríticos, minúsculas, fora de `[a-z0-9]` vira `-`, repetidos colapsados, no máximo 48 caracteres); caminho vazio: `inicio`.
- Pasta da tela: posição com 2 dígitos + `-` + slug do `label` (mesma regra, no máximo 40); vazio: `tela`.
- `<ext>`: `png`, `jpg` ou `webp` (de `imageFormat`). Partes e momentos com 2 dígitos.
- `sanitizeZipPath` em toda entrada: só `[a-z0-9._/-]`, sem `..`, sem `/` inicial, no máximo 200 caracteres. Nenhum dado da página (título, texto de link) entra em nome de arquivo.
- Montagem por streaming com `fflate` (`Zip` + `ZipPassThrough`, sem compressão, as imagens já são comprimidas) num worker dedicado, lendo os arquivos do OPFS e escrevendo `export.zip` no OPFS por `createSyncAccessHandle`. Progresso por entrada.
- **Partes:** ZIP de até 2 GB e 65 000 entradas (sem ZIP64). Acima disso, divide por página (página nunca é partida) em `<nome>_parte-1-de-N.zip`... Cada parte leva o `relatorio.html` e o `relatorio.json` completos; link relativo só para arquivos da própria parte, os demais mostram "na parte N". Cada parte é baixada por um clique próprio.
- Download: `File` do OPFS → `URL.createObjectURL` → `<a download>` (sem permissão `downloads`).

### 10.7 OPFS temporário e limpeza

- Raiz `npv-tmp/`. Cada Estúdio aberto gera `sessionId = crypto.randomUUID()` e segura, enquanto a página viver, o Web Lock exclusivo `npv-tmp:<sessionId>` (`navigator.locks.request` com promessa que não resolve).
- Lote: `npv-tmp/<sessionId>/batch-<batchId>/files/<caminho do ZIP>`, `.../thumbs/` e `.../export.zip` (ou `export-parte-N.zip`).
- **Limpeza:**
  1. Ao abrir o Estúdio: lista `npv-tmp/*` e apaga (`removeEntry(name, { recursive: true })`) toda pasta cujo lock `npv-tmp:<nome>` não aparece em `navigator.locks.query().held`. Assim um Estúdio nunca apaga o lote de outro aberto ao mesmo tempo.
  2. Depois de exportar: apaga a pasta do lote 2 minutos após o último download iniciado, ou antes, ao clicar em "Novo lote"/"Concluir".
  3. Cancelar sem exportar e fechar o resultado: apaga na hora.
  4. `pagehide`: tentativa sem espera de apagar `npv-tmp/<sessionId>`; o que sobrar sai no passo 1 da próxima abertura.
- Antes de começar: `navigator.storage.estimate()`; se `quota - usage` for menor que `capturas × 8 MB`, aviso de uma frase, sem bloquear. `QuotaExceededError` ao gravar: `NPV-STORAGE-FULL`, lote pausado com `pauseReason: 'storage-full'` e opção de exportar o que já foi feito.
- Sem OPFS (ex.: janela privada do Firefox, `getDirectory` rejeita): arquivos em memória (`Blob`) com teto de 512 MB somados; passou: `NPV-STORAGE-FULL`. ZIP montado em memória no mesmo worker.
- Nada do lote vai para `storage.local` ou `storage.session`, só `local:studio.batch` (preferências).

### 10.8 Relatório (`relatorio.html` e `relatorio.json`)

Só fatos medidos. Proibido: nota, pontuação, adjetivo de qualidade ("bom", "ruim", "lento"), recomendação, comparação com outros sites, texto gerado sobre o conteúdo da página.

```ts
export type BatchReport = {
  schema: 'neruz.pageview.batch-report';
  version: 1;
  generatedAt: string;                     // ISO 8601 UTC
  extensionVersion: string;                // runtime.getManifest().version
  browser: string;                         // ex.: 'Chrome 142', 'Firefox 146' (marca e versão maior)
  locale: 'pt-BR' | 'en' | 'es';
  source: BatchSource;
  startedAt: string; endedAt: string;      // ISO 8601 UTC
  durationMs: number;
  printMode: BatchConfig['printMode'];
  imageFormat: BatchConfig['imageFormat'];
  framed: boolean;
  screens: BatchScreen[];
  totals: { requested: number; done: number; partial: number; failed: number; skipped: number; cancelled: number };
  pages: (Omit<BatchPage, 'startedAt' | 'endedAt'> & { startedAt: string | null; endedAt: string | null; part: number })[];
  parts: number;
};
```

`relatorio.json` é esse objeto. `relatorio.html` é gerado por `renderReportHtml(report, strings, thumbnails)`, função pura:
- **Documento:** HTML5 autocontido, `lang` do `locale`, CSS embutido (tokens do DESIGN-SYSTEM, tema claro, legível impresso), **nenhum script**, `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">`.
- **Escape:** todo texto vindo da página ou do usuário (URL, título, seletores de `overflow`) passa por escape de HTML (`& < > " '`). Link para a página só se `http:`/`https:`, com `rel="noopener noreferrer"`. Links para arquivos são relativos e gerados por `paths.ts`.
- **Conteúdo, nesta ordem:**
  1. Cabeçalho: título fixo, host(s), início e fim (data e hora local formatadas com `Intl.DateTimeFormat` do `locale` e o fuso), duração, versão da extensão, navegador.
  2. Resumo: páginas pedidas, concluídas, parciais, com falha, puladas, canceladas; fonte (lista, sitemap, links); modo de print; formato; com ou sem moldura; tabela de telas (nome, largura × altura em px CSS, DPR, orientação).
  3. Por página: número, URL pedida, URL final (se diferente), título, status HTTP (se conhecido), resultado e frases fixas dos `notes`/`issue`. Tabela por tela: resultado, tempo até estável (segundos com 1 casa; "não estabilizou em 4 s" quando `stableTimedOut`), altura da página (px), rolagem lateral ("não" ou "<n> px" + até 5 seletores), partes, links dos arquivos e miniatura.
  4. Ocorrências: lista das páginas com `issue`, uma frase fixa por tipo.
  5. Rodapé fixo (abaixo).
- **Miniaturas:** primeira dobra de cada (página, tela) com `done`, até 320 px de largura, WebP qualidade 0,7 (JPEG 0,7 se o navegador não codificar WebP), embutidas como `data:`. Com o teto de 400 capturas, o relatório fica na casa de 10 MB.
- **Textos:** chaves `report.*` na fonte YAML do i18n (ADR-012): `report.title`, `report.summary.*`, `report.status.<PageStatus>`, `report.issue.<PageIssue>`, `report.note.<PageNote>`, `report.column.*`, `report.generatedBy`. O copywriter escreve os textos nos 3 idiomas, só com fatos; `report.footer` é fixo:

| Idioma | `report.footer` (fixo, não editar sem ADR) |
|---|---|
| pt-BR | Capturas geradas automaticamente para apoiar sua revisão. Vale a conferência do profissional responsável pelo projeto. |
| en | Screenshots generated automatically to support your review. It's worth having them checked by the professional responsible for the project. |
| es | Capturas generadas automáticamente para apoyar tu revisión. Conviene que las revise el profesional responsable del proyecto. |

Abaixo do rodapé, `report.generatedBy`: "Gerado por Neruz Page View <versão>" (e equivalentes), sem link.

Relatório em PDF e vídeo/GIF por página não fazem parte do lote na v1.5 (ADR-019).
