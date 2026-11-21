import { SNAP_WIDTHS } from './presets';

export const RULER_HEIGHT = 24;
export const BENCH_PADDING = 32;
export const BENCH_TOP_MARGIN = 28;
export const SCREEN_HEADER_HEIGHT = 28;
export const SCREEN_GAP = 28;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 1.5;
const ZOOM_STEPS = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.25, 1.5];

const GHOST_SIZE = { width: 160, height: 220 };
export const MIN_FIT_ZOOM = 0.4;
const FIT_HEIGHT_RATIO = 0.92;
const GHOST_EMPTY = { width: 480, height: 320 };

export type ScreenSize = { width: number; height: number };
export type BenchSize = { width: number; height: number };

export type ScreenBox = {
  x: number;
  viewportTop: number;
  scaledWidth: number;
  scaledHeight: number;
};

export type SlotBox = { x: number; viewportTop: number; width: number; height: number };

export type BenchLayout = {
  boxes: ScreenBox[];
  slot: SlotBox;
  contentWidth: number;
  contentHeight: number;
};

export function layoutScreens(
  screens: readonly ScreenSize[],
  zoom: number,
  bench: BenchSize,
): BenchLayout {
  const scaled = screens.map((screen) => ({
    width: Math.round(screen.width * zoom),
    height: Math.round(screen.height * zoom),
  }));
  const last = scaled.at(-1);
  const slotSize = last ? GHOST_SIZE : GHOST_EMPTY;
  const rowWidth =
    scaled.reduce((total, size) => total + size.width + SCREEN_GAP, 0) + slotSize.width;
  const startX = Math.max(BENCH_PADDING, Math.round((bench.width - rowWidth) / 2));
  const tallest = Math.max(slotSize.height, ...scaled.map((size) => size.height));
  const viewportTop = RULER_HEIGHT + BENCH_TOP_MARGIN + SCREEN_HEADER_HEIGHT;
  let cursorX = startX;
  const boxes = scaled.map((size) => {
    const box = { x: cursorX, viewportTop, scaledWidth: size.width, scaledHeight: size.height };
    cursorX += size.width + SCREEN_GAP;
    return box;
  });
  const slot = { x: cursorX, viewportTop, width: slotSize.width, height: slotSize.height };
  return {
    boxes,
    slot,
    contentWidth: Math.max(bench.width, startX + rowWidth + BENCH_PADDING),
    contentHeight: Math.max(bench.height, viewportTop + tallest + BENCH_PADDING),
  };
}

export function computeFitZoom(screens: readonly ScreenSize[], bench: BenchSize): number {
  if (screens.length === 0 || bench.height === 0) return 1;
  const tallest = Math.max(...screens.map((screen) => screen.height));
  const availableHeight = bench.height - RULER_HEIGHT - BENCH_TOP_MARGIN - SCREEN_HEADER_HEIGHT;
  const heightFit = Math.min((availableHeight * FIT_HEIGHT_RATIO) / tallest, 1);
  return Math.floor(Math.max(MIN_FIT_ZOOM, heightFit) * 100) / 100;
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? MIN_ZOOM;
}

export type SnapResult = { width: number; snappedTo: number | null };

export function snapWidth(rawWidth: number, threshold: number): SnapResult {
  let nearest: number | null = null;
  for (const candidate of SNAP_WIDTHS) {
    const distance = Math.abs(candidate - rawWidth);
    if (distance <= threshold && (nearest === null || distance < Math.abs(nearest - rawWidth))) {
      nearest = candidate;
    }
  }
  return nearest === null
    ? { width: Math.round(rawWidth), snappedTo: null }
    : { width: nearest, snappedTo: nearest };
}

export type RulerScale = { tickStep: number; labelStep: number };

export function pickRulerScale(zoom: number): RulerScale {
  const tickStep = [10, 50, 100, 500].find((step) => step * zoom >= 3) ?? 1000;
  const labelStep = [100, 200, 500, 1000, 2000].find((step) => step * zoom >= 44) ?? 5000;
  return { tickStep, labelStep };
}
