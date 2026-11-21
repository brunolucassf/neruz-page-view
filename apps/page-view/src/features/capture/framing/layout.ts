import type { FrameRect, FrameSpec } from '../frames';

export type FramedScope = 'fold' | 'full';

export type LayoutInput = {
  frame: FrameSpec;
  isRotated: boolean;
  printWidth: number;
  printHeight: number;
  scope: FramedScope;
  maxSide?: number;
};

export type FramedLayout = {
  scale: number;
  isRotated: boolean;
  canvasWidth: number;
  canvasHeight: number;
  frameBox: FrameRect;
  frameRasterWidth: number;
  frameRasterHeight: number;
  stretchPx: number;
  stretchTopPx: number;
  stretchBottomPx: number;
  screenBox: FrameRect;
  printScale: number;
  printSourceHeight: number;
};

const MARGIN_RATIO = 0.12;
const MAX_CANVAS_SIDE = 12000;
const MAX_CANVAS_AREA = 120_000_000;
const STRETCH_GUARD_UNITS = 8;
const STRETCH_BAND_UNITS = 8;

const toEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);

const rotateScreenClockwise = (frame: FrameSpec): FrameRect => ({
  x: frame.height - frame.screen.y - frame.screen.height,
  y: frame.screen.x,
  width: frame.screen.height,
  height: frame.screen.width,
});

export function planFramedLayout(input: LayoutInput): FramedLayout {
  const { frame, isRotated, printWidth, printHeight, scope } = input;
  const unitWidth = isRotated ? frame.height : frame.width;
  const unitHeight = isRotated ? frame.width : frame.height;
  const unitScreen = isRotated ? rotateScreenClockwise(frame) : frame.screen;

  const nativeScale = printWidth / unitScreen.width;
  const wantsStretch = scope === 'full' && !isRotated;
  const fullScreenUnits = (printHeight * unitScreen.width) / printWidth;
  const stretchUnits = wantsStretch ? Math.max(0, fullScreenUnits - unitScreen.height) : 0;

  const totalUnitHeight = unitHeight + stretchUnits;
  const marginUnits = MARGIN_RATIO * Math.max(unitWidth, totalUnitHeight);
  const canvasUnitWidth = unitWidth + 2 * marginUnits;
  const canvasUnitHeight = totalUnitHeight + 2 * marginUnits;

  const sideLimit =
    (input.maxSide ?? MAX_CANVAS_SIDE) / Math.max(canvasUnitWidth, canvasUnitHeight);
  const areaLimit = Math.sqrt(MAX_CANVAS_AREA / (canvasUnitWidth * canvasUnitHeight));
  const scale = Math.min(nativeScale, sideLimit, areaLimit);

  const canvasWidth = toEven(canvasUnitWidth * scale);
  const canvasHeight = toEven(canvasUnitHeight * scale);
  const frameBox: FrameRect = {
    x: Math.round((canvasWidth - unitWidth * scale) / 2),
    y: Math.round(marginUnits * scale),
    width: Math.round(unitWidth * scale),
    height: Math.round(totalUnitHeight * scale),
  };
  const screenBox: FrameRect = {
    x: frameBox.x + Math.round(unitScreen.x * scale),
    y: frameBox.y + Math.round(unitScreen.y * scale),
    width: Math.round(unitScreen.width * scale),
    height: Math.round((unitScreen.height + stretchUnits) * scale),
  };
  const printScale = screenBox.width / printWidth;

  return {
    scale,
    isRotated,
    canvasWidth,
    canvasHeight,
    frameBox,
    frameRasterWidth: Math.round(frame.width * scale),
    frameRasterHeight: Math.round(frame.height * scale),
    stretchPx: Math.round(stretchUnits * scale),
    stretchTopPx: Math.round((frame.screen.y + STRETCH_GUARD_UNITS) * scale),
    stretchBottomPx: Math.round(
      (frame.height - frame.screen.y - frame.screen.height + STRETCH_GUARD_UNITS) * scale,
    ),
    screenBox,
    printScale,
    printSourceHeight: Math.min(printHeight, Math.round(screenBox.height / printScale)),
  };
}

export const getStretchBandPx = (scale: number) =>
  Math.max(1, Math.round(STRETCH_BAND_UNITS * scale));

export function readPngSize(header: ArrayBuffer): { width: number; height: number } | null {
  const view = new DataView(header);
  if (view.byteLength < 24 || view.getUint32(0) !== 0x89504e47) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
