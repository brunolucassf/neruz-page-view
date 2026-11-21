import type { Rect, Size } from '../types';

export const locateSourceRect = (frame: Size, viewport: Size, rect: Rect): Rect => {
  const scale = Math.min(frame.width / viewport.width, frame.height / viewport.height);
  const offsetX = (frame.width - viewport.width * scale) / 2;
  const offsetY = (frame.height - viewport.height * scale) / 2;
  return {
    x: offsetX + rect.x * scale,
    y: offsetY + rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
};

export const fitContain = (source: Size, output: Size): Rect => {
  const scale = Math.min(output.width / source.width, output.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return { x: (output.width - width) / 2, y: (output.height - height) / 2, width, height };
};

const DECIMATION_TOLERANCE = 0.9;

export const createFrameDecimator = (fps: number) => {
  const interval = 1 / fps;
  let nextAllowedSeconds = 0;
  return {
    interval,
    accept(seconds: number): boolean {
      if (seconds + 1e-6 < nextAllowedSeconds) return false;
      nextAllowedSeconds = seconds + interval * DECIMATION_TOLERANCE;
      return true;
    },
  };
};

export const countRepeatedFrames = (lastSeconds: number, durationMs: number, fps: number) => {
  const missingSeconds = durationMs / 1000 - lastSeconds;
  return Math.max(0, Math.floor(missingSeconds * fps));
};
