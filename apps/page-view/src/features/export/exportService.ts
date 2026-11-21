import type { CaptureResult } from '@neruz/capture';
import { readPngSize } from '../capture/framing/layout';
import type { ScreenKind } from '../screens/presets';
import { buildZip, convertImage } from './encodeClient';
import type { ExportImageType } from './export.worker';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'pdf' | 'zip';
export type ImageFormat = 'png' | 'jpeg' | 'webp';

export type CapturedShot = {
  screenName: string;
  kind: ScreenKind;
  isLandscape: boolean;
  width: number;
  height: number;
  isDark: boolean;
  isFramed: boolean;
  hasAlpha: boolean;
  result: CaptureResult;
};

type ExportFile = { name: string; blob: Blob; folder: string; hasAlpha: boolean };

export type ExportOutcome = { blob: Blob; filename: string };

const MIME_BY_FORMAT: Record<ImageFormat, ExportImageType> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const EXTENSION_BY_FORMAT: Record<ImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

const PDF_POINTS_PER_PIXEL = 0.75;
const PDF_MAX_PAGE_POINTS = 14400;
const PNG_HEADER_BYTES = 24;
const FILE_PREFIX = 'neruz-page-view';

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

function listShotFiles(shots: CapturedShot[], host: string): ExportFile[] {
  return shots.flatMap((shot, shotIndex) => {
    const { result } = shot;
    const folder = `${String(shotIndex + 1).padStart(2, '0')}-${toSlug(shot.screenName)}-${result.width}x${result.height}`;
    const baseName = `${FILE_PREFIX}-${toSlug(host)}-${result.width}x${result.height}`;
    return result.parts.map((blob, partIndex) => {
      const momentName = result.partNames[partIndex];
      const suffix = momentName
        ? `-${toSlug(momentName)}`
        : result.parts.length > 1
          ? `-parte-${partIndex + 1}`
          : '';
      return {
        name: `${baseName}${suffix}`,
        blob,
        folder,
        hasAlpha: shot.hasAlpha,
      };
    });
  });
}

async function readSize(blob: Blob) {
  const header = readPngSize(await blob.slice(0, PNG_HEADER_BYTES).arrayBuffer());
  if (header) return header;
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

async function buildPdf(files: ExportFile[], quality: number): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let document: InstanceType<typeof jsPDF> | null = null;
  for (const file of files) {
    const size = await readSize(file.blob);
    const factor = Math.min(
      PDF_POINTS_PER_PIXEL,
      PDF_MAX_PAGE_POINTS / Math.max(size.width, size.height),
    );
    const pageWidth = size.width * factor;
    const pageHeight = size.height * factor;
    const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
    const image = file.hasAlpha ? file.blob : await convertImage(file.blob, 'image/jpeg', quality);
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (document) document.addPage([pageWidth, pageHeight], orientation);
    else
      document = new jsPDF({
        unit: 'pt',
        format: [pageWidth, pageHeight],
        orientation,
        compress: true,
      });
    document.addImage(bytes, file.hasAlpha ? 'PNG' : 'JPEG', 0, 0, pageWidth, pageHeight);
  }
  if (!document) throw new Error('nothing to export');
  return document.output('blob');
}

async function convertFiles(files: ExportFile[], format: ImageFormat, quality: number) {
  return Promise.all(
    files.map(async (file) => ({
      ...file,
      blob: await convertImage(file.blob, MIME_BY_FORMAT[format], quality),
      name: `${file.name}.${EXTENSION_BY_FORMAT[format]}`,
    })),
  );
}

export async function exportShots(
  shots: CapturedShot[],
  host: string,
  format: ExportFormat,
  imageFormat: ImageFormat,
  quality: number,
): Promise<ExportOutcome[]> {
  const files = listShotFiles(shots, host);
  const archiveName = `${FILE_PREFIX}-${toSlug(host)}`;

  if (format === 'pdf') {
    return [{ blob: await buildPdf(files, quality), filename: `${archiveName}.pdf` }];
  }

  const zipFormat: ImageFormat = format === 'zip' ? imageFormat : format;
  const converted = await convertFiles(files, zipFormat, quality);
  const shouldZip = format === 'zip' || converted.length > 1;
  if (!shouldZip) {
    return converted.map((file) => ({ blob: file.blob, filename: file.name }));
  }
  const archive = await buildZip(
    converted.map((file) => ({
      path: `${archiveName}/${file.folder}/${file.name}`,
      blob: file.blob,
    })),
  );
  return [{ blob: archive, filename: `${archiveName}.zip` }];
}
