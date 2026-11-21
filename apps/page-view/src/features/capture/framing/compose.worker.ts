import { type FramedLayout, getStretchBandPx } from './layout';

export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp';

export type ComposeRequest = {
  id: number;
  parts: Blob[];
  layout: FramedLayout;
  frameBitmap: ImageBitmap;
  overlayBitmap: ImageBitmap | null;
  backgroundBitmap: ImageBitmap | null;
  backgroundColor: string | null;
  shadowColor: string;
  output: { type: ImageType; quality: number };
};

export type ComposeResponse =
  | { id: number; blob: Blob; width: number; height: number }
  | { id: number; error: string };

const SHADOW_OFFSET_RATIO = 0.04;
const SHADOW_BLUR_RATIO = 0.06;
const FLATTEN_COLOR = '#FFFFFF';

type Context = OffscreenCanvasRenderingContext2D;

function drawStretchedBitmap(context: Context, bitmap: ImageBitmap, layout: FramedLayout) {
  const { stretchPx, stretchTopPx, stretchBottomPx } = layout;
  if (stretchPx <= 0) {
    context.drawImage(bitmap, 0, 0);
    return;
  }
  const width = bitmap.width;
  const height = bitmap.height;
  const bandHeight = getStretchBandPx(layout.scale);
  const middleHeight = height - stretchTopPx - stretchBottomPx + stretchPx;
  context.drawImage(bitmap, 0, 0, width, stretchTopPx, 0, 0, width, stretchTopPx);
  context.drawImage(
    bitmap,
    0,
    stretchTopPx,
    width,
    bandHeight,
    0,
    stretchTopPx,
    width,
    middleHeight,
  );
  context.drawImage(
    bitmap,
    0,
    height - stretchBottomPx,
    width,
    stretchBottomPx,
    0,
    stretchTopPx + middleHeight,
    width,
    stretchBottomPx,
  );
}

function placeFrameLayer(context: Context, layout: FramedLayout, paint: () => void) {
  const { frameBox, isRotated, frameRasterHeight } = layout;
  context.save();
  if (isRotated) {
    context.translate(frameBox.x + frameRasterHeight, frameBox.y);
    context.rotate(Math.PI / 2);
  } else {
    context.translate(frameBox.x, frameBox.y);
  }
  paint();
  context.restore();
}

function paintBackground(context: Context, request: ComposeRequest) {
  const { layout, backgroundBitmap, backgroundColor, output } = request;
  if (backgroundBitmap) {
    context.drawImage(backgroundBitmap, 0, 0, layout.canvasWidth, layout.canvasHeight);
  } else if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
  } else if (output.type === 'image/jpeg') {
    context.fillStyle = FLATTEN_COLOR;
    context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
  }
}

function paintFrameWithShadow(context: Context, request: ComposeRequest) {
  const { layout, frameBitmap, shadowColor } = request;
  context.save();
  context.shadowColor = shadowColor;
  context.shadowOffsetY = layout.frameBox.height * SHADOW_OFFSET_RATIO;
  context.shadowBlur = layout.frameBox.height * SHADOW_BLUR_RATIO;
  placeFrameLayer(context, layout, () => drawStretchedBitmap(context, frameBitmap, layout));
  context.restore();
}

async function paintPrint(context: Context, request: ComposeRequest) {
  const { layout, parts } = request;
  const { screenBox, printScale, printSourceHeight } = layout;
  context.save();
  context.beginPath();
  context.rect(screenBox.x, screenBox.y, screenBox.width, screenBox.height);
  context.clip();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  let consumedRows = 0;
  for (const part of parts) {
    if (consumedRows >= printSourceHeight) break;
    const bitmap = await createImageBitmap(part);
    const rows = Math.min(bitmap.height, printSourceHeight - consumedRows);
    context.drawImage(
      bitmap,
      0,
      0,
      bitmap.width,
      rows,
      screenBox.x,
      screenBox.y + Math.floor(consumedRows * printScale),
      screenBox.width,
      Math.ceil(rows * printScale),
    );
    bitmap.close();
    consumedRows += rows;
  }
  context.restore();
}

async function compose(request: ComposeRequest): Promise<ComposeResponse> {
  const { layout, overlayBitmap, output } = request;
  const canvas = new OffscreenCanvas(layout.canvasWidth, layout.canvasHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d context unavailable');
  paintBackground(context, request);
  paintFrameWithShadow(context, request);
  await paintPrint(context, request);
  if (overlayBitmap) {
    placeFrameLayer(context, layout, () => drawStretchedBitmap(context, overlayBitmap, layout));
  }
  const blob = await canvas.convertToBlob({ type: output.type, quality: output.quality });
  request.frameBitmap.close();
  request.overlayBitmap?.close();
  request.backgroundBitmap?.close();
  return { id: request.id, blob, width: layout.canvasWidth, height: layout.canvasHeight };
}

self.onmessage = (event: MessageEvent<ComposeRequest>) => {
  compose(event.data).then(
    (response) => self.postMessage(response),
    (cause) =>
      self.postMessage({
        id: event.data.id,
        error: cause instanceof Error ? cause.message : String(cause),
      } satisfies ComposeResponse),
  );
};
