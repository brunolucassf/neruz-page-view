import {
  type AnyMessageDefinition,
  backgroundRoutes,
  bgFramesList,
  bgPopupOpenStudio,
  bgScriptsSync,
  bgStudioDisable,
  bgStudioEnable,
  createNpvError,
  createRateLimiter,
  type DataOf,
  type ExtensionIdentity,
  errorReply,
  type FrameInfo,
  frameBye,
  frameHello,
  frameMessages,
  isExtensionPageSender,
  isFrameAgentSender,
  NpvException,
  okReply,
  type PayloadOf,
  parseEnvelope,
  parseWebUrl,
  type RateLimiter,
  readEnvelopeHead,
  registerHello,
  releaseFrame,
  resolveSenderOrigin,
  type SenderLike,
  toNpvError,
} from '@neruz/core';
import { readFramesOfTab, writeFramesOfTab } from './session-state';
import {
  disableStudioTab,
  enableStudioTab,
  isStudioTab,
  runSerial,
  syncAgentScripts,
} from './studio-lifecycle';
import { forwardToStudio } from './studio-ports';

const SCROLL_EVENTS_PER_SECOND = 60;
const FRAME_EVENT_PREFIX = 'frame.';
const BG_PREFIX = 'bg.';

const scrollLimiters = new Map<string, RateLimiter>();

export const getExtensionIdentity = (): ExtensionIdentity => ({
  runtimeId: chrome.runtime.id,
  baseUrl: chrome.runtime.getURL('/'),
});

export const isRoutableType = (type: string) =>
  type.startsWith(FRAME_EVENT_PREFIX) || type.startsWith(BG_PREFIX);

const isScrollWithinRate = (tabId: number, frameId: number) => {
  const key = `${tabId}:${frameId}`;
  let limiter = scrollLimiters.get(key);
  if (!limiter) {
    limiter = createRateLimiter(SCROLL_EVENTS_PER_SECOND);
    scrollLimiters.set(key, limiter);
  }
  return limiter.tryAcquire();
};

const forgetScrollLimiter = (tabId: number, frameId: number) =>
  scrollLimiters.delete(`${tabId}:${frameId}`);

const findDefinition = (definitions: readonly AnyMessageDefinition[], type: string) =>
  definitions.find((definition) => definition.type === type);

const handleHello = async (
  payload: PayloadOf<typeof frameHello>,
  tabId: number,
  frameId: number,
  sender: SenderLike,
): Promise<DataOf<typeof frameHello>> => {
  const origin = resolveSenderOrigin(sender);
  if (!origin) throw new NpvException('NPV-BAD-REQUEST', 'sender origin unavailable');
  const candidate: FrameInfo = {
    frameId,
    screenId: payload.screenId,
    presetId: payload.presetId,
    origin,
    helloAt: Date.now(),
  };
  await runSerial(async () => {
    const outcome = registerHello(await readFramesOfTab(tabId), candidate);
    if (!outcome.accepted) {
      throw new NpvException('NPV-BAD-REQUEST', 'screen already bound to another frame', {
        screenId: payload.screenId,
      });
    }
    await writeFramesOfTab(tabId, outcome.frames);
  });
  return { accepted: true, mirror: true };
};

const handleFrameMessage = async (raw: unknown, type: string, sender: SenderLike) => {
  const identity = getExtensionIdentity();
  const tabId = sender.tab?.id;
  const frameId = sender.frameId;
  const isHello = type === frameHello.type;
  const definition = findDefinition(frameMessages, type);
  const rejectedSeq = readEnvelopeHead(raw)?.seq ?? 0;
  if (!isFrameAgentSender(sender, identity) || tabId === undefined || frameId === undefined) {
    return isHello
      ? errorReply(
          rejectedSeq,
          createNpvError('NPV-FORBIDDEN-SENDER', 'sender is not a frame agent'),
        )
      : undefined;
  }
  if (!(await isStudioTab(tabId))) {
    return isHello
      ? errorReply(rejectedSeq, createNpvError('NPV-NOT-STUDIO-TAB', 'tab has no active Studio'))
      : undefined;
  }
  if (!definition) return undefined;
  const parsed = parseEnvelope(definition, raw);
  if (!parsed.ok) return isHello ? errorReply(rejectedSeq, parsed.error) : undefined;
  const { envelope } = parsed;

  if (isHello) {
    try {
      const data = await handleHello(
        envelope.payload as PayloadOf<typeof frameHello>,
        tabId,
        frameId,
        sender,
      );
      forwardToStudio(tabId, { ...envelope, frameId });
      return okReply(envelope.seq, data);
    } catch (cause) {
      return errorReply(envelope.seq, toNpvError(cause));
    }
  }
  if (type === 'frame.scroll' && !isScrollWithinRate(tabId, frameId)) return undefined;
  if (type === frameBye.type) {
    forgetScrollLimiter(tabId, frameId);
    await runSerial(async () =>
      writeFramesOfTab(tabId, releaseFrame(await readFramesOfTab(tabId), frameId)),
    );
  }
  forwardToStudio(tabId, { ...envelope, frameId });
  return undefined;
};

