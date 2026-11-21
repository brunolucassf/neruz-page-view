import type { ScreenId } from '@neruz/core';
import type { Device, DeviceCategory } from '@neruz/devices';
import type { MessageKey } from '../i18n';

export type ScreenKind = DeviceCategory | 'custom';

export type ScreenPreset = {
  id: ScreenId;
  presetId: string;
  name: string;
  kind: ScreenKind;
  width: number;
  height: number;
  dpr: number;
};

export const MIN_SCREEN_SIZE = 200;
export const MAX_SCREEN_SIZE = 7680;
export const MAX_SCREENS = 16;
export const SNAP_DISTANCE_PX = 4;

export const SNAP_WIDTHS = [
  360, 375, 390, 412, 414, 430, 768, 820, 1024, 1280, 1366, 1440, 1536, 1920, 2560,
] as const;

export const KIND_LABEL: Record<ScreenKind, MessageKey> = {
  phone: 'studio.library.cat.phone',
  foldable: 'studio.library.cat.foldable',
  tablet: 'studio.library.cat.tablet',
  laptop: 'studio.library.cat.laptop',
  desktop: 'studio.library.cat.desktop',
  tv: 'studio.library.cat.tv',
  custom: 'studio.library.cat.custom',
};

export const clampScreenSize = (value: number) =>
  Math.min(MAX_SCREEN_SIZE, Math.max(MIN_SCREEN_SIZE, Math.round(value)));

export const presetFromDevice = (id: ScreenId, device: Device): ScreenPreset => ({
  id,
  presetId: device.id,
  name: device.name,
  kind: device.category,
  width: device.width,
  height: device.height,
  dpr: device.dpr,
});

export function pickFreeScreenId(takenIds: readonly ScreenId[]): ScreenId | null {
  for (let index = 1; index <= MAX_SCREENS; index += 1) {
    const candidate: ScreenId = `s${index}`;
    if (!takenIds.includes(candidate)) return candidate;
  }
  return null;
}
