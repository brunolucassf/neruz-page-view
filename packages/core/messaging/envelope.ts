import * as v from 'valibot';
import { createNpvError, type NpvError, NpvErrorSchema, NpvException } from './errors';

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 256 * 1024;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const FRAME_ID_UNKNOWN = -1;
export const FRAME_ID_TOP = 0;

const seqSchema = v.pipe(v.number(), v.integer(), v.minValue(1));
const frameIdSchema = v.pipe(v.number(), v.integer(), v.minValue(-1));

export const EmptySchema = v.object({});

export type MessageDefinition<
  TType extends string,
  TPayload extends v.GenericSchema,
  TData extends v.GenericSchema,
> = {
  readonly type: TType;
  readonly payload: TPayload;
  readonly data: TData;
  readonly timeoutMs: number;
};

export type AnyMessageDefinition = MessageDefinition<string, v.GenericSchema, v.GenericSchema>;

export const defineRequest = <
  TType extends string,
  TPayload extends v.GenericSchema,
  TData extends v.GenericSchema,
>(
  type: TType,
  payload: TPayload,
  data: TData,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): MessageDefinition<TType, TPayload, TData> => ({ type, payload, data, timeoutMs });

export const defineEvent = <TType extends string, TPayload extends v.GenericSchema>(
  type: TType,
  payload: TPayload,
): MessageDefinition<TType, TPayload, typeof EmptySchema> => ({
  type,
  payload,
  data: EmptySchema,
  timeoutMs: 0,
});

export type PayloadOf<TDefinition extends AnyMessageDefinition> = v.InferOutput<
  TDefinition['payload']
>;
export type DataOf<TDefinition extends AnyMessageDefinition> = v.InferOutput<TDefinition['data']>;

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

export const createEnvelope = <TDefinition extends AnyMessageDefinition>(
  definition: TDefinition,
  payload: PayloadOf<TDefinition>,
  seq: number,
  frameId: number = FRAME_ID_TOP,
): Envelope<TDefinition['type'], PayloadOf<TDefinition>> => ({
  v: PROTOCOL_VERSION,
  type: definition.type,
  frameId,
  seq,
  payload,
});

export const createSeqCounter = () => {
  let current = 0;
  return () => {
    current += 1;
    return current;
  };
};

export const okReply = <TData>(seq: number, data: TData): Reply<TData> => ({
  v: PROTOCOL_VERSION,
  seq,
  ok: true,
  data,
});

export const errorReply = (seq: number, error: NpvError): Reply<never> => ({
  v: PROTOCOL_VERSION,
  seq,
  ok: false,
  error,
});

export const createEnvelopeSchema = <TDefinition extends AnyMessageDefinition>(
  definition: TDefinition,
) =>
  v.object({
    v: v.literal(PROTOCOL_VERSION),
    type: v.literal(definition.type),
    frameId: frameIdSchema,
    seq: seqSchema,
    payload: definition.payload,
  });

export const createReplySchema = <TData extends v.GenericSchema>(dataSchema: TData) =>
  v.variant('ok', [
    v.object({
      v: v.literal(PROTOCOL_VERSION),
      seq: seqSchema,
      ok: v.literal(true),
      data: dataSchema,
    }),
    v.object({
      v: v.literal(PROTOCOL_VERSION),
      seq: v.pipe(v.number(), v.integer(), v.minValue(0)),
      ok: v.literal(false),
      error: NpvErrorSchema,
    }),
  ]);

const EnvelopeHeadSchema = v.object({
  v: v.number(),
  type: v.pipe(v.string(), v.maxLength(64)),
  seq: v.optional(v.number()),
});

export type EnvelopeHead = { type: string; seq: number; version: number };

export const readEnvelopeHead = (raw: unknown): EnvelopeHead | null => {
  const parsed = v.safeParse(EnvelopeHeadSchema, raw);
  if (!parsed.success) return null;
  const seq = parsed.output.seq;
  return {
    type: parsed.output.type,
    seq: typeof seq === 'number' && Number.isInteger(seq) && seq >= 1 ? seq : 0,
    version: parsed.output.v,
  };
};

export type ParsedEnvelope<TDefinition extends AnyMessageDefinition> =
  | { ok: true; envelope: Envelope<TDefinition['type'], PayloadOf<TDefinition>> }
  | { ok: false; error: NpvError };

export const parseEnvelope = <TDefinition extends AnyMessageDefinition>(
  definition: TDefinition,
  raw: unknown,
): ParsedEnvelope<TDefinition> => {
  const head = readEnvelopeHead(raw);
  if (head && head.version !== PROTOCOL_VERSION) {
    return {
      ok: false,
      error: createNpvError('NPV-VERSION-MISMATCH', `unsupported protocol version ${head.version}`),
    };
  }
  const parsed = v.safeParse(createEnvelopeSchema(definition), raw);
  if (!parsed.success) {
    const issue = parsed.issues[0];
    return {
      ok: false,
      error: createNpvError('NPV-INVALID-MESSAGE', issue?.message ?? 'invalid envelope', {
        path: issue?.path?.map((item) => String(item.key)).join('.') ?? '',
      }),
    };
  }
  return {
    ok: true,
    envelope: parsed.output as Envelope<TDefinition['type'], PayloadOf<TDefinition>>,
  };
};

export const unwrapReply = <TDefinition extends AnyMessageDefinition>(
  definition: TDefinition,
  raw: unknown,
  expectedSeq: number,
): DataOf<TDefinition> => {
  const parsed = v.safeParse(createReplySchema(definition.data), raw);
  if (!parsed.success) {
    throw new NpvException('NPV-INVALID-MESSAGE', `invalid reply to ${definition.type}`);
  }
  const reply = parsed.output as Reply<DataOf<TDefinition>>;
  if (!reply.ok) throw new NpvException(reply.error.code, reply.error.message, reply.error.details);
  if (reply.seq !== expectedSeq) {
    throw new NpvException('NPV-INVALID-MESSAGE', `reply seq mismatch for ${definition.type}`);
  }
  return reply.data;
};
