import * as v from 'valibot';
import {
  ElementLocatorSchema,
  MAX_SECTIONS,
  OverflowReportSchema,
  PresetIdSchema,
  ScreenIdSchema,
  ScrollAnchorSchema,
  SectionSchema,
} from '../types';
import { defineEvent, defineRequest, EmptySchema } from './envelope';
import { NpvErrorSchema } from './errors';

const HELLO_TIMEOUT_MS = 3000;
const MAX_INPUT_VALUE_LENGTH = 2000;

export const frameHello = defineRequest(
  'frame.hello',
  v.object({
    screenId: ScreenIdSchema,
    presetId: PresetIdSchema,
    origin: v.pipe(v.string(), v.maxLength(2048)),
    url: v.pipe(v.string(), v.maxLength(4096)),
  }),
  v.object({ accepted: v.literal(true), mirror: v.boolean() }),
  HELLO_TIMEOUT_MS,
);

export const frameReady = defineEvent(
  'frame.ready',
  v.object({
    url: v.pipe(v.string(), v.maxLength(4096)),
    title: v.pipe(v.string(), v.maxLength(500)),
    scrollHeight: v.pipe(v.number(), v.finite(), v.minValue(0)),
  }),
);

export const frameBye = defineEvent('frame.bye', EmptySchema);

export const frameStable = defineEvent(
  'frame.stable',
  v.object({ sinceLoadMs: v.pipe(v.number(), v.finite(), v.minValue(0)), timedOut: v.boolean() }),
);

export const frameSections = defineEvent(
  'frame.sections',
  v.object({
    sections: v.pipe(v.array(SectionSchema), v.maxLength(MAX_SECTIONS)),
    truncated: v.boolean(),
  }),
);

export const frameScroll = defineEvent('frame.scroll', v.object({ anchor: ScrollAnchorSchema }));

export const frameClick = defineEvent('frame.click', v.object({ target: ElementLocatorSchema }));

export const frameNavigate = defineEvent(
  'frame.navigate',
  v.object({
    url: v.pipe(v.string(), v.maxLength(4096)),
    kind: v.picklist(['push', 'replace', 'traverse', 'reload', 'load']),
  }),
);

export const frameInput = defineEvent(
  'frame.input',
  v.object({
    target: ElementLocatorSchema,
    value: v.pipe(v.string(), v.maxLength(MAX_INPUT_VALUE_LENGTH)),
  }),
);

export const frameOverflow = defineEvent('frame.overflow', OverflowReportSchema);

export const frameAutoscrollEnded = defineEvent(
  'frame.autoscroll.ended',
  v.object({
    reason: v.picklist(['complete', 'stopped']),
    scrollY: v.pipe(v.number(), v.finite()),
    elapsedMs: v.pipe(v.number(), v.finite(), v.minValue(0)),
  }),
);

export const frameError = defineEvent('frame.error', v.object({ error: NpvErrorSchema }));

export const frameEvents = [
  frameReady,
  frameBye,
  frameStable,
  frameSections,
  frameScroll,
  frameClick,
  frameNavigate,
  frameInput,
  frameOverflow,
  frameAutoscrollEnded,
  frameError,
] as const;

export const frameMessages = [frameHello, ...frameEvents] as const;

export type FrameEventDefinition = (typeof frameEvents)[number];
