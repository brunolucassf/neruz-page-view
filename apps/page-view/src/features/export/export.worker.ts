import { zipSync } from 'fflate';

export type ExportImageType = 'image/png' | 'image/jpeg' | 'image/webp';

export type ExportRequest =
  | { id: number; kind: 'convert'; blob: Blob; type: ExportImageType; quality: number }
  | { id: number; kind: 'zip'; files: { path: string; blob: Blob }[] };

export type ExportResponse = { id: number; blob: Blob } | { id: number; error: string };

const FLATTEN_COLOR = '#FFFFFF';

async function convertImage(request: Extract<ExportRequest, { kind: 'convert' }>) {
  const bitmap = await createImageBitmap(request.blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d context unavailable');
  if (request.type === 'image/jpeg') {
    context.fillStyle = FLATTEN_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: request.type, quality: request.quality });
}

async function buildZip(files: { path: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[file.path] = new Uint8Array(await file.blob.arrayBuffer());
  const archive = zipSync(entries, { level: 0 });
  return new Blob([archive as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}

async function handle(request: ExportRequest): Promise<ExportResponse> {
  const blob = request.kind === 'zip' ? await buildZip(request.files) : await convertImage(request);
  return { id: request.id, blob };
}

self.onmessage = (event: MessageEvent<ExportRequest>) => {
  handle(event.data).then(
    (response) => self.postMessage(response),
    (cause) =>
      self.postMessage({
        id: event.data.id,
        error: cause instanceof Error ? cause.message : String(cause),
      } satisfies ExportResponse),
  );
};
