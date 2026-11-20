import { sleep } from '@neruz/core';

const PAINT_FALLBACK_MS = 100;

export const nextPaint = (): Promise<void> =>
  Promise.race([
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    sleep(PAINT_FALLBACK_MS),
  ]);

export const maxScrollTop = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

export const scrollInstantly = (top: number) => window.scrollTo({ top, behavior: 'instant' });
