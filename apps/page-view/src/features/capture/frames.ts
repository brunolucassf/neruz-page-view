import type { DeviceCategory } from '@neruz/devices';
import frameFoldableDark from '@neruz/ui/frames/frame-foldable-dark.svg?url';
import frameFoldableLight from '@neruz/ui/frames/frame-foldable-light.svg?url';
import frameDesktopDark from '@neruz/ui/frames/frame-monitor-dark.svg?url';
import frameDesktopLight from '@neruz/ui/frames/frame-monitor-light.svg?url';
import frameLaptopDark from '@neruz/ui/frames/frame-notebook-dark.svg?url';
import frameLaptopLight from '@neruz/ui/frames/frame-notebook-light.svg?url';
import framePhoneDark from '@neruz/ui/frames/frame-phone-dark.svg?url';
import framePhoneLight from '@neruz/ui/frames/frame-phone-light.svg?url';
import frameTabletDark from '@neruz/ui/frames/frame-tablet-dark.svg?url';
import frameTabletLight from '@neruz/ui/frames/frame-tablet-light.svg?url';
import type { FrameBackground } from '../library/persistence';
import type { ScreenKind } from '../screens/presets';

export type FrameKind = Exclude<DeviceCategory, 'tv'>;

export const FRAME_KINDS: readonly FrameKind[] = [
  'phone',
  'foldable',
  'tablet',
  'laptop',
  'desktop',
];

const FRAME_URLS: Record<
  FrameKind,
  { dark: string; light: string; width: number; height: number }
> = {
  phone: { dark: framePhoneDark, light: framePhoneLight, width: 422, height: 876 },
  foldable: { dark: frameFoldableDark, light: frameFoldableLight, width: 768, height: 864 },
  tablet: { dark: frameTabletDark, light: frameTabletLight, width: 824, height: 1080 },
  laptop: { dark: frameLaptopDark, light: frameLaptopLight, width: 1688, height: 1000 },
  desktop: { dark: frameDesktopDark, light: frameDesktopLight, width: 1968, height: 1318 },
};

export const BACKGROUND_FILL: Record<FrameBackground, string> = {
  ice: '#E8EEF4',
  night: '#080D14',
  petrol: '#007D8A',
  transparent: 'transparent',
};

export const toFrameKind = (kind: ScreenKind): FrameKind =>
  kind === 'tv' || kind === 'custom' ? 'desktop' : kind;

export const getFrameAsset = (kind: FrameKind, isDark: boolean) => {
  const asset = FRAME_URLS[kind];
  return { url: isDark ? asset.dark : asset.light, width: asset.width, height: asset.height };
};
