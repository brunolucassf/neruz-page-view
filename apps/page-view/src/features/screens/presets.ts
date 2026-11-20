import type { ScreenId } from '@neruz/core';
import type { MessageKey } from '../i18n';

export type ScreenKind = 'phone' | 'laptop';

export type ScreenPreset = {
  id: ScreenId;
  presetId: string;
  kind: ScreenKind;
  width: number;
  height: number;
};

export const MIN_SCREEN_SIZE = 200;
export const MAX_SCREEN_SIZE = 7680;
export const MAX_ACTIVE_SCREENS = 8;
export const SNAP_DISTANCE_PX = 4;

export const SNAP_WIDTHS = [
  360, 375, 390, 412, 414, 430, 768, 820, 1024, 1280, 1366, 1440, 1536, 1920, 2560,
] as const;

export const STARTING_SCREENS: readonly ScreenPreset[] = [
  { id: 's1', presetId: 'phone-390', kind: 'phone', width: 390, height: 844 },
  { id: 's2', presetId: 'laptop-1440', kind: 'laptop', width: 1440, height: 900 },
];

export const KIND_LABEL: Record<ScreenKind, MessageKey> = {
  phone: 'studio.library.cat.phone',
  laptop: 'studio.library.cat.laptop',
};

export const clampScreenSize = (value: number) =>
  Math.min(MAX_SCREEN_SIZE, Math.max(MIN_SCREEN_SIZE, Math.round(value)));
