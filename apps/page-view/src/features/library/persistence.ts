import { findDevice } from '@neruz/devices';
import * as v from 'valibot';
import { storage } from 'wxt/utils/storage';

const MAX_FAVORITES = 100;
const MAX_KITS = 50;
const MAX_KIT_SCREENS = 16;

const KitSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(60)),
  deviceIds: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(MAX_KIT_SCREENS)),
  orientation: v.picklist(['portrait', 'landscape']),
});

const FavoritesSchema = v.pipe(v.array(v.string()), v.maxLength(MAX_FAVORITES));
const KitsSchema = v.pipe(v.array(KitSchema), v.maxLength(MAX_KITS));

const OnboardingSchema = v.object({
  hasSeenWelcome: v.boolean(),
  hasSeenAddHint: v.boolean(),
  isEssentialsOpen: v.boolean(),
});

export const FRAME_BACKGROUNDS = ['ice', 'night', 'petrol', 'transparent'] as const;
export type FrameBackground = (typeof FRAME_BACKGROUNDS)[number];

const FramedCaptureSchema = v.object({
  isEnabled: v.boolean(),
  frameDeviceId: v.nullable(v.string()),
  background: v.picklist(FRAME_BACKGROUNDS),
});

export type Kit = v.InferOutput<typeof KitSchema>;
export type Onboarding = v.InferOutput<typeof OnboardingSchema>;
export type FramedCapturePrefs = v.InferOutput<typeof FramedCaptureSchema>;

export const DEFAULT_ONBOARDING: Onboarding = {
  hasSeenWelcome: false,
  hasSeenAddHint: false,
  isEssentialsOpen: true,
};

export const DEFAULT_FRAMED_CAPTURE: FramedCapturePrefs = {
  isEnabled: true,
  frameDeviceId: null,
  background: 'ice',
};

const favoritesItem = storage.defineItem<string[]>('local:devices.favorites', {
  fallback: [],
  version: 1,
});
const kitsItem = storage.defineItem<Kit[]>('local:kits', { fallback: [], version: 1 });
const onboardingItem = storage.defineItem<Onboarding>('local:studio.onboarding', {
  fallback: DEFAULT_ONBOARDING,
  version: 1,
});
const framedCaptureItem = storage.defineItem<FramedCapturePrefs>('local:studio.framedCapture', {
  fallback: DEFAULT_FRAMED_CAPTURE,
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

export const loadFavorites = async () =>
  (await readChecked(FavoritesSchema, () => favoritesItem.getValue(), [])).filter((id) =>
    findDevice(id),
  );
export const saveFavorites = (ids: string[]) => favoritesItem.setValue(ids.slice(0, MAX_FAVORITES));

export const loadKits = () => readChecked(KitsSchema, () => kitsItem.getValue(), []);
export const saveKits = (kits: Kit[]) => kitsItem.setValue(kits.slice(0, MAX_KITS));

export const loadOnboarding = () =>
  readChecked(OnboardingSchema, () => onboardingItem.getValue(), DEFAULT_ONBOARDING);
export const saveOnboarding = (value: Onboarding) => onboardingItem.setValue(value);

export const loadFramedCapture = () =>
  readChecked(FramedCaptureSchema, () => framedCaptureItem.getValue(), DEFAULT_FRAMED_CAPTURE);
export const saveFramedCapture = (value: FramedCapturePrefs) => framedCaptureItem.setValue(value);
