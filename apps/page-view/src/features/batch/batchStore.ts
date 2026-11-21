import {
  type BatchConfig,
  type BatchPage,
  type BatchPauseReason,
  type BatchPhase,
  type BatchSource,
  type CandidateList,
  DEFAULT_BATCH_PREFERENCES,
  MAX_PAGE_LIMIT,
  MIN_PAGE_LIMIT,
  type ScreenResult,
  type SitemapFile,
} from '@neruz/core';
import { create } from 'zustand';
import type { MessageKey } from '../i18n';
import { loadBatchPreferences, saveBatchPreferences } from '../storage/items';

export type BatchMessage = { key: MessageKey; params?: Record<string, string | number> };

export type ExportPart = { fileName: string; bytes: number };

type BatchStore = {
  phase: BatchPhase;
  pauseReason: BatchPauseReason | null;
  candidates: CandidateList | null;
  config: BatchConfig | null;
  pages: BatchPage[];
  currentIndex: number | null;
  startedAt: number | null;
  endedAt: number | null;
  etaMs: number | null;
  exportParts: ExportPart[];
  source: BatchSource;
  pageLimit: number;
  listText: string;
  sitemapUrl: string;
  deselected: ReadonlySet<string>;
  sitemapFiles: SitemapFile[];
  message: BatchMessage | null;
  zipRatio: number;
  hasFiles: boolean;
  hydrate: () => Promise<void>;
  setSource: (source: BatchSource) => void;
  setPageLimit: (limit: number) => void;
  setListText: (text: string) => void;
  setSitemapUrl: (url: string) => void;
  toggleUrl: (url: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setMessage: (message: BatchMessage | null) => void;
  backToSetup: () => void;
};

const clampLimit = (limit: number) =>
  Math.min(MAX_PAGE_LIMIT, Math.max(MIN_PAGE_LIMIT, Math.round(limit)));

const initialRunState = {
  phase: 'idle' as BatchPhase,
  pauseReason: null,
  candidates: null,
  config: null,
  pages: [] as BatchPage[],
  currentIndex: null,
  startedAt: null,
  endedAt: null,
  etaMs: null,
  exportParts: [] as ExportPart[],
  sitemapFiles: [] as SitemapFile[],
  deselected: new Set<string>() as ReadonlySet<string>,
  message: null,
  zipRatio: 0,
  hasFiles: false,
};

export const useBatch = create<BatchStore>()((set, get) => {
  const persistPreferences = () => {
    const { pageLimit, source } = get();
    void saveBatchPreferences({ pageLimit, source });
  };

  return {
    ...initialRunState,
    source: DEFAULT_BATCH_PREFERENCES.source,
    pageLimit: DEFAULT_BATCH_PREFERENCES.pageLimit,
    listText: '',
    sitemapUrl: '',

    hydrate: async () => {
      const { pageLimit, source } = await loadBatchPreferences();
      set({ pageLimit, source });
    },

    setSource: (source) => {
      set({ source, message: null });
      persistPreferences();
    },

    setPageLimit: (limit) => {
      set({ pageLimit: clampLimit(limit) });
      persistPreferences();
    },

    setListText: (listText) => set({ listText, message: null }),
    setSitemapUrl: (sitemapUrl) => set({ sitemapUrl, message: null }),

    toggleUrl: (url) => {
      const next = new Set(get().deselected);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      set({ deselected: next });
    },

    selectAll: () => set({ deselected: new Set() }),

    clearSelection: () => {
      const { candidates, pageLimit } = get();
      set({ deselected: new Set(candidates?.urls.slice(0, pageLimit) ?? []) });
    },

    setMessage: (message) => set({ message }),

    backToSetup: () => set({ ...initialRunState }),
  };
});

export const selectVisibleUrls = (state: Pick<BatchStore, 'candidates' | 'pageLimit'>) =>
  state.candidates?.urls.slice(0, state.pageLimit) ?? [];

export const selectSelectedUrls = (
  state: Pick<BatchStore, 'candidates' | 'pageLimit' | 'deselected'>,
) => selectVisibleUrls(state).filter((url) => !state.deselected.has(url));

export const countPagesByStatus = (pages: readonly BatchPage[]) => {
  const counts = { done: 0, partial: 0, failed: 0, skipped: 0, cancelled: 0 };
  for (const page of pages) {
    if (page.status in counts) counts[page.status as keyof typeof counts] += 1;
  }
  return counts;
};

export const patchPage = (index: number, patch: Partial<BatchPage>) =>
  useBatch.setState((state) => ({
    pages: state.pages.map((page) => (page.index === index ? { ...page, ...patch } : page)),
  }));

export const patchScreenResult = (
  pageIndex: number,
  screenId: ScreenResult['screenId'],
  patch: Partial<ScreenResult>,
) =>
  useBatch.setState((state) => ({
    pages: state.pages.map((page) =>
      page.index === pageIndex
        ? {
            ...page,
            screens: page.screens.map((screen) =>
              screen.screenId === screenId ? { ...screen, ...patch } : screen,
            ),
          }
        : page,
    ),
  }));
