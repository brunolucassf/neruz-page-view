import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import type { LandingCopy, Locale } from './types';

export const DICTIONARIES: Record<Locale, LandingCopy> = { 'pt-BR': pt, en, es };

export function getCopy(locale: Locale): LandingCopy {
  return DICTIONARIES[locale];
}

const REPO_URL = 'https://github.com/brunolucassf/neruz-page-view';
const INSTALL_URL = `${REPO_URL}#instalar`;

export const STORE_LINKS = {
  chrome: INSTALL_URL,
  edge: INSTALL_URL,
  firefox: INSTALL_URL,
  brave: INSTALL_URL,
  opera: INSTALL_URL,
  github: REPO_URL,
  license: `${REPO_URL}/blob/main/LICENSE`,
  issues: `${REPO_URL}/issues`,
  privacy: `${REPO_URL}/blob/main/docs/PRIVACIDADE.md`,
  contribute: `${REPO_URL}#contribuir`,
  permissions: `${REPO_URL}#privacidade-e-permiss%C3%B5es`,
} as const;

export const IS_STORE_LIVE = false;

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
