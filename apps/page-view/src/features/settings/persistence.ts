import { LOCALE_PREFERENCES } from '@neruz/i18n';
import * as v from 'valibot';
import { storage } from 'wxt/utils/storage';

export const MIN_MAX_SCREENS = 1;
export const MAX_MAX_SCREENS = 16;
export const MIN_IMAGE_QUALITY = 0.5;
export const MAX_IMAGE_QUALITY = 1;

const SettingsSchema = v.object({
  locale: v.picklist(LOCALE_PREFERENCES),
  theme: v.picklist(['dark', 'light', 'system']),
  maxScreens: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(MIN_MAX_SCREENS),
    v.maxValue(MAX_MAX_SCREENS),
  ),
  freezeOffscreenAfterMs: v.pipe(v.number(), v.minValue(0)),
  mirror: v.object({
    scroll: v.boolean(),
    click: v.boolean(),
    navigate: v.boolean(),
    input: v.boolean(),
  }),
  emulateEnvInMainWorld: v.boolean(),
});

const CaptureDefaultsSchema = v.object({
  printMode: v.picklist(['fast', 'experience', 'moments']),
  imageFormat: v.picklist(['png', 'jpeg', 'webp']),
  imageQuality: v.pipe(v.number(), v.minValue(MIN_IMAGE_QUALITY), v.maxValue(MAX_IMAGE_QUALITY)),
  videoFormat: v.picklist(['mp4', 'webm']),
  videoSize: v.picklist(['1080x1920', '1920x1080']),
  videoDurationMs: v.pipe(v.number(), v.minValue(3000), v.maxValue(600000)),
  mockup: v.object({
    enabled: v.boolean(),
    background: v.object({
      kind: v.picklist(['solid', 'gradient']),
      colors: v.array(v.string()),
    }),
  }),
});

const CustomDeviceSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(60)),
  width: v.pipe(v.number(), v.minValue(200), v.maxValue(7680)),
  height: v.pipe(v.number(), v.minValue(200), v.maxValue(7680)),
  dpr: v.pipe(v.number(), v.minValue(1), v.maxValue(4)),
  type: v.picklist(['phone', 'tablet', 'laptop', 'desktop', 'tv']),
  frame: v.picklist(['none', 'phone', 'tablet', 'laptop', 'monitor']),
  userAgentPresetId: v.optional(v.string()),
});

const KitSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(60)),
  deviceIds: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(16)),
  orientation: v.picklist(['portrait', 'landscape']),
});

const FramedCaptureSchema = v.object({
  isEnabled: v.boolean(),
  frameDeviceId: v.nullable(v.string()),
  background: v.picklist(['ice', 'night', 'petrol', 'transparent']),
});

export const SettingsExportSchema = v.object({
  schema: v.literal('neruz.pageview.settings'),
  version: v.literal(1),
  exportedAt: v.pipe(v.string(), v.isoTimestamp()),
  data: v.object({
    settings: SettingsSchema,
    devicesCustom: v.pipe(v.array(CustomDeviceSchema), v.maxLength(100)),
    devicesFavorites: v.pipe(v.array(v.string()), v.maxLength(100)),
    kits: v.pipe(v.array(KitSchema), v.maxLength(50)),
    captureDefaults: CaptureDefaultsSchema,
    framedCapture: v.optional(FramedCaptureSchema),
  }),
});

export type Settings = v.InferOutput<typeof SettingsSchema>;
export type CaptureDefaults = v.InferOutput<typeof CaptureDefaultsSchema>;
export type SettingsExport = v.InferOutput<typeof SettingsExportSchema>;
export type ThemePreference = Settings['theme'];

export const DEFAULT_SETTINGS: Settings = {
  locale: 'auto',
  theme: 'system',
  maxScreens: 8,
  freezeOffscreenAfterMs: 10000,
  mirror: { scroll: true, click: true, navigate: true, input: false },
  emulateEnvInMainWorld: false,
};

export const DEFAULT_CAPTURE_DEFAULTS: CaptureDefaults = {
  printMode: 'experience',
  imageFormat: 'png',
  imageQuality: 0.92,
  videoFormat: 'mp4',
  videoSize: '1080x1920',
  videoDurationMs: 15000,
  mockup: { enabled: false, background: { kind: 'solid', colors: ['#E8EEF4'] } },
};

const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});
const captureDefaultsItem = storage.defineItem<CaptureDefaults>('local:captureDefaults', {
  fallback: DEFAULT_CAPTURE_DEFAULTS,
  version: 1,
});
const customDevicesItem = storage.defineItem<unknown>('local:devices.custom', {
  fallback: [],
  version: 1,
});
const favoritesItem = storage.defineItem<unknown>('local:devices.favorites', {
  fallback: [],
  version: 1,
});
const kitsItem = storage.defineItem<unknown>('local:kits', { fallback: [], version: 1 });
const framedCaptureItem = storage.defineItem<unknown>('local:studio.framedCapture', {
  fallback: null,
  version: 1,
});

async function readChecked<TSchema extends v.GenericSchema>(
  schema: TSchema,
  read: () => Promise<unknown>,
  fallback: v.InferOutput<TSchema>,
): Promise<v.InferOutput<TSchema>> {
  try {
    const parsed = v.safeParse(schema, await read());
    return parsed.success ? parsed.output : fallback;
  } catch {
    return fallback;
  }
}

export const loadSettings = () =>
  readChecked(SettingsSchema, () => settingsItem.getValue(), DEFAULT_SETTINGS);
export const saveSettings = (value: Settings) => settingsItem.setValue(value);

export const loadCaptureDefaults = () =>
  readChecked(
    CaptureDefaultsSchema,
    () => captureDefaultsItem.getValue(),
    DEFAULT_CAPTURE_DEFAULTS,
  );
export const saveCaptureDefaults = (value: CaptureDefaults) => captureDefaultsItem.setValue(value);

export async function buildSettingsExport(): Promise<SettingsExport> {
  const [settings, captureDefaults, devicesCustom, devicesFavorites, kits, framedCapture] =
    await Promise.all([
      loadSettings(),
      loadCaptureDefaults(),
      readChecked(v.array(CustomDeviceSchema), () => customDevicesItem.getValue(), []),
      readChecked(v.array(v.string()), () => favoritesItem.getValue(), []),
      readChecked(v.array(KitSchema), () => kitsItem.getValue(), []),
      readChecked(v.nullable(FramedCaptureSchema), () => framedCaptureItem.getValue(), null),
    ]);
  return {
    schema: 'neruz.pageview.settings',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      devicesCustom,
      devicesFavorites,
      kits,
      captureDefaults,
      ...(framedCapture ? { framedCapture } : {}),
    },
  };
}

export async function applySettingsExport(payload: SettingsExport): Promise<void> {
  const { data } = payload;
  await Promise.all([
    settingsItem.setValue(data.settings),
    captureDefaultsItem.setValue(data.captureDefaults),
    customDevicesItem.setValue(data.devicesCustom),
    favoritesItem.setValue(data.devicesFavorites),
    kitsItem.setValue(data.kits),
    ...(data.framedCapture ? [framedCaptureItem.setValue(data.framedCapture)] : []),
  ]);
}
