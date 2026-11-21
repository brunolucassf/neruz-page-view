import type { FrameBackground } from '@neruz/core';
import type { DeviceCategory } from '@neruz/devices';
import backgroundIceSource from '@neruz/ui/frames/bg-ice.svg?raw';
import backgroundNightSource from '@neruz/ui/frames/bg-night.svg?raw';
import backgroundPetrolSource from '@neruz/ui/frames/bg-petrol.svg?raw';
import frameFoldableDarkSource from '@neruz/ui/frames/frame-foldable-dark.svg?raw';
import frameFoldableDark from '@neruz/ui/frames/frame-foldable-dark.svg?url';
import frameFoldableLightSource from '@neruz/ui/frames/frame-foldable-light.svg?raw';
import frameFoldableLight from '@neruz/ui/frames/frame-foldable-light.svg?url';
import frameDesktopDarkSource from '@neruz/ui/frames/frame-monitor-dark.svg?raw';
import frameDesktopDark from '@neruz/ui/frames/frame-monitor-dark.svg?url';
import frameDesktopLightSource from '@neruz/ui/frames/frame-monitor-light.svg?raw';
import frameDesktopLight from '@neruz/ui/frames/frame-monitor-light.svg?url';
import frameLaptopDarkSource from '@neruz/ui/frames/frame-notebook-dark.svg?raw';
import frameLaptopDark from '@neruz/ui/frames/frame-notebook-dark.svg?url';
import frameLaptopLightSource from '@neruz/ui/frames/frame-notebook-light.svg?raw';
import frameLaptopLight from '@neruz/ui/frames/frame-notebook-light.svg?url';
import framePhoneDarkSource from '@neruz/ui/frames/frame-phone-dark.svg?raw';
import framePhoneDark from '@neruz/ui/frames/frame-phone-dark.svg?url';
import framePhoneLightSource from '@neruz/ui/frames/frame-phone-light.svg?raw';
import framePhoneLight from '@neruz/ui/frames/frame-phone-light.svg?url';
import frameTabletDarkSource from '@neruz/ui/frames/frame-tablet-dark.svg?raw';
import frameTabletDark from '@neruz/ui/frames/frame-tablet-dark.svg?url';
import frameTabletLightSource from '@neruz/ui/frames/frame-tablet-light.svg?raw';
import frameTabletLight from '@neruz/ui/frames/frame-tablet-light.svg?url';
import frameManifest from '@neruz/ui/frames/frames.json';
import type { ScreenKind } from '../screens/presets';

export type FrameKind = Exclude<DeviceCategory, 'tv'>;

export type FrameRect = { x: number; y: number; width: number; height: number };

export type FrameSpec = {
  width: number;
  height: number;
  screen: FrameRect;
  hasOverlay: boolean;
};

export const FRAME_KINDS: readonly FrameKind[] = [
  'phone',
  'foldable',
  'tablet',
  'laptop',
  'desktop',
];

const MANIFEST_ID: Record<FrameKind, keyof typeof frameManifest.frames> = {
  phone: 'phone',
  foldable: 'foldable',
  tablet: 'tablet',
  laptop: 'notebook',
  desktop: 'monitor',
};

const FRAME_ASSETS: Record<
  FrameKind,
  { darkUrl: string; lightUrl: string; darkSource: string; lightSource: string }
> = {
  phone: {
    darkUrl: framePhoneDark,
    lightUrl: framePhoneLight,
    darkSource: framePhoneDarkSource,
    lightSource: framePhoneLightSource,
  },
  foldable: {
    darkUrl: frameFoldableDark,
    lightUrl: frameFoldableLight,
    darkSource: frameFoldableDarkSource,
    lightSource: frameFoldableLightSource,
  },
  tablet: {
    darkUrl: frameTabletDark,
    lightUrl: frameTabletLight,
    darkSource: frameTabletDarkSource,
    lightSource: frameTabletLightSource,
  },
  laptop: {
    darkUrl: frameLaptopDark,
    lightUrl: frameLaptopLight,
    darkSource: frameLaptopDarkSource,
    lightSource: frameLaptopLightSource,
  },
  desktop: {
    darkUrl: frameDesktopDark,
    lightUrl: frameDesktopLight,
    darkSource: frameDesktopDarkSource,
    lightSource: frameDesktopLightSource,
  },
};

const ROTATABLE_KINDS: readonly FrameKind[] = ['phone', 'foldable', 'tablet'];

export const BACKGROUND_FILL: Record<FrameBackground, string> = {
  ice: '#E8EEF4',
  night: '#080D14',
  petrol: '#007D8A',
  transparent: 'transparent',
};

export const BACKGROUND_SOURCE: Record<Exclude<FrameBackground, 'transparent'>, string> = {
  ice: backgroundIceSource,
  night: backgroundNightSource,
  petrol: backgroundPetrolSource,
};

export const toFrameKind = (kind: ScreenKind): FrameKind =>
  kind === 'tv' || kind === 'custom' ? 'desktop' : kind;

export const canRotateFrame = (kind: FrameKind) => ROTATABLE_KINDS.includes(kind);

export const getFrameSpec = (kind: FrameKind): FrameSpec => frameManifest.frames[MANIFEST_ID[kind]];

export const getFrameSource = (kind: FrameKind, isDark: boolean) =>
  isDark ? FRAME_ASSETS[kind].darkSource : FRAME_ASSETS[kind].lightSource;

export const getFrameAsset = (kind: FrameKind, isDark: boolean) => {
  const spec = getFrameSpec(kind);
  const assets = FRAME_ASSETS[kind];
  return {
    url: isDark ? assets.darkUrl : assets.lightUrl,
    width: spec.width,
    height: spec.height,
  };
};