const resolveStudioTabId = (sender: SenderLike): number => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) throw new NpvException('NPV-NOT-STUDIO-TAB', 'sender has no tab');
  return tabId;
};

const openStudioTab = async (rawUrl: string | undefined): Promise<number> => {
  const studioUrl = new URL(chrome.runtime.getURL('studio.html'));
  if (rawUrl !== undefined) {
    const checked = parseWebUrl(rawUrl);
    if (!checked.ok)
      throw new NpvException('NPV-BAD-REQUEST', 'only http and https URLs are allowed');
    studioUrl.searchParams.set('url', checked.url.href);
  }
  const tab = await chrome.tabs.create({ url: studioUrl.href });
  if (tab.id === undefined) throw new NpvException('NPV-UNKNOWN', 'tab created without id');
  return tab.id;
};

const dispatchBackgroundRequest = async (
  type: string,
  payload: unknown,
  sender: SenderLike,
): Promise<unknown> => {
  switch (type) {
    case bgStudioEnable.type:
      return enableStudioTab(resolveStudioTabId(sender));
    case bgStudioDisable.type:
      await disableStudioTab(resolveStudioTabId(sender));
      return {};
    case bgScriptsSync.type:
      return syncAgentScripts();
    case bgFramesList.type:
      return { frames: await readFramesOfTab(resolveStudioTabId(sender)) };
    case bgPopupOpenStudio.type:
      return { tabId: await openStudioTab((payload as PayloadOf<typeof bgPopupOpenStudio>).url) };
    default:
      throw new NpvException('NPV-REC-UNSUPPORTED', 'recording is not available in this build', {
        reason: 'not-in-this-cut',
      });
  }
};

const handleBackgroundMessage = async (raw: unknown, type: string, sender: SenderLike) => {
  const seq = readEnvelopeHead(raw)?.seq ?? 0;
  const route = backgroundRoutes.find((item) => item.definition.type === type);
  if (!route) return errorReply(seq, createNpvError('NPV-INVALID-MESSAGE', 'unknown message type'));
  const page = route.audience === 'studio' ? 'studio.html' : 'popup.html';
  if (!isExtensionPageSender(sender, getExtensionIdentity(), page)) {
    return errorReply(
      seq,
      createNpvError('NPV-FORBIDDEN-SENDER', 'sender not allowed for this message'),
    );
  }
  const parsed = parseEnvelope(route.definition, raw);
  if (!parsed.ok) return errorReply(seq, parsed.error);
  try {
    const data = await dispatchBackgroundRequest(type, parsed.envelope.payload, sender);
    return okReply(parsed.envelope.seq, data);
  } catch (cause) {
    return errorReply(parsed.envelope.seq, toNpvError(cause));
  }
};

export const routeMessage = async (raw: unknown, sender: SenderLike): Promise<unknown> => {
  const head = readEnvelopeHead(raw);
  if (!head) return errorReply(0, createNpvError('NPV-INVALID-MESSAGE', 'malformed envelope'));
  try {
    if (head.type.startsWith(FRAME_EVENT_PREFIX))
      return await handleFrameMessage(raw, head.type, sender);
    return await handleBackgroundMessage(raw, head.type, sender);
  } catch (cause) {
    return errorReply(head.seq, toNpvError(cause));
  }
};
