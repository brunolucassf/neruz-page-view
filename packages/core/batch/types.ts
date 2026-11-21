import * as v from 'valibot';
import { NpvErrorSchema } from '../messaging/errors';
import {
  BATCH_SOURCES,
  FramedCaptureSchema,
  MAX_IMAGE_QUALITY,
  MAX_KIT_SCREENS,
  MAX_NAME_LENGTH,
  MIN_IMAGE_QUALITY,
} from '../storage/schemas';
import { OverflowReportSchema, PresetIdSchema, ScreenIdSchema } from '../types';

export const MAX_BATCH_CAPTURES = 400;
export const MAX_BATCH_ORIGINS = 10;
export const MAX_CANDIDATES = 5000;
export const MAX_COLLECTED_LINKS = 500;
export const MAX_LIST_INPUT_CHARS = 200_000;
export const MAX_PAGE_URL_LENGTH = 2048;
export const SITEMAP_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const SITEMAP_MAX_DEPTH = 2;
export const SITEMAP_MAX_FILES = 50;
export const SITEMAP_MAX_ROBOTS_ENTRIES = 5;
export const PAGE_LOAD_TIMEOUT_MS = 30_000;
export const SCREEN_CAPTURE_TIMEOUT_MS = 180_000;
export const ZIP_PART_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const ZIP_PART_MAX_ENTRIES = 65_000;
export const MEMORY_FALLBACK_MAX_BYTES = 512 * 1024 * 1024;
export const MAX_SCREEN_FILES = 40;
export const MAX_TITLE_LENGTH = 200;

export const SITEMAP_FAILURE_REASONS = [
  'not-found',
  'http',
  'too-large',
  'not-xml',
  'cross-origin',
  'network',
  'timeout',
  'empty',
] as const;

export const PAGE_ISSUES = [
  'iframe-blocked',
  'load-timeout',
  'login-redirect',
  'agent-missing',
  'permission-missing',
  'capture-timeout',
  'capture-failed',
  'storage-full',
] as const;

export const PAGE_NOTES = [
  'redirected',
  'http-error',
  'password-field',
  'stable-timeout',
  'split-into-parts',
] as const;

export const PAGE_STATUSES = [
  'pending',
  'loading',
  'capturing',
  'done',
  'partial',
  'failed',
  'skipped',
  'cancelled',
] as const;

export const SCREEN_STATUSES = ['pending', 'done', 'failed', 'skipped', 'cancelled'] as const;
export const BATCH_PRINT_MODES = ['fast', 'experience', 'moments'] as const;
export const BATCH_IMAGE_FORMATS = ['png', 'jpeg', 'webp'] as const;
export const BATCH_LOCALES = ['pt-BR', 'en', 'es'] as const;
export const BATCH_PHASES = [
  'idle',
  'collecting',
  'reviewing',
  'running',
  'paused',
  'exporting',
  'done',
  'cancelled',
] as const;
export const BATCH_PAUSE_REASONS = ['user', 'hidden', 'storage-full'] as const;

const count = v.pipe(v.number(), v.integer(), v.minValue(0));
const timestamp = v.pipe(v.number(), v.finite(), v.minValue(0));
const pageUrl = v.pipe(v.string(), v.maxLength(MAX_PAGE_URL_LENGTH));
const isoDate = v.pipe(v.string(), v.isoTimestamp());

export const BatchSourceSchema = v.picklist(BATCH_SOURCES);
export const PageIssueSchema = v.picklist(PAGE_ISSUES);
export const PageNoteSchema = v.picklist(PAGE_NOTES);
export const PageStatusSchema = v.picklist(PAGE_STATUSES);
export const ScreenStatusSchema = v.picklist(SCREEN_STATUSES);
export const BatchLocaleSchema = v.picklist(BATCH_LOCALES);

export const CandidateListSchema = v.object({
  source: BatchSourceSchema,
  urls: v.pipe(v.array(pageUrl), v.maxLength(MAX_CANDIDATES)),
  discarded: v.object({
    invalid: count,
    scheme: count,
    tooLong: count,
    notPage: count,
    duplicate: count,
    offOrigin: count,
    beyondDepth: count,
  }),
  truncated: v.boolean(),
});

export const SitemapFileSchema = v.object({
  url: pageUrl,
  level: v.picklist([0, 1, 2]),
  status: v.picklist(['ok', 'failed', 'skipped']),
  reason: v.nullable(
    v.picklist([
      'http',
      'too-large',
      'not-xml',
      'cross-origin',
      'network',
      'timeout',
      'beyond-depth',
      'file-limit',
    ]),
  ),
  httpStatus: v.nullable(count),
  urlCount: count,
});

export const SitemapResultSchema = v.object({
  ...CandidateListSchema.entries,
  files: v.pipe(v.array(SitemapFileSchema), v.maxLength(SITEMAP_MAX_FILES)),
});

export const BatchScreenSchema = v.object({
  screenId: ScreenIdSchema,
  presetId: PresetIdSchema,
  label: v.pipe(v.string(), v.maxLength(MAX_NAME_LENGTH)),
  width: v.pipe(v.number(), v.finite(), v.minValue(0)),
  height: v.pipe(v.number(), v.finite(), v.minValue(0)),
  dpr: v.pipe(v.number(), v.finite(), v.minValue(0)),
  orientation: v.picklist(['portrait', 'landscape']),
  folder: v.string(),
});

