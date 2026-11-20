import { createTranslator, formatNumber, type MessageKey, ptBR } from '@neruz/i18n';

export type { MessageKey };

export const LOCALE = 'pt-BR';

export const t = createTranslator(LOCALE, ptBR);

export const formatInteger = (value: number) => formatNumber(LOCALE, Math.round(value));

export const formatSize = (width: number, height: number) =>
  `${formatInteger(width)} × ${formatInteger(height)}`;
