import {
  createTranslator,
  formatNumber,
  getMessages,
  type Locale,
  type LocalePreference,
  type MessageKey,
  type MessageParams,
  resolveLocale,
} from '@neruz/i18n';
import { create } from 'zustand';

export type { MessageKey };

const readBrowserLanguages = (): readonly string[] =>
  typeof navigator === 'undefined' ? [] : navigator.languages;

const buildTranslator = (locale: Locale) => createTranslator(locale, getMessages(locale));

let activeLocale: Locale = resolveLocale('auto', readBrowserLanguages());
let translate = buildTranslator(activeLocale);

type LocaleState = {
  locale: Locale;
  applyPreference: (preference: LocalePreference) => void;
};

export const useLocale = create<LocaleState>()((set, get) => ({
  locale: activeLocale,
  applyPreference: (preference) => {
    const next = resolveLocale(preference, readBrowserLanguages());
    if (next === get().locale) return;
    activeLocale = next;
    translate = buildTranslator(next);
    document.documentElement.lang = next;
    set({ locale: next });
  },
}));

export const t = (key: MessageKey, params?: MessageParams): string => translate(key, params);

export const formatInteger = (value: number) => formatNumber(activeLocale, Math.round(value));

export const formatSize = (width: number, height: number) =>
  `${formatInteger(width)} × ${formatInteger(height)}`;
