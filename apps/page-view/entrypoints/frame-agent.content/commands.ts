import {
  type AnyMessageDefinition,
  createNpvError,
  type ExtensionIdentity,
  errorReply,
  isExtensionPageSender,
  NpvException,
  okReply,
  type PayloadOf,
  parseEnvelope,
  readEnvelopeHead,
  studioApplyScroll,
  studioHideFixed,
  studioHideScrollbar,
  studioMessages,
  studioMetrics,
  studioPing,
  studioRestoreFixed,
  studioScrollTo,
  studioWaitStable,
  studioWarmup,
  toNpvError,
  withTimeout,
} from '@neruz/core';
import { resolveAnchorScrollTop } from './anchor-dom';
import { hideFixedElements, restoreFixedElements, setScrollbarHidden } from './page-overrides';
import { waitStable, warmup } from './stability';
import { maxScrollTop, nextPaint, scrollInstantly } from './timing';

const STUDIO_PREFIX = 'studio.';

type CommandHandler = {
  definition: AnyMessageDefinition;
  run: (payload: never) => Promise<unknown> | unknown;
};

export type CommandContext = {
  identity: ExtensionIdentity;
  onScrollApplied: () => void;
};

const readMetrics = () => ({
  scrollHeight: document.documentElement.scrollHeight,
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio,
  scrollY: window.scrollY,
});

const buildHandlers = ({ onScrollApplied }: CommandContext): CommandHandler[] => [
  { definition: studioPing, run: () => ({}) },
  { definition: studioMetrics, run: readMetrics },
  {
    definition: studioApplyScroll,
    run: (payload: PayloadOf<typeof studioApplyScroll>) => {
      const { top, usedFallback } = resolveAnchorScrollTop(payload.anchor);
      onScrollApplied();
      scrollInstantly(top);
      return { scrollY: window.scrollY, usedFallback };
    },
  },
  {
    definition: studioScrollTo,
    run: async (payload: PayloadOf<typeof studioScrollTo>) => {
      scrollInstantly(Math.min(payload.top, maxScrollTop()));
      await nextPaint();
      return { scrollY: window.scrollY };
    },
  },
  {
    definition: studioWaitStable,
    run: (payload: PayloadOf<typeof studioWaitStable>) => waitStable(payload.maxMs),
  },
  { definition: studioWarmup, run: (payload: PayloadOf<typeof studioWarmup>) => warmup(payload) },
  { definition: studioHideFixed, run: () => ({ hiddenCount: hideFixedElements() }) },
  { definition: studioRestoreFixed, run: () => ({ restoredCount: restoreFixedElements() }) },
  {
    definition: studioHideScrollbar,
    run: (payload: PayloadOf<typeof studioHideScrollbar>) => {
      setScrollbarHidden(payload.hidden);
      return {};
    },
  },
];

export const isStudioCommand = (raw: unknown): boolean =>
  readEnvelopeHead(raw)?.type.startsWith(STUDIO_PREFIX) ?? false;

export const createCommandRunner = (context: CommandContext) => {
  const handlers = new Map(
    buildHandlers(context).map((handler) => [handler.definition.type, handler]),
  );

  return async (raw: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> => {
    const head = readEnvelopeHead(raw);
    const seq = head?.seq ?? 0;
    if (!isExtensionPageSender(sender, context.identity, 'studio.html')) {
      return errorReply(
        seq,
        createNpvError('NPV-FORBIDDEN-SENDER', 'sender is not the Studio page'),
      );
    }
    const definition = studioMessages.find((item) => item.type === head?.type);
    if (!definition)
      return errorReply(seq, createNpvError('NPV-INVALID-MESSAGE', 'unknown studio command'));
    const parsed = parseEnvelope(definition, raw);
    if (!parsed.ok) return errorReply(seq, parsed.error);
    const handler = handlers.get(definition.type);
    if (!handler) {
      return errorReply(
        seq,
        createNpvError('NPV-BAD-REQUEST', 'command not available in this build'),
      );
    }
    try {
      const data = await withTimeout(
        Promise.resolve(handler.run(parsed.envelope.payload as never)),
        definition.timeoutMs,
        definition.type,
      );
      return okReply(parsed.envelope.seq, data);
    } catch (cause) {
      return errorReply(
        parsed.envelope.seq,
        cause instanceof NpvException ? cause.error : toNpvError(cause),
      );
    }
  };
};
