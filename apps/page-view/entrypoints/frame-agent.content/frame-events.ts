import {
  type AnyMessageDefinition,
  createEnvelope,
  createSeqCounter,
  FRAME_ID_UNKNOWN,
  type PayloadOf,
  unwrapReply,
  withTimeout,
} from '@neruz/core';

const nextSeq = createSeqCounter();

export const sendFrameEvent = <TDefinition extends AnyMessageDefinition>(
  definition: TDefinition,
  payload: PayloadOf<TDefinition>,
): void => {
  void chrome.runtime
    .sendMessage(createEnvelope(definition, payload, nextSeq(), FRAME_ID_UNKNOWN))
    .catch(() => undefined);
};

export const sendFrameRequest = async <TDefinition extends AnyMessageDefinition>(
  definition: TDefinition,
  payload: PayloadOf<TDefinition>,
) => {
  const seq = nextSeq();
  const raw = await withTimeout(
    chrome.runtime.sendMessage(createEnvelope(definition, payload, seq, FRAME_ID_UNKNOWN)),
    definition.timeoutMs,
    definition.type,
  );
  return unwrapReply(definition, raw, seq);
};
