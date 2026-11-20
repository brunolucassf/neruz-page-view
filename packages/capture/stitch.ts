import { NpvException } from '@neruz/core';

export const MAX_CANVAS_ROWS = 16_000;
export const MAX_CANVAS_WIDTH = 16_384;
export const MAX_TOTAL_PIXELS = 400_000_000;

export type Stripe = { top: number; height: number };

export const planStripes = (totalHeight: number, maxRows: number = MAX_CANVAS_ROWS): Stripe[] => {
  const stripes: Stripe[] = [];
  for (let top = 0; top < totalHeight; top += maxRows) {
    stripes.push({ top, height: Math.min(maxRows, totalHeight - top) });
  }
  return stripes;
};

export const planScrollTops = (scrollHeight: number, viewportHeight: number): number[] => {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  const tops = [0];
  while ((tops.at(-1) ?? 0) < maxScroll) {
    tops.push(Math.min((tops.at(-1) ?? 0) + viewportHeight, maxScroll));
  }
  return tops;
};

export const assertCanvasBudget = (width: number, height: number) => {
  if (width > MAX_CANVAS_WIDTH || width * height > MAX_TOTAL_PIXELS) {
    throw new NpvException('NPV-CANVAS-LIMIT', 'capture area exceeds the canvas limit', {
      width,
      height,
    });
  }
};

export type FrameRect = { left: number; top: number; width: number; height: number };

export type SliceInput = {
  frameRect: FrameRect;
  viewportHeight: number;
  rowStart: number;
  frameScrollY: number;
  captureScale: number;
  cssScale: number;
};

export type Slice = {
  sourceX: number;
  sourceY: number;
  width: number;
  height: number;
  destY: number;
  nextRowStart: number;
};

export const computeSlice = ({
  frameRect,
  viewportHeight,
  rowStart,
  frameScrollY,
  captureScale,
  cssScale,
}: SliceInput): Slice | null => {
  const visibleTop = Math.max(rowStart, -frameRect.top);
  const visibleBottom = Math.min(frameRect.height, viewportHeight - frameRect.top);
  if (visibleBottom <= visibleTop) return null;
  return {
    sourceX: Math.round(frameRect.left * captureScale),
    sourceY: Math.round((frameRect.top + visibleTop) * captureScale),
    width: Math.round(frameRect.width * captureScale),
    height: Math.round((visibleBottom - visibleTop) * captureScale),
    destY: Math.round((frameScrollY * cssScale + visibleTop) * captureScale),
    nextRowStart: visibleBottom,
  };
};

export type StripePiece = {
  stripeIndex: number;
  sourceRowOffset: number;
  destRowInStripe: number;
  rows: number;
};

export const splitRowsAcrossStripes = (
  destY: number,
  rows: number,
  stripes: readonly Stripe[],
): StripePiece[] => {
  const pieces: StripePiece[] = [];
  stripes.forEach((stripe, stripeIndex) => {
    const from = Math.max(destY, stripe.top);
    const to = Math.min(destY + rows, stripe.top + stripe.height);
    if (to <= from) return;
    pieces.push({
      stripeIndex,
      sourceRowOffset: from - destY,
      destRowInStripe: from - stripe.top,
      rows: to - from,
    });
  });
  return pieces;
};