export const BatchConfigSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  source: BatchSourceSchema,
  urls: v.pipe(v.array(pageUrl), v.minLength(1), v.maxLength(MAX_CANDIDATES)),
  screens: v.pipe(v.array(BatchScreenSchema), v.minLength(1), v.maxLength(MAX_KIT_SCREENS)),
  printMode: v.picklist(BATCH_PRINT_MODES),
  imageFormat: v.picklist(BATCH_IMAGE_FORMATS),
  imageQuality: v.pipe(v.number(), v.minValue(MIN_IMAGE_QUALITY), v.maxValue(MAX_IMAGE_QUALITY)),
  framed: v.nullable(FramedCaptureSchema),
  locale: BatchLocaleSchema,
  createdAt: timestamp,
});

export const ScreenResultSchema = v.object({
  screenId: ScreenIdSchema,
  status: ScreenStatusSchema,
  issue: v.nullable(PageIssueSchema),
  error: v.nullable(NpvErrorSchema),
  stableMs: v.nullable(timestamp),
  stableTimedOut: v.boolean(),
  scrollHeight: v.nullable(timestamp),
  overflow: v.nullable(OverflowReportSchema),
  parts: count,
  files: v.pipe(v.array(v.string()), v.maxLength(MAX_SCREEN_FILES)),
  durationMs: v.nullable(timestamp),
});

const batchPageEntries = {
  index: v.pipe(v.number(), v.integer(), v.minValue(1)),
  url: pageUrl,
  finalUrl: v.nullable(pageUrl),
  title: v.nullable(v.pipe(v.string(), v.maxLength(MAX_TITLE_LENGTH))),
  httpStatus: v.nullable(count),
  status: PageStatusSchema,
  issue: v.nullable(PageIssueSchema),
  notes: v.array(PageNoteSchema),
  folder: v.string(),
  screens: v.array(ScreenResultSchema),
};

export const BatchPageSchema = v.object({
  ...batchPageEntries,
  startedAt: v.nullable(timestamp),
  endedAt: v.nullable(timestamp),
});

export const BatchStateSchema = v.object({
  phase: v.picklist(BATCH_PHASES),
  pauseReason: v.nullable(v.picklist(BATCH_PAUSE_REASONS)),
  candidates: v.nullable(CandidateListSchema),
  config: v.nullable(BatchConfigSchema),
  pages: v.array(BatchPageSchema),
  currentIndex: v.nullable(count),
  startedAt: v.nullable(timestamp),
  endedAt: v.nullable(timestamp),
  etaMs: v.nullable(timestamp),
  exportParts: v.array(v.object({ fileName: v.string(), bytes: count })),
});

export const BatchReportSchema = v.object({
  schema: v.literal('neruz.pageview.batch-report'),
  version: v.literal(1),
  generatedAt: isoDate,
  extensionVersion: v.string(),
  browser: v.string(),
  locale: BatchLocaleSchema,
  source: BatchSourceSchema,
  startedAt: isoDate,
  endedAt: isoDate,
  durationMs: timestamp,
  printMode: v.picklist(BATCH_PRINT_MODES),
  imageFormat: v.picklist(BATCH_IMAGE_FORMATS),
  framed: v.boolean(),
  screens: v.array(BatchScreenSchema),
  totals: v.object({
    requested: count,
    done: count,
    partial: count,
    failed: count,
    skipped: count,
    cancelled: count,
  }),
  pages: v.array(
    v.object({
      ...batchPageEntries,
      startedAt: v.nullable(isoDate),
      endedAt: v.nullable(isoDate),
      part: v.pipe(v.number(), v.integer(), v.minValue(1)),
    }),
  ),
  parts: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type SitemapFailureReason = (typeof SITEMAP_FAILURE_REASONS)[number];
export type PageIssue = v.InferOutput<typeof PageIssueSchema>;
export type PageNote = v.InferOutput<typeof PageNoteSchema>;
export type PageStatus = v.InferOutput<typeof PageStatusSchema>;
export type ScreenStatus = v.InferOutput<typeof ScreenStatusSchema>;
export type BatchLocale = v.InferOutput<typeof BatchLocaleSchema>;
export type CandidateList = v.InferOutput<typeof CandidateListSchema>;
export type SitemapFile = v.InferOutput<typeof SitemapFileSchema>;
export type SitemapResult = v.InferOutput<typeof SitemapResultSchema>;
export type BatchScreen = v.InferOutput<typeof BatchScreenSchema>;
export type BatchConfig = v.InferOutput<typeof BatchConfigSchema>;
export type ScreenResult = v.InferOutput<typeof ScreenResultSchema>;
export type BatchPage = v.InferOutput<typeof BatchPageSchema>;
export type BatchState = v.InferOutput<typeof BatchStateSchema>;
export type BatchPhase = BatchState['phase'];
export type BatchPauseReason = NonNullable<BatchState['pauseReason']>;
export type BatchReport = v.InferOutput<typeof BatchReportSchema>;
export type BatchPrintMode = BatchConfig['printMode'];
export type BatchImageFormat = BatchConfig['imageFormat'];
