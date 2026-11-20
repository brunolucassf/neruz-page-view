import { sleep, withTimeout } from '../async/timeout';
import {
  bgFramesList,
  bgPopupOpenStudio,
  bgScriptsSync,
  bgStudioDisable,
  bgStudioEnable,
} from '../messaging/background';
import {
  type AnyMessageDefinition,
  createEnvelope,
  createSeqCounter,
  type DataOf,
  type PayloadOf,
  parseEnvelope,
  readEnvelopeHead,
  unwrapReply,
} from '../messaging/envelope';
import { NpvException } from '../messaging/errors';
import { frameMessages } from '../messaging/frame';
import { recordingEvents } from '../messaging/recording';
import { buildScreenName, parseWebUrl, toOriginPermissionPattern } from '../security/sender';
import type { FrameInfo, ScreenId } from '../types';

export const STUDIO_PORT_NAME = 'npv-studio';

const HEARTBEAT_INTERVAL_MS = 20_000;
const IFRAME_HELLO_TIMEOUT_MS = 8000;
const IFRAME_LOAD_CAP_MS = 45_000;
const PORT_RECONNECT_DELAY_MS = 500;

const incomingDefinitions = [...frameMessages, ...recordingEvents] as const;
type IncomingDefinition = (typeof incomingDefinitions)[number];

export type StudioEvent = {
  [D in IncomingDefinition as D['type']]: {
    type: D['type'];
    frameId: number;
    payload: PayloadOf<D>;
  };
}[IncomingDefinition['type']];

export type StudioEventListener = (event: StudioEvent) => void;

export type OpenScreenInput = {
  iframe: HTMLIFrameElement;
  screenId: ScreenId;
  presetId: string;
  url: string;
  signal?: AbortSignal;
};

export type StudioClient = {
  enable(): Promise<DataOf<typeof bgStudioEnable>>;
  disable(): Promise<void>;
  syncScripts(): Promise<DataOf<typeof bgScriptsSync>>;
  listFrames(): Promise<FrameInfo[]>;
  requestOriginPermission(url: string): Promise<void>;
  openScreen(input: OpenScreenInput): Promise<FrameInfo>;
  waitForFrame(
    screenId: ScreenId,
    options?: { since?: number; timeoutMs?: number; signal?: AbortSignal },
  ): Promise<FrameInfo>;
  getFrame(screenId: ScreenId): FrameInfo | undefined;
  getScreenOfFrame(frameId: number): ScreenId | undefined;
  listKnownScreens(): ScreenId[];
  command<TDefinition extends AnyMessageDefinition>(
    definition: TDefinition,
    screenId: ScreenId,
    payload: PayloadOf<TDefinition>,
  ): Promise<DataOf<TDefinition>>;
  onEvent(listener: StudioEventListener): () => void;
  close(): void;
};

const abortError = () => new NpvException('NPV-ABORTED', 'operation aborted');

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw abortError();
};

const isMessagingFailure = (cause: unknown) => !(cause instanceof NpvException);

