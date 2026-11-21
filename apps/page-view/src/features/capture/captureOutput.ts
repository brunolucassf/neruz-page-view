import { t } from '../i18n';
import { showToast } from '../toasts/toastStore';

const OBJECT_URL_LIFETIME_MS = 60_000;

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), OBJECT_URL_LIFETIME_MS);
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
