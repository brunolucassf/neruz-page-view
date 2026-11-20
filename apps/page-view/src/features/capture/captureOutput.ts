import type { CaptureResult } from '@neruz/capture';
import { t } from '../i18n';
import { showToast } from '../toasts/toastStore';

const OBJECT_URL_LIFETIME_MS = 60_000;

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), OBJECT_URL_LIFETIME_MS);
}

export function downloadParts(results: CaptureResult[], host: string, extension: string) {
  for (const result of results) {
    const baseName = `neruz-page-view-${host}-${result.width}x${result.height}`;
    result.parts.forEach((part, index) => {
      const momentName = result.partNames[index];
      const suffix = momentName
        ? `-${momentName}`
        : result.parts.length > 1
          ? `-parte-${index + 1}`
          : '';
      downloadBlob(part, `${baseName}${suffix}.${extension}`);
    });
  }
}

export async function copyImage(blob: Blob) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    showToast({ tone: 'neutral', title: t('state.copied') });
  } catch {
    showToast({ tone: 'error', title: t('state.error.copyFailed') });
  }
}

export function openPart(blob: Blob) {
  const url = URL.createObjectURL(blob);
  void chrome.tabs.create({ url });
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS);
}
