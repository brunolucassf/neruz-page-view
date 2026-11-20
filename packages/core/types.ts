import * as v from 'valibot';

const SCREEN_ID_PATTERN = /^s(?:[1-9]|1[0-6])$/;
const PRESET_ID_PATTERN = /^[a-z0-9-]{1,56}$/;

const finiteNumber = v.pipe(v.number(), v.finite());
const ratio = v.pipe(v.number(), v.minValue(0), v.maxValue(1));
const nonNegativeFinite = v.pipe(v.number(), v.finite(), v.minValue(0));

export type ScreenId = `s${number}`;

export const ScreenIdSchema = v.custom<ScreenId>(
  (value) => typeof value === 'string' && SCREEN_ID_PATTERN.test(value),
  'invalid screenId',
);
export const PresetIdSchema = v.pipe(v.string(), v.regex(PRESET_ID_PATTERN));

export const SizeSchema = v.object({ width: finiteNumber, height: finiteNumber });
export const RectSchema = v.object({
  x: finiteNumber,
  y: finiteNumber,
  width: finiteNumber,
  height: finiteNumber,
});

export const SelectorSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(512));

export const ScrollAnchorSchema = v.object({
  selector: v.nullable(SelectorSchema),
  offsetRatio: ratio,
  pageRatio: ratio,
});

export const ElementLocatorSchema = v.object({
  selector: SelectorSchema,
  text: v.optional(v.pipe(v.string(), v.maxLength(120))),
  point: v.object({ xRatio: ratio, yRatio: ratio }),
});

export const SectionSchema = v.object({
  selector: SelectorSchema,
  top: nonNegativeFinite,
  height: nonNegativeFinite,
  label: v.optional(v.pipe(v.string(), v.maxLength(80))),
});

export const OverflowReportSchema = v.object({
  overflowPx: nonNegativeFinite,
  offenders: v.pipe(
    v.array(v.object({ selector: SelectorSchema, rightPx: finiteNumber })),
    v.maxLength(20),
  ),
  truncated: v.boolean(),
});

export const FrameInfoSchema = v.object({
  frameId: v.pipe(v.number(), v.integer(), v.minValue(0)),
  screenId: ScreenIdSchema,
  presetId: PresetIdSchema,
  origin: v.pipe(v.string(), v.maxLength(2048)),
  helloAt: nonNegativeFinite,
});

export type Size = v.InferOutput<typeof SizeSchema>;
export type Rect = v.InferOutput<typeof RectSchema>;
export type ScrollAnchor = v.InferOutput<typeof ScrollAnchorSchema>;
export type ElementLocator = v.InferOutput<typeof ElementLocatorSchema>;
export type Section = v.InferOutput<typeof SectionSchema>;
export type OverflowReport = v.InferOutput<typeof OverflowReportSchema>;
export type FrameInfo = v.InferOutput<typeof FrameInfoSchema>;

export const MAX_SECTIONS = 30;
export const MAX_SELECTOR_LENGTH = 512;
