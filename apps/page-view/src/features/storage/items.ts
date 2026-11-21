import {
  type BatchPreferences,
  BatchPreferencesSchema,
  type CaptureDefaults,
  CaptureDefaultsSchema,
  type CustomDevice,
  CustomDevicesSchema,
  DEFAULT_BATCH_PREFERENCES,
  DEFAULT_CAPTURE_DEFAULTS,
  DEFAULT_FRAMED_CAPTURE,
  DEFAULT_ONBOARDING,
  DEFAULT_SETTINGS,
  FavoritesSchema,
  type FramedCapture,
  FramedCaptureSchema,
  type FramedCaptureV1,
  FramedCaptureV1Schema,
  type Kit,
  KitsSchema,
  MAX_FAVORITES,
  MAX_KITS,
  migrateFramedCaptureV1ToV2,
  OnboardingSchema,
  type Settings,
  type SettingsExport,
  SettingsSchema,
  type StudioOnboarding,
} from '@neruz/core';
import { findDevice } from '@neruz/devices';
import * as v from 'valibot';
import { storage } from 'wxt/utils/storage';

const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});
const captureDefaultsItem = storage.defineItem<CaptureDefaults>('local:captureDefaults', {
  fallback: DEFAULT_CAPTURE_DEFAULTS,
  version: 1,
});
const customDevicesItem = storage.defineItem<CustomDevice[]>('local:devices.custom', {
  fallback: [],
  version: 1,
});
const favoritesItem = storage.defineItem<string[]>('local:devices.favorites', {
  fallback: [],
  version: 1,
});
const kitsItem = storage.defineItem<Kit[]>('local:kits', { fallback: [], version: 1 });
const onboardingItem = storage.defineItem<StudioOnboarding>('local:studio.onboarding', {
  fallback: DEFAULT_ONBOARDING,
  version: 1,
});
const framedCaptureItem = storage.defineItem<FramedCapture>('local:studio.framedCapture', {
  fallback: DEFAULT_FRAMED_CAPTURE,
  version: 2,
  migrations: {
    2: (old: unknown): FramedCapture => {
      const parsed = v.safeParse(FramedCaptureV1Schema, old);
      return parsed.success ? migrateFramedCaptureV1ToV2(parsed.output) : DEFAULT_FRAMED_CAPTURE;
    },
  },
});

const batchPreferencesItem = storage.defineItem<BatchPreferences>('local:studio.batch', {
  fallback: DEFAULT_BATCH_PREFERENCES,
  version: 1,
});

function logInvalid(key: string): void {
  console.warn('NPV-STORAGE-INVALID', key);
}

type ReadableItem = { key: string; getValue: () => Promise<unknown> };
type WritableItem<TValue> = { key: string; setValue: (value: TValue) => Promise<void> };

async function readStored(item: ReadableItem): Promise<unknown> {
  try {
    return await item.getValue();
  } catch {
    return undefined;
  }
}

async function readChecked<TSchema extends v.GenericSchema>(
  schema: TSchema,
  item: ReadableItem,
  fallback: v.InferOutput<TSchema>,
): Promise<v.InferOutput<TSchema>> {
  const parsed = v.safeParse(schema, await readStored(item));
  if (parsed.success) return parsed.output;
  logInvalid(item.key);
  return fallback;
}

async function writeChecked<TSchema extends v.GenericSchema>(
  schema: TSchema,
  item: WritableItem<v.InferOutput<TSchema>>,
  value: v.InferInput<TSchema>,
): Promise<void> {
  const parsed = v.safeParse(schema, value);
  if (!parsed.success) {
    logInvalid(item.key);
    return;
  }
  await item.setValue(parsed.output);
}

export const loadSettings = () => readChecked(SettingsSchema, settingsItem, DEFAULT_SETTINGS);
export const saveSettings = (value: Settings) => writeChecked(SettingsSchema, settingsItem, value);

export const loadCaptureDefaults = () =>
  readChecked(CaptureDefaultsSchema, captureDefaultsItem, DEFAULT_CAPTURE_DEFAULTS);
export const saveCaptureDefaults = (value: CaptureDefaults) =>
  writeChecked(CaptureDefaultsSchema, captureDefaultsItem, value);

export const loadCustomDevices = () => readChecked(CustomDevicesSchema, customDevicesItem, []);
export const saveCustomDevices = (devices: CustomDevice[]) =>
  writeChecked(CustomDevicesSchema, customDevicesItem, devices);

export const keepKnownFavorites = (ids: readonly string[], customDeviceIds: readonly string[]) =>
  ids.filter((id) => findDevice(id) || customDeviceIds.includes(id));

export const loadFavorites = async (customDeviceIds: readonly string[]) =>
  keepKnownFavorites(await readChecked(FavoritesSchema, favoritesItem, []), customDeviceIds);
export const saveFavorites = (ids: string[]) =>
  writeChecked(FavoritesSchema, favoritesItem, ids.slice(0, MAX_FAVORITES));

export const loadKits = () => readChecked(KitsSchema, kitsItem, []);
export const saveKits = (kits: Kit[]) =>
  writeChecked(KitsSchema, kitsItem, kits.slice(0, MAX_KITS));

export const loadOnboarding = () =>
  readChecked(OnboardingSchema, onboardingItem, DEFAULT_ONBOARDING);
export const saveOnboarding = (value: StudioOnboarding) =>
  writeChecked(OnboardingSchema, onboardingItem, value);

export const loadFramedCapture = () =>
  readChecked(FramedCaptureSchema, framedCaptureItem, DEFAULT_FRAMED_CAPTURE);
export const saveFramedCapture = (value: FramedCapture) =>
  writeChecked(FramedCaptureSchema, framedCaptureItem, value);

export const loadBatchPreferences = () =>
  readChecked(BatchPreferencesSchema, batchPreferencesItem, DEFAULT_BATCH_PREFERENCES);
export const saveBatchPreferences = (value: BatchPreferences) =>
  writeChecked(BatchPreferencesSchema, batchPreferencesItem, value);

export async function buildSettingsExport(): Promise<SettingsExport> {
  const [settings, captureDefaults, devicesCustom, kits, framedCapture] = await Promise.all([
    loadSettings(),
    loadCaptureDefaults(),
    loadCustomDevices(),
    loadKits(),
    loadFramedCapture(),
  ]);
  const devicesFavorites = await loadFavorites(devicesCustom.map((device) => device.id));
  return {
    schema: 'neruz.pageview.settings',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { settings, devicesCustom, devicesFavorites, kits, captureDefaults, framedCapture },
  };
}

function toFramedCaptureV2(imported: FramedCapture | FramedCaptureV1): FramedCapture {
  return v.is(FramedCaptureSchema, imported) ? imported : migrateFramedCaptureV1ToV2(imported);
}

export async function applySettingsExport(payload: SettingsExport): Promise<void> {
  const { data } = payload;
  await Promise.all([
    saveSettings(data.settings),
    saveCaptureDefaults(data.captureDefaults),
    saveCustomDevices(data.devicesCustom),
    saveFavorites(
      keepKnownFavorites(
        data.devicesFavorites,
        data.devicesCustom.map((device) => device.id),
      ),
    ),
    saveKits(data.kits),
    ...(data.framedCapture ? [saveFramedCapture(toFramedCaptureV2(data.framedCapture))] : []),
  ]);
}
