import * as v from 'valibot';
import { MAX_COLLECTED_LINKS, MAX_PAGE_URL_LENGTH } from '../batch/types';
import {
  ElementLocatorSchema,
  MAX_SECTIONS,
  OverflowReportSchema,
  ScrollAnchorSchema,
  SectionSchema,
  SelectorSchema,
} from '../types';
import { defineRequest, EmptySchema } from './envelope';

const number = v.pipe(v.number(), v.finite());
const count = v.pipe(v.number(), v.integer(), v.minValue(0));
const MAX_WAIT_STABLE_MS = 4000;
const MAX_WARMUP_STEPS = 120;
const MAX_AUTOSCROLL_STOPS = 30;
const MAX_LINK_TEXT_LENGTH = 120;
const MAX_PAGE_TITLE_LENGTH = 200;

export const studioPing = defineRequest('studio.ping', EmptySchema, EmptySchema, 3000);

export const studioMetrics = defineRequest(
  'studio.metrics',
  EmptySchema,
  v.object({
    scrollHeight: number,
    scrollWidth: number,
    innerWidth: number,
    innerHeight: number,
    devicePixelRatio: number,
    scrollY: number,
  }),
);

export const studioMeasure = defineRequest(
  'studio.measure',
  EmptySchema,
  v.object({
    sections: v.pipe(v.array(SectionSchema), v.maxLength(MAX_SECTIONS)),
    overflow: OverflowReportSchema,
    truncated: v.boolean(),
  }),
);

export const studioApplyScroll = defineRequest(
  'studio.applyScroll',
  v.object({ anchor: ScrollAnchorSchema }),
  v.object({ scrollY: number, usedFallback: v.boolean() }),
  3000,
);

export const studioApplyClick = defineRequest(
  'studio.applyClick',
  v.object({ target: ElementLocatorSchema }),
  v.object({ strategy: v.picklist(['selector', 'text']) }),
  3000,
);

export const studioApplyInput = defineRequest(
  'studio.applyInput',
  v.object({ target: ElementLocatorSchema, value: v.pipe(v.string(), v.maxLength(2000)) }),
  EmptySchema,
  3000,
);

export const studioNavigate = defineRequest(
  'studio.navigate',
  v.object({ url: v.pipe(v.string(), v.maxLength(4096)) }),
  EmptySchema,
);

export const studioScrollTo = defineRequest(
  'studio.scrollTo',
  v.object({ top: v.pipe(number, v.minValue(0)) }),
  v.object({ scrollY: number }),
);

export const studioWaitStable = defineRequest(
  'studio.waitStable',
  v.object({ maxMs: v.optional(v.pipe(number, v.minValue(0), v.maxValue(MAX_WAIT_STABLE_MS))) }),
  v.object({ waitedMs: number, timedOut: v.boolean() }),
  8000,
);

export const studioWarmup = defineRequest(
  'studio.warmup',
  v.object({
    stepRatio: v.optional(v.pipe(number, v.minValue(0.1), v.maxValue(1))),
    maxSteps: v.optional(
      v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_WARMUP_STEPS)),
    ),
  }),
  v.object({ steps: count, timeouts: count, durationMs: number, scrollHeight: number }),
  90_000,
);

export const studioHideFixed = defineRequest(
  'studio.hideFixed',
  EmptySchema,
  v.object({ hiddenCount: count }),
);

export const studioRestoreFixed = defineRequest(
  'studio.restoreFixed',
  EmptySchema,
  v.object({ restoredCount: count }),
);

export const studioHideScrollbar = defineRequest(
  'studio.hideScrollbar',
  v.object({ hidden: v.boolean() }),
  EmptySchema,
);

export const studioAutoscrollStart = defineRequest(
  'studio.autoscroll.start',
  v.object({
    durationMs: v.pipe(v.number(), v.integer(), v.minValue(1000), v.maxValue(600_000)),
    easing: v.picklist(['linear', 'inOutSine']),
    stops: v.optional(
      v.pipe(
        v.array(v.object({ selector: SelectorSchema, pauseMs: v.pipe(v.number(), v.minValue(0)) })),
        v.maxLength(MAX_AUTOSCROLL_STOPS),
      ),
    ),
  }),
  v.object({ totalScroll: number }),
);

const scrollYReply = v.object({ scrollY: number });

export const studioAutoscrollPause = defineRequest(
  'studio.autoscroll.pause',
  EmptySchema,
  scrollYReply,
  3000,
);
export const studioAutoscrollResume = defineRequest(
  'studio.autoscroll.resume',
  EmptySchema,
  scrollYReply,
  3000,
);
export const studioAutoscrollStop = defineRequest(
  'studio.autoscroll.stop',
  EmptySchema,
  scrollYReply,
  3000,
);

export const studioEmulate = defineRequest(
  'studio.emulate',
  v.object({ reducedMotionCss: v.boolean() }),
  v.object({ rulesRewritten: count, sheetsSkipped: count }),
);

export const studioCollectLinks = defineRequest(
  'studio.collectLinks',
  v.object({
    max: v.optional(
      v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_COLLECTED_LINKS)),
    ),
  }),
  v.object({
    links: v.pipe(
      v.array(
        v.object({
          url: v.pipe(v.string(), v.maxLength(MAX_PAGE_URL_LENGTH)),
          text: v.nullable(v.pipe(v.string(), v.maxLength(MAX_LINK_TEXT_LENGTH))),
        }),
      ),
      v.maxLength(MAX_COLLECTED_LINKS),
    ),
    total: count,
    truncated: v.boolean(),
  }),
  5000,
);

export const studioPageFacts = defineRequest(
  'studio.pageFacts',
  EmptySchema,
  v.object({
    url: v.pipe(v.string(), v.maxLength(MAX_PAGE_URL_LENGTH)),
    title: v.pipe(v.string(), v.maxLength(MAX_PAGE_TITLE_LENGTH)),
    httpStatus: v.nullable(count),
    hasPasswordField: v.boolean(),
  }),
  3000,
);

export const studioMessages = [
  studioPing,
  studioMetrics,
  studioMeasure,
  studioApplyScroll,
  studioApplyClick,
  studioApplyInput,
  studioNavigate,
  studioScrollTo,
  studioWaitStable,
  studioWarmup,
  studioHideFixed,
  studioRestoreFixed,
  studioHideScrollbar,
  studioAutoscrollStart,
  studioAutoscrollPause,
  studioAutoscrollResume,
  studioAutoscrollStop,
  studioEmulate,
  studioCollectLinks,
  studioPageFacts,
] as const;
