const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 0.7;

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

async function encodeThumbnail(canvas: OffscreenCanvas): Promise<Blob> {
  const webp = await canvas.convertToBlob({ type: 'image/webp', quality: THUMBNAIL_QUALITY });
  if (webp.type === 'image/webp') return webp;
  return canvas.convertToBlob({ type: 'image/jpeg', quality: THUMBNAIL_QUALITY });
}

export async function createFoldThumbnail(
  source: Blob,
  viewportAspect: number,
): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(source);
    const foldHeight = Math.min(bitmap.height, Math.round(bitmap.width * viewportAspect));
    const width = Math.min(THUMBNAIL_WIDTH, bitmap.width);
    const height = Math.max(1, Math.round((foldHeight * width) / bitmap.width));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return null;
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, bitmap.width, foldHeight, 0, 0, width, height);
    bitmap.close();
    return await readAsDataUrl(await encodeThumbnail(canvas));
  } catch {
    return null;
  }
}
