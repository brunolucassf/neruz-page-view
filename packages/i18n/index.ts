export type { LocalePreference } from './src/locales';
export {
  detectBrowserLocale,
  getMessages,
  LOCALE_NATIVE_NAMES,
  LOCALE_PREFERENCES,
  resolveLocale,
} from './src/locales';
export { en } from './src/locales/en';
export { es } from './src/locales/es';
export type { MessageKey } from './src/locales/pt-BR';
export { ptBR } from './src/locales/pt-BR';
export type { Locale, MessageParams, Messages } from './src/runtime';
export { createTranslator, formatNumber } from './src/runtime';
