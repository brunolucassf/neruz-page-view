import { copyImage, downloadBlob, openPart } from '../capture/captureOutput';
import { useCapture } from '../capture/captureStore';
import { useFramed } from '../capture/framedStore';
import { applyFrame } from '../capture/framing/framedOutput';
import { t } from '../i18n';
import { showToast } from '../toasts/toastStore';
import { type CapturedShot, type ExportFormat, exportShots } from './exportService';
import { useResult } from './resultStore';

const BATCH_DOWNLOAD_GAP_MS = 150;

let cached: { key: string; shots: Promise<CapturedShot[]> } | null = null;

function buildCacheKey(): string {
  const framed = useFramed.getState();
  const { captureId } = useResult.getState();
  return [
    captureId,
    framed.isEnabled,
    framed.frameDeviceId,
    framed.background,
    framed.isCustomColor ? framed.customColor : '-',
    framed.scope,
  ].join('|');
}

export function resolveOutputShots(): Promise<CapturedShot[]> {
  const { shots } = useResult.getState();
  if (!useFramed.getState().isEnabled) return Promise.resolve(shots);
  const key = buildCacheKey();
  if (cached?.key === key) return cached.shots;
  const pending = Promise.all(shots.map(applyFrame));
  cached = { key, shots: pending };
  pending.catch(() => {
    if (cached?.key === key) cached = null;
  });
  return pending;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function runPrepared<TValue>(task: () => Promise<TValue>, retry: () => void) {
  const { setPreparing } = useResult.getState();
  setPreparing(true);
  try {
    return await task();
  } catch {
    showToast({
      tone: 'error',
      title: t('state.error.generic.title'),
      body: t('state.error.export'),
      actions: [{ label: t('state.error.retry'), onPress: retry }],
    });
    return null;
  } finally {
    setPreparing(false);
  }
}

export async function exportOutput(format?: ExportFormat): Promise<void> {
  const { shots: sourceShots, host, isPreparing } = useResult.getState();
  if (sourceShots.length === 0 || isPreparing) return;
  const { format: imageFormat, quality } = useCapture.getState();
  const chosen: ExportFormat = format ?? imageFormat;
  const isHeavy = chosen === 'pdf' || chosen === 'zip' || sourceShots.length > 1;
  if (isHeavy) showToast({ tone: 'neutral', title: t('state.processing') });

  const outcomes = await runPrepared(
    async () => exportShots(await resolveOutputShots(), host, chosen, imageFormat, quality),
    () => void exportOutput(format),
  );
  if (!outcomes) return;
  for (const outcome of outcomes) {
    downloadBlob(outcome.blob, outcome.filename);
    if (outcomes.length > 1) await wait(BATCH_DOWNLOAD_GAP_MS);
  }
}

async function firstOutputPart(): Promise<Blob | null> {
  if (useResult.getState().shots.length === 0) return null;
  const shots = await runPrepared(resolveOutputShots, () => void copyOutput());
  return shots?.[0]?.result.parts[0] ?? null;
}

export async function copyOutput(): Promise<void> {
  const part = await firstOutputPart();
  if (part) await copyImage(part);
}

export async function showOutput(): Promise<void> {
  const part = await firstOutputPart();
  if (part) openPart(part);
}

export function redoWithFrame(): void {
  useFramed.getState().patch({ isEnabled: true });
  void exportOutput();
}