export const createStudioClient = (): StudioClient => {
  const nextSeq = createSeqCounter();
  const listeners = new Set<StudioEventListener>();
  const framesByScreen = new Map<ScreenId, FrameInfo>();
  const frameWaiters = new Set<() => void>();
  let port: chrome.runtime.Port | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;
  let isEnabled = false;
  let refreshing: Promise<FrameInfo[]> | null = null;
  let tabIdPromise: Promise<number> | null = null;

  const notifyWaiters = () => {
    for (const wake of [...frameWaiters]) wake();
  };

  const requestBackground = async <TDefinition extends AnyMessageDefinition>(
    definition: TDefinition,
    payload: PayloadOf<TDefinition>,
  ): Promise<DataOf<TDefinition>> => {
    const seq = nextSeq();
    const raw = await withTimeout(
      chrome.runtime.sendMessage(createEnvelope(definition, payload, seq)),
      definition.timeoutMs,
      definition.type,
    );
    return unwrapReply(definition, raw, seq);
  };

  const applyFrameList = (frames: FrameInfo[]) => {
    framesByScreen.clear();
    for (const frame of frames) framesByScreen.set(frame.screenId, frame);
    notifyWaiters();
  };

  const refreshFrames = (): Promise<FrameInfo[]> => {
    refreshing ??= requestBackground(bgFramesList, {})
      .then(({ frames }) => {
        applyFrameList(frames);
        return frames;
      })
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  };

  const handlePortMessage = (raw: unknown) => {
    const head = readEnvelopeHead(raw);
    if (!head) return;
    const definition = incomingDefinitions.find((item) => item.type === head.type);
    if (!definition) return;
    const parsed = parseEnvelope(definition, raw);
    if (!parsed.ok) return;
    const event = {
      type: definition.type,
      frameId: parsed.envelope.frameId,
      payload: parsed.envelope.payload,
    } as StudioEvent;
    if (event.type === 'frame.hello' || event.type === 'frame.bye')
      void refreshFrames().catch(() => {});
    for (const listener of listeners) listener(event);
  };

  const stopHeartbeat = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  };

  const connectPort = () => {
    if (isClosed) return;
    const connection = chrome.runtime.connect({ name: STUDIO_PORT_NAME });
    port = connection;
    connection.onMessage.addListener(handlePortMessage);
    connection.onDisconnect.addListener(() => {
      stopHeartbeat();
      port = null;
      if (isClosed) return;
      void sleep(PORT_RECONNECT_DELAY_MS).then(() => {
        if (isClosed || port) return;
        connectPort();
        if (isEnabled) void requestBackground(bgStudioEnable, {}).catch(() => {});
      });
    });
    heartbeat = setInterval(
      () => connection.postMessage({ heartbeat: true }),
      HEARTBEAT_INTERVAL_MS,
    );
  };

  const ensurePort = () => {
    if (!port) connectPort();
  };

  const getTabId = (): Promise<number> => {
    tabIdPromise ??= chrome.tabs.getCurrent().then((tab) => {
      if (tab?.id === undefined) throw new NpvException('NPV-NOT-STUDIO-TAB', 'no current tab');
      return tab.id;
    });
    return tabIdPromise;
  };

  const getFrame = (screenId: ScreenId) => framesByScreen.get(screenId);

  const waitForFrame: StudioClient['waitForFrame'] = async (
    screenId,
    { since = 0, timeoutMs = IFRAME_HELLO_TIMEOUT_MS, signal } = {},
  ) => {
    throwIfAborted(signal);
    const isFresh = (frame: FrameInfo | undefined): frame is FrameInfo =>
      !!frame && frame.helloAt >= since;
    await refreshFrames().catch(() => []);
    const immediate = getFrame(screenId);
    if (isFresh(immediate)) return immediate;
    return new Promise<FrameInfo>((resolve, reject) => {
      const finish = (outcome: () => void) => {
        clearTimeout(timer);
        frameWaiters.delete(check);
        signal?.removeEventListener('abort', onAbort);
        outcome();
      };
      const check = () => {
        const frame = getFrame(screenId);
        if (isFresh(frame)) finish(() => resolve(frame));
      };
      const onAbort = () => finish(() => reject(abortError()));
      const timer = setTimeout(
        () =>
          finish(() =>
            reject(
              new NpvException('NPV-IFRAME-BLOCKED', `no frame.hello for ${screenId}`, {
                screenId,
              }),
            ),
          ),
        timeoutMs,
      );
      frameWaiters.add(check);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  };

  const enable = async () => {
    ensurePort();
    const data = await requestBackground(bgStudioEnable, {});
    isEnabled = true;
    return data;
  };

  const requestOriginPermission = async (rawUrl: string) => {
    const checked = parseWebUrl(rawUrl);
    if (!checked.ok)
      throw new NpvException('NPV-BAD-REQUEST', 'only http and https URLs are allowed');
    const origins = [toOriginPermissionPattern(checked.url)];
    if (await chrome.permissions.contains({ origins })) return;
    const isGranted = await chrome.permissions.request({ origins });
    if (!isGranted)
      throw new NpvException('NPV-PERMISSION-DENIED', 'host permission refused', {
        origin: origins[0] ?? '',
      });
    await requestBackground(bgScriptsSync, {});
  };

  const waitForIframeLoad = (iframe: HTMLIFrameElement, signal?: AbortSignal) =>
    new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(cap);
        iframe.removeEventListener('load', done);
        signal?.removeEventListener('abort', done);
        resolve();
      };
      const cap = setTimeout(done, IFRAME_LOAD_CAP_MS);
      iframe.addEventListener('load', done, { once: true });
      signal?.addEventListener('abort', done, { once: true });
    });

  const openScreen: StudioClient['openScreen'] = async ({
    iframe,
    screenId,
    presetId,
    url,
    signal,
  }) => {
    const checked = parseWebUrl(url);
    if (!checked.ok)
      throw new NpvException('NPV-BAD-REQUEST', 'only http and https URLs are allowed');
    const pattern = toOriginPermissionPattern(checked.url);
    if (!(await chrome.permissions.contains({ origins: [pattern] }))) {
      throw new NpvException('NPV-PERMISSION-MISSING', 'host permission not granted', {
        origin: pattern,
      });
    }
    await enable();
    throwIfAborted(signal);
    const since = Date.now();
    iframe.name = buildScreenName(screenId, presetId);
    iframe.src = checked.url.href;
    const helloArrived = waitForFrame(screenId, {
      since,
      timeoutMs: IFRAME_LOAD_CAP_MS + IFRAME_HELLO_TIMEOUT_MS,
      signal,
    });
    const iframeBlocked = waitForIframeLoad(iframe, signal)
      .then(() => sleep(IFRAME_HELLO_TIMEOUT_MS))
      .then((): never => {
        throw new NpvException('NPV-IFRAME-BLOCKED', `no frame.hello for ${screenId}`, {
          screenId,
        });
      });
    return Promise.race([helloArrived, iframeBlocked]);
  };

  const command: StudioClient['command'] = async (definition, screenId, payload) => {
    let frame = getFrame(screenId);
    if (!frame) {
      await refreshFrames().catch(() => []);
      frame = getFrame(screenId);
    }
    if (!frame)
      throw new NpvException('NPV-FRAME-NOT-FOUND', `no frame for ${screenId}`, { screenId });
    const tabId = await getTabId();
    const seq = nextSeq();
    const envelope = createEnvelope(definition, payload, seq, frame.frameId);
    let raw: unknown;
    try {
      raw = await withTimeout(
        chrome.tabs.sendMessage(tabId, envelope, { frameId: frame.frameId }),
        definition.timeoutMs,
        definition.type,
      );
    } catch (cause) {
      if (!isMessagingFailure(cause)) throw cause;
      throw new NpvException('NPV-FRAME-NOT-FOUND', `frame ${screenId} did not answer`, {
        screenId,
      });
    }
    return unwrapReply(definition, raw, seq);
  };

  return {
    enable,
    async disable() {
      isEnabled = false;
      framesByScreen.clear();
      await requestBackground(bgStudioDisable, {});
    },
    syncScripts: () => requestBackground(bgScriptsSync, {}),
    listFrames: refreshFrames,
    requestOriginPermission,
    openScreen,
    waitForFrame,
    getFrame,
    getScreenOfFrame(frameId) {
      for (const frame of framesByScreen.values())
        if (frame.frameId === frameId) return frame.screenId;
      return undefined;
    },
    listKnownScreens: () => [...framesByScreen.keys()],
    command,
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      isClosed = true;
      isEnabled = false;
      stopHeartbeat();
      listeners.clear();
      port?.disconnect();
      port = null;
    },
  };
};

let sharedClient: StudioClient | null = null;

export const getStudioClient = (): StudioClient => {
  sharedClient ??= createStudioClient();
  return sharedClient;
};

export const openStudioFromPopup = async (url?: string): Promise<number> => {
  const seq = createSeqCounter()();
  const raw = await withTimeout(
    chrome.runtime.sendMessage(createEnvelope(bgPopupOpenStudio, url ? { url } : {}, seq)),
    bgPopupOpenStudio.timeoutMs,
    bgPopupOpenStudio.type,
  );
  return unwrapReply(bgPopupOpenStudio, raw, seq).tabId;
};
