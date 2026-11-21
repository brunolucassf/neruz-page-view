import type { BatchSource } from '../storage/schemas';
import {
  type CandidateList,
  MAX_CANDIDATES,
  MAX_LIST_INPUT_CHARS,
  MAX_PAGE_URL_LENGTH,
} from './types';

export type NormalizeFailure = 'invalid' | 'scheme' | 'too-long' | 'not-page';

export type NormalizeResult = { ok: true; url: string } | { ok: false; reason: NormalizeFailure };

const NON_PAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  'pdf',
  'zip',
  'rar',
  '7z',
  'gz',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'svg',
  'ico',
  'mp4',
  'webm',
  'mov',
  'mp3',
  'wav',
  'xml',
  'json',
  'txt',
  'csv',
  'css',
  'js',
  'woff',
  'woff2',
  'ttf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
]);

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const HOST_WITH_PORT_PATTERN = /^[^/:]+:\d+(?:[/?#]|$)/;
const LIST_SEPARATOR_PATTERN = /[\s,;]+/;

const hasExplicitScheme = (raw: string): boolean =>
  SCHEME_PATTERN.test(raw) && !HOST_WITH_PORT_PATTERN.test(raw);

const hasNonPageExtension = (pathname: string): boolean => {
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex < 0) return false;
  return NON_PAGE_EXTENSIONS.has(lastSegment.slice(dotIndex + 1).toLowerCase());
};

const resolveRaw = (raw: string, base: string | undefined): URL | null => {
  try {
    if (raw.startsWith('/')) return base ? new URL(raw, base) : null;
    return new URL(hasExplicitScheme(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
};

export const normalizePageUrl = (raw: string, base?: string): NormalizeResult => {
  const trimmed = raw.trim();
  if (trimmed.length > MAX_PAGE_URL_LENGTH) return { ok: false, reason: 'too-long' };
  const parsed = resolveRaw(trimmed, base);
  if (!parsed) return { ok: false, reason: 'invalid' };
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'scheme' };
  }
  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';
  if (parsed.href.length > MAX_PAGE_URL_LENGTH) return { ok: false, reason: 'too-long' };
  if (hasNonPageExtension(parsed.pathname)) return { ok: false, reason: 'not-page' };
  return { ok: true, url: parsed.href };
};

const trimTrailingSlash = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

export const isSamePage = (first: string, second: string): boolean => {
  try {
    const a = new URL(first);
    const b = new URL(second);
    return a.origin === b.origin && trimTrailingSlash(a.pathname) === trimTrailingSlash(b.pathname);
  } catch {
    return false;
  }
};

export const originPattern = (url: string): string => `${new URL(url).origin}/*`;

export const collectOriginPatterns = (urls: readonly string[]): string[] => {
  const patterns = new Set<string>();
  for (const url of urls) {
    try {
      patterns.add(originPattern(url));
    } catch {}
  }
  return [...patterns];
};

export const emptyDiscarded = (): CandidateList['discarded'] => ({
  invalid: 0,
  scheme: 0,
  tooLong: 0,
  notPage: 0,
  duplicate: 0,
  offOrigin: 0,
  beyondDepth: 0,
});

const FAILURE_TO_DISCARD_KEY: Record<NormalizeFailure, keyof CandidateList['discarded']> = {
  invalid: 'invalid',
  scheme: 'scheme',
  'too-long': 'tooLong',
  'not-page': 'notPage',
};

export type CandidateCollector = {
  add: (raw: string) => boolean;
  addBeyondDepth: (amount: number) => void;
  isFull: () => boolean;
  build: () => CandidateList;
};

export type CandidateCollectorOptions = {
  base?: string;
  origin?: string;
  limit?: number;
};

export const createCandidateCollector = (
  source: BatchSource,
  { base, origin, limit = MAX_CANDIDATES }: CandidateCollectorOptions = {},
): CandidateCollector => {
  const urls: string[] = [];
  const seen = new Set<string>();
  const discarded = emptyDiscarded();
  let truncated = false;

  return {
    add: (raw) => {
      const result = normalizePageUrl(raw, base);
      if (!result.ok) {
        discarded[FAILURE_TO_DISCARD_KEY[result.reason]] += 1;
        return false;
      }
      if (origin && new URL(result.url).origin !== origin) {
        discarded.offOrigin += 1;
        return false;
      }
      if (seen.has(result.url)) {
        discarded.duplicate += 1;
        return false;
      }
      if (urls.length >= limit) {
        truncated = true;
        return false;
      }
      seen.add(result.url);
      urls.push(result.url);
      return true;
    },
    addBeyondDepth: (amount) => {
      discarded.beyondDepth += amount;
    },
    isFull: () => urls.length >= limit,
    build: () => ({ source, urls, discarded, truncated }),
  };
};

export const parseUrlList = (text: string, base?: string): CandidateList => {
  const collector = createCandidateCollector('list', { base });
  for (const piece of text.slice(0, MAX_LIST_INPUT_CHARS).split(LIST_SEPARATOR_PATTERN)) {
    if (piece) collector.add(piece);
  }
  return collector.build();
};
