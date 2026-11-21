import {
  type CustomDevice,
  CustomDeviceSchema,
  MAX_DEVICE_SIZE,
  MIN_DEVICE_SIZE,
} from '@neruz/core';
import type { Device } from '@neruz/devices';
import * as v from 'valibot';

export type CustomType = CustomDevice['type'];
export type CustomOrientation = 'portrait' | 'landscape';
export type CustomDeviceValue = Omit<CustomDevice, 'id'>;

export const CUSTOM_TYPES: readonly CustomType[] = ['phone', 'tablet', 'laptop', 'desktop', 'tv'];
export const MAX_CUSTOM_NAME_LENGTH = 60;
export const SIZE_LIMITS = { min: MIN_DEVICE_SIZE, max: MAX_DEVICE_SIZE } as const;

const DPR_BY_TYPE: Record<CustomType, number> = {
  phone: 3,
  tablet: 2,
  laptop: 2,
  desktop: 1,
  tv: 1,
};

const FRAME_BY_TYPE: Record<CustomType, CustomDevice['frame']> = {
  phone: 'phone',
  tablet: 'tablet',
  laptop: 'laptop',
  desktop: 'monitor',
  tv: 'monitor',
};

export type CustomDraft = {
  name: string;
  width: string;
  height: string;
  type: CustomType;
  orientation: CustomOrientation;
};

export type DraftErrors = { name: boolean; width: boolean; height: boolean };

export type DraftResult =
  | { isValid: true; value: CustomDeviceValue }
  | { isValid: false; errors: DraftErrors };

export const defaultOrientationFor = (type: CustomType): CustomOrientation =>
  type === 'phone' || type === 'tablet' ? 'portrait' : 'landscape';

export const createEmptyDraft = (): CustomDraft => ({
  name: '',
  width: '',
  height: '',
  type: 'phone',
  orientation: 'portrait',
});

export const draftFromDevice = (device: CustomDevice): CustomDraft => ({
  name: device.name,
  width: String(device.width),
  height: String(device.height),
  type: device.type,
  orientation: device.width > device.height ? 'landscape' : 'portrait',
});

const parseSize = (text: string): number | null => {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const size = Number(trimmed);
  return size >= MIN_DEVICE_SIZE && size <= MAX_DEVICE_SIZE ? size : null;
};

const orderByOrientation = (
  width: number,
  height: number,
  orientation: CustomOrientation,
): { width: number; height: number } => {
  const shorter = Math.min(width, height);
  const longer = Math.max(width, height);
  return orientation === 'portrait'
    ? { width: shorter, height: longer }
    : { width: longer, height: shorter };
};

export function validateDraft(draft: CustomDraft, previous?: CustomDevice): DraftResult {
  const name = draft.name.trim();
  const width = parseSize(draft.width);
  const height = parseSize(draft.height);
  const errors: DraftErrors = {
    name: name.length < 1 || name.length > MAX_CUSTOM_NAME_LENGTH,
    width: width === null,
    height: height === null,
  };
  if (errors.name || width === null || height === null) return { isValid: false, errors };
  const value: CustomDeviceValue = {
    name,
    ...orderByOrientation(width, height, draft.orientation),
    dpr: previous?.type === draft.type ? previous.dpr : DPR_BY_TYPE[draft.type],
    type: draft.type,
    frame: FRAME_BY_TYPE[draft.type],
    ...(previous?.userAgentPresetId ? { userAgentPresetId: previous.userAgentPresetId } : {}),
  };
  const checked = v.safeParse(CustomDeviceSchema, {
    id: previous?.id ?? crypto.randomUUID(),
    ...value,
  });
  return checked.success ? { isValid: true, value } : { isValid: false, errors };
}

export const customToDevice = (custom: CustomDevice): Device => ({
  id: custom.id,
  name: custom.name,
  category: custom.type,
  width: custom.width,
  height: custom.height,
  dpr: custom.dpr,
  isEssential: false,
  isVerified: true,
});

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const searchCustomDevices = (devices: readonly CustomDevice[], query: string) => {
  const needle = normalize(query.trim());
  return devices.filter((device) => normalize(device.name).includes(needle));
};
