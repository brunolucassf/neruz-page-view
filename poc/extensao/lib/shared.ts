export const SCREEN_NAME_PATTERN = /^npv:[a-z0-9._-]{1,64}$/;
export const PHONE = { screen: 's1', width: 390, height: 844 };
export const DESKTOP = { screen: 's2', width: 1440, height: 900 };

export type ScrollAnchor = {
  selector: string | null;
  offsetRatio: number;
  pageRatio: number;
  sourceScreen: string;
};

export type FrameCommand =
  | { type: 'scroll.apply'; anchor: ScrollAnchor }
  | { type: 'warmup' }
  | { type: 'metrics' }
  | { type: 'scrollTo'; top: number }
  | { type: 'hideFixed'; hidden: boolean }
  | { type: 'hideScrollbar'; hidden: boolean }
  | { type: 'waitStable' }
  | { type: 'autoscroll'; durationMs: number }
  | { type: 'ping' };

export type BackgroundRequest =
  | { type: 'studio.enable' }
  | { type: 'studio.disable' }
  | { type: 'frames.get' }
  | { type: 'stats.get' }
  | { type: 'rec.start'; rect: Rect; viewport: Size; durationMs: number; outWidth: number; outHeight: number }
  | { type: 'rec.progress'; log: string[] }
  | { type: 'frame.hello'; screen: string; origin: string }
  | { type: 'scroll'; anchor: ScrollAnchor };

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
