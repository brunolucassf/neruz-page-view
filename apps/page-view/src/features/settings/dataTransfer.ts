import * as v from 'valibot';
import { downloadBlob } from '../capture/captureOutput';
import { useFramed } from '../capture/framedStore';
import { useLibrary } from '../library/libraryStore';
import { applySettingsExport, buildSettingsExport, SettingsExportSchema } from './persistence';
import { hydrateSettings } from './settingsEffects';

export const MAX_IMPORT_BYTES = 1024 * 1024;

export type ImportOutcome = 'ok' | 'tooBig' | 'invalid';

export async function exportSettingsFile(): Promise<void> {
  const payload = await buildSettingsExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const day = payload.exportedAt.slice(0, 10);
  downloadBlob(blob, `neruz-page-view-settings-${day}.json`);
}

export async function importSettingsFile(file: File): Promise<ImportOutcome> {
  if (file.size > MAX_IMPORT_BYTES) return 'tooBig';
  try {
    const parsed = v.safeParse(SettingsExportSchema, JSON.parse(await file.text()));
    if (!parsed.success) return 'invalid';
    await applySettingsExport(parsed.output);
  } catch {
    return 'invalid';
  }
  await Promise.all([
    hydrateSettings(),
    useFramed.getState().hydrate(),
    useLibrary.getState().hydrate(),
  ]);
  return 'ok';
}
