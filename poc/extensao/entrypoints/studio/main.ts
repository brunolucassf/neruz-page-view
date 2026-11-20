import { DESKTOP, PHONE, type FrameCommand } from '../../lib/shared';

type ScreenId = 's1' | 's2';
type FrameState = 'idle' | 'loading' | 'ok' | 'no-agent-or-blocked';

const MAX_CANVAS_ROWS = 16000;
const CAPTURE_MIN_INTERVAL_MS = 600;
const HELLO_TIMEOUT_MS = 4000;
const PHONE_DEVICE_ZOOM = 3;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const urlInput = byId<HTMLInputElement>('url');
const grantButton = byId<HTMLButtonElement>('grant');
const statusLabel = byId('status');
const resultBox = byId('result');
const frames: Record<ScreenId, HTMLIFrameElement> = { s1: byId('frame-s1'), s2: byId('frame-s2') };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const setStatus = (text: string) => (statusLabel.textContent = text);
const publishResult = (key: string, value: unknown) => {
  document.body.dataset[key] = JSON.stringify(value);
  resultBox.textContent += `${key}: ${JSON.stringify(value)}\n`;
};

const trace = (label: string) => {
  const list: string[] = JSON.parse(document.body.dataset.trace ?? '[]');
  list.push(`${Math.round(performance.now())} ${label}`);
  document.body.dataset.trace = JSON.stringify(list);
};

const askBackground = (message: object) => chrome.runtime.sendMessage(message);

function parseWebUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const originPattern = (url: URL) => `${url.protocol}//${url.hostname}/*`;

async function commandFrame<T = Record<string, unknown>>(screen: ScreenId, command: FrameCommand): Promise<T> {
  const { tabId, frames: known } = await askBackground({ type: 'frames.get' });
  const target = known[screen];
  if (!target) throw new Error(`sem agente na tela ${screen}`);
  return chrome.tabs.sendMessage(tabId, command, { frameId: target.frameId });
}

async function waitForHello(screen: ScreenId): Promise<boolean> {
  const deadline = performance.now() + HELLO_TIMEOUT_MS;
  while (performance.now() < deadline) {
    const { frames: known } = await askBackground({ type: 'frames.get' });
    if (known[screen]) return true;
    await sleep(100);
  }
  return false;
}

function loadScreen(screen: ScreenId, url: string): Promise<FrameState> {
  const frame = frames[screen];
  frame.dataset.state = 'loading';
  return new Promise((resolve) => {
    frame.addEventListener(
      'load',
      async () => {
        const hasAgent = await waitForHello(screen);
        const state: FrameState = hasAgent ? 'ok' : 'no-agent-or-blocked';
        frame.dataset.state = state;
        resolve(state);
      },
      { once: true },
    );
    frame.src = url;
  });
}

async function openUrl(raw: string) {
  const url = parseWebUrl(raw);
  if (!url) return setStatus('URL invalida');
  const pattern = originPattern(url);
  const hasPermission = await chrome.permissions.contains({ origins: [pattern] });
  if (!hasPermission) {
    grantButton.hidden = false;
    grantButton.textContent = `Permitir ${url.hostname}`;
    grantButton.dataset.pattern = pattern;
    document.body.dataset.permission = 'missing';
    return setStatus(`Permissao pendente para ${pattern}`);
  }
  grantButton.hidden = true;
  document.body.dataset.permission = 'granted';
  await askBackground({ type: 'studio.enable' });
  setStatus('Carregando');
  const states = await Promise.all([loadScreen('s1', url.href), loadScreen('s2', url.href)]);
  publishResult('frameStates', states);
  setStatus(states.every((state) => state === 'ok') ? 'Carregado' : 'Alguma tela bloqueada ou sem agente');
}

async function requestPermission() {
  const pattern = grantButton.dataset.pattern;
  if (!pattern) return;
  const isGranted = await chrome.permissions.request({ origins: [pattern] });
  publishResult('permissionRequest', { pattern, isGranted });
  if (isGranted) await openUrl(urlInput.value);
}

let lastCaptureAt = 0;

async function captureViewport(windowId: number): Promise<ImageBitmap> {
  const wait = lastCaptureAt + CAPTURE_MIN_INTERVAL_MS - performance.now();
  if (wait > 0) await sleep(wait);
  lastCaptureAt = performance.now();
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  return createImageBitmap(await (await fetch(dataUrl)).blob());
}

