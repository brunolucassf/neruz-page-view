import * as v from 'valibot';
import { RectSchema, SizeSchema } from '../types';
import { defineEvent, defineRequest, EmptySchema } from './envelope';
import { NpvErrorSchema } from './errors';

const MAX_OUTPUT_SIDE = 3840;
const REC_START_EXTRA_TIMEOUT_MS = 30_000;
const MAX_DURATION_MS = 600_000;

const evenSide = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(2),
  v.maxValue(MAX_OUTPUT_SIDE),
  v.check((value) => value % 2 === 0, 'must be even'),
);
const nonNegative = v.pipe(v.number(), v.finite(), v.minValue(0));

export const RecConfigSchema = v.object({
  rect: RectSchema,
  viewport: SizeSchema,
  durationMs: v.pipe(v.number(), v.integer(), v.minValue(1000), v.maxValue(MAX_DURATION_MS)),
  outWidth: evenSide,
  outHeight: evenSide,
  fps: v.literal(30),
  backgroundColor: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
  preferredCodecs: v.pipe(v.array(v.picklist(['avc', 'vp9'])), v.minLength(1), v.maxLength(2)),
});

export const RecStartPayloadSchema = v.object({
  ...RecConfigSchema.entries,
  streamId: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
});

export const RecResultSchema = v.object({
  blobUrl: v.pipe(v.string(), v.maxLength(512)),
  codec: v.picklist(['avc', 'vp9']),
  extension: v.picklist(['mp4', 'webm']),
  mimeType: v.picklist(['video/mp4', 'video/webm']),
  bytes: nonNegative,
  receivedFrames: nonNegative,
  encodedFrames: nonNegative,
  sourceRect: RectSchema,
  videoSeconds: nonNegative,
  wallSeconds: nonNegative,
  stoppedEarly: v.boolean(),
});

export type RecConfig = v.InferOutput<typeof RecConfigSchema>;
export type RecStartPayload = v.InferOutput<typeof RecStartPayloadSchema>;
export type RecResult = v.InferOutput<typeof RecResultSchema>;

export const recStart = defineRequest(
  'rec.start',
  RecStartPayloadSchema,
  RecResultSchema,
  MAX_DURATION_MS + REC_START_EXTRA_TIMEOUT_MS,
);
export const recStop = defineRequest('rec.stop', EmptySchema, EmptySchema);

export const recProgress = defineEvent(
  'rec.progress',
  v.object({
    phase: v.picklist(['starting', 'recording', 'finalizing']),
    elapsedMs: nonNegative,
    receivedFrames: nonNegative,
    encodedFrames: nonNegative,
  }),
);
export const recStarted = defineEvent('rec.started', v.object({ startedAt: nonNegative }));
export const recDone = defineEvent('rec.done', RecResultSchema);
export const recFailed = defineEvent('rec.failed', v.object({ error: NpvErrorSchema }));

export const recordingEvents = [recProgress, recStarted, recDone, recFailed] as const;
