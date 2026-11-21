import type { BatchPage, BatchPrintMode } from './types';

const BASE_MS_PER_SCREEN: Record<BatchPrintMode, number> = {
  fast: 8000,
  experience: 25_000,
  moments: 20_000,
};
const LOAD_MS_PER_PAGE = 5000;
const RECENT_PAGES_WINDOW = 5;

type EtaPage = Pick<BatchPage, 'status' | 'startedAt' | 'endedAt'>;

export type EtaInput = {
  printMode: BatchPrintMode;
  screenCount: number;
  pages: readonly EtaPage[];
};

const REMAINING_STATUSES = new Set<EtaPage['status']>(['pending', 'loading', 'capturing']);
const COMPLETED_STATUSES = new Set<EtaPage['status']>(['done', 'partial']);

const readDurations = (pages: readonly EtaPage[]): number[] =>
  pages
    .filter((page) => COMPLETED_STATUSES.has(page.status))
    .flatMap((page) =>
      page.startedAt !== null && page.endedAt !== null ? [page.endedAt - page.startedAt] : [],
    );

export const estimateRemainingMs = ({ printMode, screenCount, pages }: EtaInput): number => {
  const remaining = pages.filter((page) => REMAINING_STATUSES.has(page.status)).length;
  if (remaining === 0) return 0;
  const recent = readDurations(pages).slice(-RECENT_PAGES_WINDOW);
  if (recent.length === 0) {
    return remaining * (screenCount * BASE_MS_PER_SCREEN[printMode] + LOAD_MS_PER_PAGE);
  }
  const average = recent.reduce((sum, duration) => sum + duration, 0) / recent.length;
  return Math.round(average * remaining);
};
