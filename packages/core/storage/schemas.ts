import * as v from 'valibot';

export const MIN_MAX_SCREENS = 1;
export const MAX_MAX_SCREENS = 16;
export const MIN_IMAGE_QUALITY = 0.5;
export const MAX_IMAGE_QUALITY = 1;
export const MIN_VIDEO_DURATION_MS = 3000;
export const MAX_VIDEO_DURATION_MS = 600000;
export const MIN_MOCKUP_COLORS = 1;
export const MAX_MOCKUP_COLORS = 4;
export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 60;
export const MIN_DEVICE_SIZE = 200;
export const MAX_DEVICE_SIZE = 7680;
export const MIN_DEVICE_DPR = 1;
export const MAX_DEVICE_DPR = 4;
export const MAX_CUSTOM_DEVICES = 100;
export const MAX_FAVORITES = 100;
export const MAX_KITS = 50;
export const MAX_KIT_SCREENS = 16;

export const FRAME_KINDS = ['phone', 'foldable', 'tablet', 'laptop', 'desktop'] as const;
export const FRAME_BACKGROUNDS = ['ice', 'night', 'petrol', 'transparent'] as const;
export const FRAMED_SCOPES = ['fold', 'full'] as const;
export const DEFAULT_FRAMED_BACKGROUND_COLOR = '#C8D4E0';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const UPPERCASE_HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

const HexColorSchema = v.pipe(v.string(), v.regex(HEX_COLOR_PATTERN));
const NameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(MIN_NAME_LENGTH),
  v.maxLength(MAX_NAME_LENGTH),
);
const DeviceSizeSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(MIN_DEVICE_SIZE),
  v.maxValue(MAX_DEVICE_SIZE),
);

export const SettingsSchema = v.object({
  locale: v.picklist(['pt-BR', 'en', 'es', 'auto']),
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

export const CaptureDefaultsSchema = v.object({
  printMode: v.picklist(['fast', 'experience', 'moments']),
  imageFormat: v.picklist(['png', 'jpeg', 'webp']),
  imageQuality: v.pipe(v.number(), v.minValue(MIN_IMAGE_QUALITY), v.maxValue(MAX_IMAGE_QUALITY)),
  videoFormat: v.picklist(['mp4', 'webm']),
  videoSize: v.picklist(['1080x1920', '1920x1080']),
  videoDurationMs: v.pipe(
    v.number(),
    v.minValue(MIN_VIDEO_DURATION_MS),
    v.maxValue(MAX_VIDEO_DURATION_MS),
  ),
  mockup: v.object({
    enabled: v.boolean(),
    background: v.object({
      kind: v.picklist(['solid', 'gradient']),
      colors: v.pipe(
        v.array(HexColorSchema),
        v.minLength(MIN_MOCKUP_COLORS),
        v.maxLength(MAX_MOCKUP_COLORS),
      ),
    }),
  }),
});

export const CustomDeviceSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: NameSchema,
  width: DeviceSizeSchema,
  height: DeviceSizeSchema,
  dpr: v.pipe(v.number(), v.minValue(MIN_DEVICE_DPR), v.maxValue(MAX_DEVICE_DPR)),
  type: v.picklist(['phone', 'tablet', 'laptop', 'desktop', 'tv']),
  frame: v.picklist(['none', 'phone', 'tablet', 'laptop', 'monitor']),
  userAgentPresetId: v.optional(v.string()),
});

export const CustomDevicesSchema = v.pipe(
  v.array(CustomDeviceSchema),
  v.maxLength(MAX_CUSTOM_DEVICES),
);
export const FavoritesSchema = v.pipe(v.array(v.string()), v.maxLength(MAX_FAVORITES));

export const KitSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: NameSchema,
  deviceIds: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(MAX_KIT_SCREENS)),
  orientation: v.picklist(['portrait', 'landscape']),
});

export const KitsSchema = v.pipe(v.array(KitSchema), v.maxLength(MAX_KITS));

export const OnboardingSchema = v.object({
  hasSeenWelcome: v.boolean(),
  hasSeenAddHint: v.boolean(),
  isEssentialsOpen: v.boolean(),
});

const FrameDeviceIdSchema = v.fallback(v.nullable(v.picklist(FRAME_KINDS)), null);

export const FramedCaptureV1Schema = v.object({
  isEnabled: v.boolean(),
  frameDeviceId: FrameDeviceIdSchema,
  background: v.picklist(FRAME_BACKGROUNDS),
});

export const FramedCaptureSchema = v.object({
  isEnabled: v.boolean(),
  frameDeviceId: FrameDeviceIdSchema,
  background: v.picklist([...FRAME_BACKGROUNDS, 'custom']),
  backgroundColor: v.pipe(v.string(), v.toUpperCase(), v.regex(UPPERCASE_HEX_COLOR_PATTERN)),
  scope: v.picklist(FRAMED_SCOPES),
});

export const SettingsExportSchema = v.object({
  schema: v.literal('neruz.pageview.settings'),
  version: v.literal(1),
  exportedAt: v.pipe(v.string(), v.isoTimestamp()),
  data: v.object({
    settings: SettingsSchema,
    devicesCustom: CustomDevicesSchema,
    devicesFavorites: FavoritesSchema,
    kits: KitsSchema,
    captureDefaults: CaptureDefaultsSchema,
    framedCapture: v.optional(v.union([FramedCaptureSchema, FramedCaptureV1Schema])),
  }),
});

export type Settings = v.InferOutput<typeof SettingsSchema>;
export type ThemePreference = Settings['theme'];
export type CaptureDefaults = v.InferOutput<typeof CaptureDefaultsSchema>;
export type CustomDevice = v.InferOutput<typeof CustomDeviceSchema>;
export type Kit = v.InferOutput<typeof KitSchema>;
export type StudioOnboarding = v.InferOutput<typeof OnboardingSchema>;
export type FrameKind = (typeof FRAME_KINDS)[number];
export type FrameBackground = (typeof FRAME_BACKGROUNDS)[number];
export type FramedScope = (typeof FRAMED_SCOPES)[number];
export type FramedCapture = v.InferOutput<typeof FramedCaptureSchema>;
export type FramedCaptureV1 = v.InferOutput<typeof FramedCaptureV1Schema>;
export type SettingsExport = v.InferOutput<typeof SettingsExportSchema>;

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

export const DEFAULT_ONBOARDING: StudioOnboarding = {
  hasSeenWelcome: false,
  hasSeenAddHint: false,
  isEssentialsOpen: true,
};

export const DEFAULT_FRAMED_CAPTURE: FramedCapture = {
  isEnabled: true,
  frameDeviceId: null,
  background: 'ice',
  backgroundColor: DEFAULT_FRAMED_BACKGROUND_COLOR,
  scope: 'fold',
};