class StripedCanvas {
  readonly parts: OffscreenCanvas[] = [];
  constructor(readonly width: number, readonly height: number) {
    for (let top = 0; top < height; top += MAX_CANVAS_ROWS) {
      this.parts.push(new OffscreenCanvas(width, Math.min(MAX_CANVAS_ROWS, height - top)));
    }
  }
  draw(bitmap: ImageBitmap, sx: number, sy: number, sw: number, sh: number, dy: number) {
    this.parts.forEach((canvas, index) => {
      const partTop = index * MAX_CANVAS_ROWS;
      const from = Math.max(dy, partTop);
      const to = Math.min(dy + sh, partTop + canvas.height);
      if (to <= from) return;
      canvas.getContext('2d')!.drawImage(bitmap, sx, sy + (from - dy), sw, to - from, 0, from - partTop, sw, to - from);
    });
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
}

async function applyDeviceZoom(tabId: number, zoom: number) {
  await chrome.tabs.setZoomSettings(tabId, { mode: 'automatic', scope: 'per-tab' });
  await chrome.tabs.setZoom(tabId, zoom);
  await sleep(700);
}

async function printPhone(mode: 'experience' | 'fast') {
  const startedAt = performance.now();
  const tab = await chrome.tabs.getCurrent();
  const tabId = tab!.id!;
  const windowId = tab!.windowId;
  const log: Record<string, unknown> = { mode };

  trace('warmup:start');
  if (mode === 'experience') log.warmup = await commandFrame('s1', { type: 'warmup' });
  trace('warmup:end');
  const metrics = await commandFrame<{ scrollHeight: number }>('s1', { type: 'metrics' });
  const maxScroll = Math.max(0, metrics.scrollHeight - PHONE.height);

  await commandFrame('s1', { type: 'hideScrollbar', hidden: true });
  document.body.classList.add('capture');
  if (mode === 'experience') await applyDeviceZoom(tabId, PHONE_DEVICE_ZOOM);
  await nextFrame();

  const frame = frames.s1;
  let canvas: StripedCanvas | null = null;
  let scale = 1;
  let captures = 0;

  for (let top = 0; ; top = Math.min(top + PHONE.height, maxScroll)) {
    trace(`step top=${top}`);
    const actual = (await commandFrame<{ scrollY: number }>('s1', { type: 'scrollTo', top })).scrollY;
    if (mode === 'experience') await commandFrame('s1', { type: 'waitStable' });
    else await sleep(150);
    if (actual > 0) await commandFrame('s1', { type: 'hideFixed', hidden: true });
    await sleep(120);

    const docTop = frame.getBoundingClientRect().top + window.scrollY;
    let rowStart = 0;
    while (rowStart < PHONE.height) {
      window.scrollTo(0, docTop + rowStart);
      await nextFrame();
      await sleep(80);
      const bitmap = await captureViewport(windowId);
      captures += 1;
      scale = bitmap.width / window.innerWidth;
      canvas ??= new StripedCanvas(Math.round(PHONE.width * scale), Math.round(metrics.scrollHeight * scale));
      const rect = frame.getBoundingClientRect();
      const visibleTop = Math.max(rowStart, -rect.top);
      const visibleBottom = Math.min(PHONE.height, window.innerHeight - rect.top);
      if (visibleBottom <= visibleTop) throw new Error('viewport do Estudio nao mostra o iframe');
      const sy = Math.round((rect.top + visibleTop) * scale);
      const sh = Math.round((visibleBottom - visibleTop) * scale);
      canvas.draw(bitmap, Math.round(rect.left * scale), sy, canvas.width, sh, Math.round((actual + visibleTop) * scale));
      bitmap.close();
      rowStart = visibleBottom;
    }
    await commandFrame('s1', { type: 'hideFixed', hidden: false });
    if (top >= maxScroll) break;
  }

  window.scrollTo(0, 0);
  if (mode === 'experience') await applyDeviceZoom(tabId, 1);
  document.body.classList.remove('capture');
  await commandFrame('s1', { type: 'hideScrollbar', hidden: false });

  const parts = canvas!.parts;
  for (let index = 0; index < parts.length; index += 1) {
    const blob = await parts[index]!.convertToBlob({ type: 'image/png' });
    downloadBlob(blob, `print-${mode}-parte${index + 1}.png`);
  }
  log.output = { width: canvas!.width, height: canvas!.height, parts: parts.length, captures, scale };
  log.totalMs = Math.round(performance.now() - startedAt);
  publishResult(`print_${mode}`, log);
}

async function recordPhone() {
  const tab = await chrome.tabs.getCurrent();
  const tabId = tab!.id!;
  await commandFrame('s1', { type: 'hideScrollbar', hidden: true });
  document.body.classList.add('capture');
  const availableHeight = window.innerHeight * window.devicePixelRatio;
  const zoom = Math.max(1, Math.min(3, Math.floor((availableHeight / PHONE.height) * 10) / 10));
  await applyDeviceZoom(tabId, zoom);
  await nextFrame();
  const rect = frames.s1.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  const durationMs = 15000;
  const recording = askBackground({
    type: 'rec.start',
    rect: { x: Math.round(rect.left * dpr), y: Math.round(rect.top * dpr), width: Math.round(rect.width * dpr), height: Math.round(rect.height * dpr) },
    viewport: { width: Math.round(window.innerWidth * dpr), height: Math.round(window.innerHeight * dpr) },
    durationMs,
    outWidth: 1080,
    outHeight: 1920,
  });
  await sleep(1200);
  const scroll = commandFrame('s1', { type: 'autoscroll', durationMs: 12500 });
  const [result] = await Promise.all([recording, scroll]);
  await applyDeviceZoom(tabId, 1);
  document.body.classList.remove('capture');
  await commandFrame('s1', { type: 'hideScrollbar', hidden: false });
  publishResult('record', { zoom, dpr, ...result });
  if (result?.url) {
    const blob = await (await fetch(result.url)).blob();
    downloadBlob(blob, `video-15s.${result.extension}`);
  }
}

function wireButtons() {
  byId('open').addEventListener('click', () => void openUrl(urlInput.value));
  grantButton.addEventListener('click', () => void requestPermission());
  byId('print-experience').addEventListener('click', () => void printPhone('experience').catch((error) => publishResult('error', String(error))));
  byId('print-fast').addEventListener('click', () => void printPhone('fast').catch((error) => publishResult('error', String(error))));
  byId('record').addEventListener('click', () => void recordPhone().catch((error) => publishResult('error', String(error))));
  urlInput.addEventListener('keydown', (event) => event.key === 'Enter' && void openUrl(urlInput.value));
  window.addEventListener('pagehide', () => void askBackground({ type: 'studio.disable' }));
}

frames.s1.width = String(PHONE.width);
frames.s2.width = String(DESKTOP.width);
wireButtons();
const initialUrl = new URLSearchParams(location.search).get('url');
if (initialUrl) {
  urlInput.value = initialUrl;
  void openUrl(initialUrl);
}
