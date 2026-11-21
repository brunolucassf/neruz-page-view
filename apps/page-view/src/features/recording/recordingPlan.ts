import type { Section, Size } from '@neruz/core';

export type VideoPreset = 'vertical' | 'square' | 'horizontal' | 'screen';
export type ScrollSpeed = 'slow' | 'normal' | 'fast';

export type AutoscrollStopPlan = { selector: string; pauseMs: number };

export type RecordingPlan = {
  scrollMs: number;
  stops: AutoscrollStopPlan[];
  durationMs: number;
};

const SPEED_PIXELS_PER_SECOND: Record<ScrollSpeed, number> = { slow: 140, normal: 280, fast: 560 };
const FIXED_OUTPUT: Record<Exclude<VideoPreset, 'screen'>, Size> = {
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  horizontal: { width: 1920, height: 1080 },
};
const MIN_SCROLL_MS = 4000;
const MAX_SCROLL_MS = 180_000;
const SECTION_PAUSE_MS = 1200;
const START_SLACK_MS = 3000;
const MAX_RECORDING_MS = 600_000;
const MANUAL_PAUSE_ALLOWANCE_MS = 120_000;
export const MARKED_PAUSE_MS = 1500;
const MAX_STOPS = 30;
const TOP_SECTION_TOLERANCE_PX = 8;
const MIN_SCREEN_OUTPUT_SIDE = 1080;
const MAX_OUTPUT_SIDE = 3840;

const toEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export const resolveOutputSize = (preset: VideoPreset, screen: Size): Size => {
  if (preset !== 'screen') return FIXED_OUTPUT[preset];
  const longSide = Math.max(screen.width, screen.height);
  const scale = Math.min(
    MAX_OUTPUT_SIDE / longSide,
    Math.max(1, MIN_SCREEN_OUTPUT_SIDE / longSide),
  );
  return { width: toEven(screen.width * scale), height: toEven(screen.height * scale) };
};

type PlanInput = {
  speed: ScrollSpeed;
  totalScroll: number;
  sections: readonly Pick<Section, 'selector' | 'top'>[];
  hasPauses: boolean;
};

const pickStops = (sections: PlanInput['sections'], totalScroll: number): AutoscrollStopPlan[] =>
  [...sections]
    .filter((section) => section.top > TOP_SECTION_TOLERANCE_PX && section.top <= totalScroll)
    .sort((first, second) => first.top - second.top)
    .slice(0, MAX_STOPS)
    .map((section) => ({ selector: section.selector, pauseMs: SECTION_PAUSE_MS }));

export const planRecording = ({
  speed,
  totalScroll,
  sections,
  hasPauses,
}: PlanInput): RecordingPlan => {
  const scrollMs = Math.min(
    MAX_SCROLL_MS,
    Math.max(
      MIN_SCROLL_MS,
      Math.round((Math.max(0, totalScroll) / SPEED_PIXELS_PER_SECOND[speed]) * 1000),
    ),
  );
  const stops = hasPauses ? pickStops(sections, totalScroll) : [];
  const pausesMs = stops.reduce((sum, stop) => sum + stop.pauseMs, 0);
  const durationMs = Math.min(
    MAX_RECORDING_MS,
    scrollMs + pausesMs + START_SLACK_MS + MANUAL_PAUSE_ALLOWANCE_MS,
  );
  return { scrollMs, stops, durationMs };
};

const MIN_TAB_ZOOM = 0.25;
const MAX_TAB_ZOOM = 3;
const ZOOM_STEPS_PER_UNIT = 20;

export const pickTabZoom = (screen: Size, available: Size): number => {
  const fit = Math.min(available.height / screen.height, available.width / screen.width);
  const stepped = Math.floor(fit * ZOOM_STEPS_PER_UNIT) / ZOOM_STEPS_PER_UNIT;
  return Math.min(MAX_TAB_ZOOM, Math.max(MIN_TAB_ZOOM, stepped));
};

export const formatClock = (elapsedMs: number): string => {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
