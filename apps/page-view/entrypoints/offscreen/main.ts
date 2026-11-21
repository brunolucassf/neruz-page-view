import { recordTabStream } from '@neruz/capture/video';
import {
  createEnvelope,
  createNpvError,
  createSeqCounter,
  errorReply,
  NpvException,
  okReply,
  parseEnvelope,
  readEnvelopeHead,
  recProgress,
  recStart,
  recStop,
  toNpvError,
} from '@neruz/core';

const OFFSCREEN_TARGET = 'offscreen';

const nextSeq = createSeqCounter();
let activeRecording: AbortController | null = null;

const isTrustedSender = (raw: unknown, sender: chrome.runtime.MessageSender) =>
  (raw as { target?: unknown } | null)?.target === OFFSCREEN_TARGET &&
  sender.id === chrome.runtime.id &&
  sender.tab === undefined;

const startRecording = async (raw: unknown) => {
  const parsed = parseEnvelope(recStart, raw);
  if (!parsed.ok) return errorReply(readEnvelopeHead(raw)?.seq ?? 0, parsed.error);
  const { seq, payload } = parsed.envelope;
  if (activeRecording) {
    return errorReply(seq, createNpvError('NPV-REC-BUSY', 'a recording is already running'));
  }
  const controller = new AbortController();
  activeRecording = controller;
  try {
    const result = await recordTabStream({
      payload,
      stopSignal: controller.signal,
      onProgress: (progress) => {
        if (progress.phase === 'awaiting-gesture') return;
        void chrome.runtime
          .sendMessage(
            createEnvelope(recProgress, { ...progress, phase: progress.phase }, nextSeq()),
          )
          .catch(() => undefined);
      },
    });
    return okReply(seq, result);
  } catch (cause) {
    const error = cause instanceof NpvException ? cause.error : toNpvError(cause);
    return errorReply(
      seq,
      error.code === 'NPV-UNKNOWN' ? { ...error, code: 'NPV-REC-FAILED' } : error,
    );
  } finally {
    activeRecording = null;
  }
};

const stopRecording = (raw: unknown) => {
  const parsed = parseEnvelope(recStop, raw);
  if (!parsed.ok) return errorReply(readEnvelopeHead(raw)?.seq ?? 0, parsed.error);
  activeRecording?.abort();
  return okReply(parsed.envelope.seq, {});
};

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isTrustedSender(raw, sender)) return false;
  const type = readEnvelopeHead(raw)?.type;
  if (type === recStart.type) void startRecording(raw).then(sendResponse);
  else if (type === recStop.type) sendResponse(stopRecording(raw));
  else return false;
  return true;
});
