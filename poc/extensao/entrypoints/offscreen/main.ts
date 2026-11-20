import {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import type { Rect, Size } from '../../lib/shared';

type RecordRequest = {
  target: string;
  type: string;
  streamId: string;
  rect: Rect;
  viewport: Size;
  durationMs: number;
  outWidth: number;
  outHeight: number;
};

const BACKGROUND_FILL = '#111111';
const OUTPUT_FPS = 30;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

declare class MediaStreamTrackProcessor {
  constructor(init: { track: MediaStreamTrack });
  readable: ReadableStream<VideoFrame>;
}

async function openTabStream(streamId: string) {
  return navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: 3840,
        maxHeight: 2160,
        maxFrameRate: 60,
      },
    } as unknown as MediaTrackConstraints,
    audio: false,
  });
}

function locateRectInFrame(frame: VideoFrame, viewport: Size, rect: Rect): Rect {
  const scale = Math.min(frame.displayWidth / viewport.width, frame.displayHeight / viewport.height);
  const offsetX = (frame.displayWidth - viewport.width * scale) / 2;
  const offsetY = (frame.displayHeight - viewport.height * scale) / 2;
  return { x: offsetX + rect.x * scale, y: offsetY + rect.y * scale, width: rect.width * scale, height: rect.height * scale };
}

function drawContained(context: OffscreenCanvasRenderingContext2D, frame: VideoFrame, sourceRect: Rect, outWidth: number, outHeight: number) {
  const rect = sourceRect;
  context.fillStyle = BACKGROUND_FILL;
  context.fillRect(0, 0, outWidth, outHeight);
  const scale = Math.min(outWidth / rect.width, outHeight / rect.height);
  const drawWidth = rect.width * scale;
  const drawHeight = rect.height * scale;
  context.drawImage(frame, rect.x, rect.y, rect.width, rect.height, (outWidth - drawWidth) / 2, (outHeight - drawHeight) / 2, drawWidth, drawHeight);
}

async function describeOutput(buffer: ArrayBuffer) {
  const input = new Input({ source: new BufferSource(buffer), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) return null;
  const stats = await track.computePacketStats();
  return { width: track.displayWidth, height: track.displayHeight, codec: track.codec, packetCount: stats.packetCount, averagePacketRate: stats.averagePacketRate };
}

const progressLog: string[] = [];
const markProgress = (label: string) => {
  progressLog.push(`${Math.round(performance.now())} ${label}`);
  void chrome.runtime.sendMessage({ type: 'rec.progress', log: progressLog });
};

async function record(request: RecordRequest) {
  const { rect, durationMs, outWidth, outHeight } = request;
  markProgress('start');
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9'], { width: outWidth, height: outHeight });
  if (!codec) return { ok: false, error: 'nenhum codec de video encodavel (avc/vp9)' };
  const isMp4 = codec === 'avc';
  markProgress(`codec=${codec}`);

  const stream = await openTabStream(request.streamId);
  const track = stream.getVideoTracks()[0]!;
  const settings = track.getSettings();
  markProgress(`stream ${JSON.stringify(settings)}`);

  const canvas = new OffscreenCanvas(outWidth, outHeight);
  const context = canvas.getContext('2d')!;
  const target = new BufferTarget();
  const output = new Output({ format: isMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: OUTPUT_FPS });
  await output.start();
  markProgress('output started');

  const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
  let firstTimestamp: number | null = null;
  let receivedFrames = 0;
  let encodedFrames = 0;
  let sourceRect: Rect | null = null;
  let lastSeconds = 0;
  const startedAt = performance.now();

  const frameInterval = 1 / OUTPUT_FPS;
  let nextFrameSeconds = 0;
  while (true) {
    const remainingMs = durationMs - (performance.now() - startedAt);
    if (remainingMs <= 0) break;
    const next = await Promise.race([reader.read(), sleep(remainingMs).then(() => null)]);
    if (!next) break;
    const { value: frame, done } = next;
    if (done || !frame) break;
    if (firstTimestamp === null) markProgress(`first frame ${frame.displayWidth}x${frame.displayHeight} coded ${frame.codedWidth}x${frame.codedHeight}`);
    firstTimestamp ??= frame.timestamp;
    const seconds = (frame.timestamp - firstTimestamp) / 1e6;
    receivedFrames += 1;
    if (seconds + 1e-6 < nextFrameSeconds) {
      frame.close();
      continue;
    }
    sourceRect ??= locateRectInFrame(frame, request.viewport, rect);
    drawContained(context, frame, sourceRect, outWidth, outHeight);
    frame.close();
    await source.add(seconds, frameInterval);
    nextFrameSeconds = seconds + frameInterval * 0.9;
    encodedFrames += 1;
    lastSeconds = seconds;
    if (encodedFrames % 30 === 1) markProgress(`encoded ${encodedFrames}`);
  }
  markProgress('loop done');
  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  await reader.cancel();
  track.stop();
  await source.close();
  await output.finalize();

  const buffer = target.buffer!;
  const mime = isMp4 ? 'video/mp4' : 'video/webm';
  return {
    ok: true,
    url: URL.createObjectURL(new Blob([buffer], { type: mime })),
    extension: isMp4 ? 'mp4' : 'webm',
    codec,
    bytes: buffer.byteLength,
    trackSettings: { width: settings.width, height: settings.height, frameRate: settings.frameRate },
    cropRect: rect,
    sourceRect,
    receivedFrames,
    encodedFrames,
    receivedFps: Number((receivedFrames / elapsedSeconds).toFixed(1)),
    videoSeconds: Number(lastSeconds.toFixed(2)),
    wallSeconds: Number(elapsedSeconds.toFixed(2)),
    outputFile: await describeOutput(buffer),
  };
}

chrome.runtime.onMessage.addListener((message: RecordRequest, sender, sendResponse) => {
  if (message.target !== 'offscreen' || sender.id !== chrome.runtime.id) return false;
  record(message).then(sendResponse, (error) => sendResponse({ ok: false, error: String(error?.message ?? error) }));
  return true;
});
