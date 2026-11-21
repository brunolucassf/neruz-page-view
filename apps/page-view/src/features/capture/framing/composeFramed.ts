import type { FrameBackground } from '../../library/persistence';
import {
  BACKGROUND_SOURCE,
  canRotateFrame,
  type FrameKind,
  getFrameSource,
  getFrameSpec,
} from '../frames';
import type { ComposeRequest, ComposeResponse, ImageType } from './compose.worker';
import { type FramedScope, planFramedLayout, readPngSize } from './layout';
import { rasterizeSvg } from './rasterizeSvg';

export type FramedBackground =
  | { kind: 'preset'; id: FrameBackground }
  | { kind: 'color'; color: string };

export type FramedStyle = {
  frameKind: FrameKind;
  isDark: boolean;
  isScreenLandscape: boolean;
  background: FramedBackground;
  scope: FramedScope;
};

export type ComposeOutput = { type: ImageType; quality: number };

export type ComposedImage = { blob: Blob; width: number; height: number };

const SHADOW_DARK = 'rgba(0, 0, 0, 0.55)';
const SHADOW_LIGHT = 'rgba(8, 13, 20, 0.22)';
const PNG_HEADER_BYTES = 24;

type Pending = {
  resolve: (image: ComposedImage) => void;
  reject: (cause: Error) => void;
};

let worker: Worker | null = null;
let nextRequestId = 1;
const pendingById = new Map<number, Pending>();

function handleWorkerMessage(event: MessageEvent<ComposeResponse>) {
  const response = event.data;
  const pending = pendingById.get(response.id);
  if (!pending) return;
  pendingById.delete(response.id);
  if ('error' in response) pending.reject(new Error(response.error));
  else pending.resolve({ blob: response.blob, width: response.width, height: response.height });
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./compose.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = handleWorkerMessage;
  }
  return worker;
}

function requestCompose(request: Omit<ComposeRequest, 'id'>): Promise<ComposedImage> {
  const id = nextRequestId++;
  const target = getWorker();
  return new Promise((resolve, reject) => {
    pendingById.set(id, { resolve, reject });
    const transfer = [request.frameBitmap, request.overlayBitmap, request.backgroundBitmap].filter(
      (item): item is ImageBitmap => item !== null,
    );
    target.postMessage({ ...request, id }, { transfer });
  });
}

async function measurePart(part: Blob): Promise<{ width: number; height: number }> {
  const fromHeader = readPngSize(await part.slice(0, PNG_HEADER_BYTES).arrayBuffer());
  if (fromHeader) return fromHeader;
  const bitmap = await createImageBitmap(part);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

async function measurePrint(parts: Blob[], scope: FramedScope) {
  const used = scope === 'full' ? parts : parts.slice(0, 1);
  const sizes = await Promise.all(used.map(measurePart));
  const first = sizes[0];
  if (!first) throw new Error('no print parts');
  return {
    width: first.width,
    height: sizes.reduce((total, size) => total + size.height, 0),
  };
}

export async function composeFramedImage(
  parts: Blob[],
  style: FramedStyle,
  output: ComposeOutput,
  maxSide?: number,
): Promise<ComposedImage> {
  const frame = getFrameSpec(style.frameKind);
  const print = await measurePrint(parts, style.scope);
  const isFrameLandscape = frame.width > frame.height;
  const isRotated = canRotateFrame(style.frameKind) && style.isScreenLandscape !== isFrameLandscape;
  const layout = planFramedLayout({
    frame,
    isRotated,
    printWidth: print.width,
    printHeight: print.height,
    scope: style.scope,
    maxSide,
  });

  const source = getFrameSource(style.frameKind, style.isDark);
  const { frameRasterWidth: width, frameRasterHeight: height } = layout;
  const background = style.background;
  const presetSource =
    background.kind === 'preset' && background.id !== 'transparent'
      ? BACKGROUND_SOURCE[background.id]
      : null;

  const [frameBitmap, overlayBitmap, backgroundBitmap] = await Promise.all([
    rasterizeSvg(source, width, height, 'withoutOverlay'),
    frame.hasOverlay ? rasterizeSvg(source, width, height, 'overlayOnly') : null,
    presetSource ? rasterizeSvg(presetSource, layout.canvasWidth, layout.canvasHeight) : null,
  ]);

  return requestCompose({
    parts: style.scope === 'full' ? parts : parts.slice(0, 1),
    layout,
    frameBitmap,
    overlayBitmap,
    backgroundBitmap,
    backgroundColor: background.kind === 'color' ? background.color : null,
    shadowColor: style.isDark ? SHADOW_DARK : SHADOW_LIGHT,
    output,
  });
}
