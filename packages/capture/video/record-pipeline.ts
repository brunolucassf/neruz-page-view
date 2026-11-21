import {
  countRepeatedFrames,
  createFrameDecimator,
  fitContain,
  locateSourceRect,
  NpvException,
  type RecConfig,
  type RecResult,
} from '@neruz/core';
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
} from 'mediabunny';
import type { FrameSource, SourceFrame } from './frame-source';

export type RecordingProgress = {
  phase: 'awaiting-gesture' | 'starting' | 'recording' | 'finalizing';
  elapsedMs: number;
  receivedFrames: number;
  encodedFrames: number;
};

export type EncodedRecording = {
  blob: Blob;
  result: Omit<RecResult, 'blobUrl'>;
};

type PipelineInput = {
  source: FrameSource;
  config: RecConfig;
  onProgress: (progress: RecordingProgress) => void;
  stopSignal: AbortSignal;
};

const PROGRESS_INTERVAL_MS = 1000;
const CODEC_EXTENSIONS = { avc: 'mp4', vp9: 'webm' } as const;
const CODEC_MIME_TYPES = { avc: 'video/mp4', vp9: 'video/webm' } as const;

const drawContained = (
  context: OffscreenCanvasRenderingContext2D,
  frame: SourceFrame,
  sourceRect: { x: number; y: number; width: number; height: number },
  config: RecConfig,
) => {
  const target = fitContain(sourceRect, { width: config.outWidth, height: config.outHeight });
  context.fillStyle = config.backgroundColor;
  context.fillRect(0, 0, config.outWidth, config.outHeight);
  context.drawImage(
    frame.image,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    target.x,
    target.y,
    target.width,
    target.height,
  );
};

const pickCodec = async (config: RecConfig) => {
  const codec = await getFirstEncodableVideoCodec(config.preferredCodecs, {
    width: config.outWidth,
    height: config.outHeight,
  });
  if (codec !== 'avc' && codec !== 'vp9') {
    throw new NpvException('NPV-ENCODER-UNSUPPORTED', 'no encodable video codec (avc, vp9)');
  }
  return codec;
};

export const encodeRecording = async ({
  source,
  config,
  onProgress,
  stopSignal,
}: PipelineInput): Promise<EncodedRecording> => {
  const { outWidth, outHeight, durationMs, fps } = config;
  const codec = await pickCodec(config);
  const frameInterval = 1 / fps;
  const canvas = new OffscreenCanvas(outWidth, outHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new NpvException('NPV-REC-FAILED', 'canvas 2d context unavailable');
  const target = new BufferTarget();
  const output = new Output({
    format: codec === 'avc' ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });
  const videoSource = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: fps });
  await output.start();

  const decimator = createFrameDecimator(fps);
  const counters = { received: 0, encoded: 0 };
  let phase: RecordingProgress['phase'] = 'recording';
  let sourceRect: ReturnType<typeof locateSourceRect> | null = null;
  let lastSeconds = 0;
  let didEndNaturally = false;
  const startedAt = performance.now();
  const emitProgress = () =>
    onProgress({
      phase,
      elapsedMs: Math.round(performance.now() - startedAt),
      receivedFrames: counters.received,
      encodedFrames: counters.encoded,
    });
  emitProgress();
  const progressTimer = setInterval(emitProgress, PROGRESS_INTERVAL_MS);

  try {
    while (!stopSignal.aborted) {
      const remainingMs = durationMs - (performance.now() - startedAt);
      if (remainingMs <= 0) {
        didEndNaturally = true;
        break;
      }
      const read = await source.readNext(remainingMs, stopSignal);
      if (read.kind === 'ended') break;
      if (read.kind === 'timeout') {
        didEndNaturally = !stopSignal.aborted;
        break;
      }
      const { frame } = read;
      counters.received += 1;
      if (!decimator.accept(frame.timestampSeconds)) {
        frame.release();
        continue;
      }
      sourceRect ??= locateSourceRect(
        { width: frame.width, height: frame.height },
        config.viewport,
        config.rect,
      );
      drawContained(context, frame, sourceRect, config);
      frame.release();
      await videoSource.add(frame.timestampSeconds, frameInterval);
      counters.encoded += 1;
      lastSeconds = frame.timestampSeconds;
    }
    const wallSeconds = (performance.now() - startedAt) / 1000;
    const tailFrames = didEndNaturally ? countRepeatedFrames(lastSeconds, durationMs, fps) : 0;
    if (tailFrames > 0 && counters.encoded > 0) {
      await videoSource.add(lastSeconds + frameInterval, tailFrames * frameInterval);
      lastSeconds += tailFrames * frameInterval;
    }
    phase = 'finalizing';
    emitProgress();
    source.close();
    await videoSource.close();
    await output.finalize();
    if (!target.buffer || counters.encoded === 0) {
      throw new NpvException('NPV-REC-FAILED', 'no frames were captured', {
        receivedFrames: counters.received,
      });
    }
    const blob = new Blob([target.buffer], { type: CODEC_MIME_TYPES[codec] });
    return {
      blob,
      result: {
        codec,
        extension: CODEC_EXTENSIONS[codec],
        mimeType: CODEC_MIME_TYPES[codec],
        bytes: blob.size,
        receivedFrames: counters.received,
        encodedFrames: counters.encoded,
        sourceRect: sourceRect ?? { x: 0, y: 0, width: 0, height: 0 },
        videoSeconds: Number((lastSeconds + frameInterval).toFixed(2)),
        wallSeconds: Number(wallSeconds.toFixed(2)),
        stoppedEarly: !didEndNaturally,
      },
    };
  } finally {
    clearInterval(progressTimer);
    source.close();
  }
};
