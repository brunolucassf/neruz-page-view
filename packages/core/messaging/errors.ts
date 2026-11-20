import * as v from 'valibot';

export const NPV_ERROR_CODES = [
  'NPV-TIMEOUT',
  'NPV-INVALID-MESSAGE',
  'NPV-BAD-REQUEST',
  'NPV-VERSION-MISMATCH',
  'NPV-FORBIDDEN-SENDER',
  'NPV-NOT-STUDIO-TAB',
  'NPV-FRAME-NOT-FOUND',
  'NPV-IFRAME-BLOCKED',
  'NPV-PERMISSION-MISSING',
  'NPV-PERMISSION-DENIED',
  'NPV-DNR-FAILED',
  'NPV-SCRIPT-REGISTER-FAILED',
  'NPV-CAPTURE-RATE',
  'NPV-CAPTURE-FAILED',
  'NPV-CANVAS-LIMIT',
  'NPV-ELEMENT-NOT-FOUND',
  'NPV-INPUT-SENSITIVE',
  'NPV-REC-GESTURE-REQUIRED',
  'NPV-REC-BUSY',
  'NPV-REC-UNSUPPORTED',
  'NPV-ENCODER-UNSUPPORTED',
  'NPV-REC-FAILED',
  'NPV-STORAGE-INVALID',
  'NPV-ABORTED',
  'NPV-UNKNOWN',
] as const;

export type NpvErrorCode = (typeof NPV_ERROR_CODES)[number];

const RETRYABLE_CODES: ReadonlySet<NpvErrorCode> = new Set([
  'NPV-TIMEOUT',
  'NPV-FRAME-NOT-FOUND',
  'NPV-DNR-FAILED',
  'NPV-SCRIPT-REGISTER-FAILED',
  'NPV-CAPTURE-RATE',
  'NPV-CAPTURE-FAILED',
  'NPV-REC-FAILED',
]);

export const NpvErrorSchema = v.object({
  code: v.picklist(NPV_ERROR_CODES),
  message: v.pipe(v.string(), v.maxLength(1000)),
  retryable: v.boolean(),
  details: v.optional(v.record(v.string(), v.union([v.string(), v.number(), v.boolean()]))),
});

export type NpvError = v.InferOutput<typeof NpvErrorSchema>;
export type NpvErrorDetails = NonNullable<NpvError['details']>;

export const createNpvError = (
  code: NpvErrorCode,
  message: string,
  details?: NpvErrorDetails,
): NpvError => ({
  code,
  message,
  retryable: RETRYABLE_CODES.has(code),
  ...(details ? { details } : {}),
});

export class NpvException extends Error {
  readonly error: NpvError;

  constructor(code: NpvErrorCode, message: string, details?: NpvErrorDetails) {
    super(`${code}: ${message}`);
    this.name = 'NpvException';
    this.error = createNpvError(code, message, details);
  }
}

export const isNpvError = (value: unknown): value is NpvError =>
  v.safeParse(NpvErrorSchema, value).success;

export const toNpvError = (cause: unknown): NpvError => {
  if (cause instanceof NpvException) return cause.error;
  const message = cause instanceof Error ? cause.message : String(cause);
  return createNpvError('NPV-UNKNOWN', message.slice(0, 500));
};
