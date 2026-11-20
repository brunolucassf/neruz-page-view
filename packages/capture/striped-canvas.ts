import { planStripes, type Stripe, splitRowsAcrossStripes } from './stitch';

export type StripedCanvas = {
  readonly width: number;
  readonly height: number;
  readonly partCount: number;
  drawSlice(
    bitmap: ImageBitmap,
    source: { x: number; y: number; width: number; height: number },
    destY: number,
  ): void;
  exportParts(type: string, quality?: number): Promise<Blob[]>;
};

export const createStripedCanvas = (width: number, height: number): StripedCanvas => {
  const stripes: Stripe[] = planStripes(height);
  const canvases = stripes.map((stripe) => new OffscreenCanvas(width, stripe.height));
  const contexts = canvases.map((canvas) => {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2d context unavailable');
    return context;
  });

  return {
    width,
    height,
    partCount: canvases.length,
    drawSlice(bitmap, source, destY) {
      for (const piece of splitRowsAcrossStripes(destY, source.height, stripes)) {
        contexts[piece.stripeIndex]?.drawImage(
          bitmap,
          source.x,
          source.y + piece.sourceRowOffset,
          source.width,
          piece.rows,
          0,
          piece.destRowInStripe,
          source.width,
          piece.rows,
        );
      }
    },
    exportParts(type, quality) {
      return Promise.all(canvases.map((canvas) => canvas.convertToBlob({ type, quality })));
    },
  };
};
