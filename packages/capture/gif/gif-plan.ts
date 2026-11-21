export type GifLimits = {
  maxSeconds: number;
  maxFrames: number;
  maxWidth: number;
  maxBytes: number;
};

export const DEFAULT_GIF_LIMITS: GifLimits = {
  maxSeconds: 15,
  maxFrames: 240,
  maxWidth: 720,
  maxBytes: 25 * 1024 * 1024,
};

export const DEFAULT_GIF_FPS = 12;

export type GifPlan = {
  width: number;
  height: number;
  fps: number;
  delayMs: number;
  timestamps: number[];
  isTruncated: boolean;
};

type GifPlanInput = {
  durationSeconds: number;
  sourceWidth: number;
  sourceHeight: number;
  fps?: number;
  limits?: GifLimits;
};

const roundToEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export const planGif = ({
  durationSeconds,
  sourceWidth,
  sourceHeight,
  fps = DEFAULT_GIF_FPS,
  limits = DEFAULT_GIF_LIMITS,
}: GifPlanInput): GifPlan => {
  const seconds = Math.min(durationSeconds, limits.maxSeconds);
  const effectiveFps = Math.max(1, Math.min(fps, limits.maxFrames / Math.max(seconds, 1e-3)));
  const frameCount = Math.max(1, Math.floor(seconds * effectiveFps));
  const scale = Math.min(1, limits.maxWidth / sourceWidth);
  return {
    width: roundToEven(sourceWidth * scale),
    height: roundToEven(sourceHeight * scale),
    fps: effectiveFps,
    delayMs: Math.round(1000 / effectiveFps),
    timestamps: Array.from({ length: frameCount }, (_, index) => index / effectiveFps),
    isTruncated: durationSeconds > limits.maxSeconds,
  };
};
