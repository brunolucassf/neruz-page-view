const SVG_MIME = 'image/svg+xml';

type SvgVariant = 'complete' | 'withoutOverlay' | 'overlayOnly';

function parseSvg(source: string): { document: Document; root: Element } {
  const document = new DOMParser().parseFromString(source, SVG_MIME);
  return { document, root: document.documentElement };
}

function stripToVariant(root: Element, variant: SvgVariant) {
  if (variant === 'withoutOverlay') {
    root.querySelector('#overlay')?.remove();
    return;
  }
  if (variant === 'overlayOnly') {
    for (const child of [...root.children]) if (child.id !== 'overlay') child.remove();
  }
}

export function prepareSvg(
  source: string,
  width: number,
  height: number,
  variant: SvgVariant = 'complete',
): string {
  const { root } = parseSvg(source);
  stripToVariant(root, variant);
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  return new XMLSerializer().serializeToString(root);
}

async function decodeSvg(markup: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([markup], { type: SVG_MIME }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function rasterizeSvg(
  source: string,
  width: number,
  height: number,
  variant: SvgVariant = 'complete',
): Promise<ImageBitmap> {
  const image = await decodeSvg(prepareSvg(source, width, height, variant));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d context unavailable');
  context.drawImage(image, 0, 0, width, height);
  return canvas.transferToImageBitmap();
}
