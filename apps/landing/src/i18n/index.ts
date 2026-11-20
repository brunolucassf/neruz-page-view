import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import type { LandingCopy, Locale } from './types';

export const DICTIONARIES: Record<Locale, LandingCopy> = { 'pt-BR': pt, en, es };

export function getCopy(locale: Locale): LandingCopy {
  return DICTIONARIES[locale];
}

export const STORE_LINKS = {
  chrome: '#instalar',
  edge: '#instalar',
  firefox: '#instalar',
  brave: '#instalar',
  opera: '#instalar',
  github: '#github',
  license: '#licenca',
  issues: '#problemas',
  privacy: '#privacidade',
} as const;

export const IS_STORE_LIVE = true;

export const FONTE_DEV_URL = 'https://fontedev.com';

export const BROWSER_ORDER = ['chrome', 'edge', 'firefox', 'opera', 'brave'] as const;
export const BROWSER_NAMES = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  opera: 'Opera',
  brave: 'Brave',
} as const;

export type { BrowserId, LandingCopy, Locale } from './types';
