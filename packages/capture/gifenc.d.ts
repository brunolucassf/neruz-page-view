declare module 'gifenc' {
  export type GifPalette = number[][];
  export type GifEncoder = {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: GifPalette; delay?: number; repeat?: number; first?: boolean },
    ): void;
    finish(): void;
    bytesView(): Uint8Array;
  };
  export function GIFEncoder(): GifEncoder;
  export function quantize(
    rgba: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    options?: { format?: 'rgb565' | 'rgb444' | 'rgba4444' },
  ): GifPalette;
  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: GifPalette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;
}
