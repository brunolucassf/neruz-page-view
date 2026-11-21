import { NpvException } from '../messaging/errors';
import {
  SITEMAP_MAX_DEPTH,
  SITEMAP_MAX_FILES,
  SITEMAP_MAX_ROBOTS_ENTRIES,
  type SitemapFailureReason,
  type SitemapFile,
  type SitemapResult,
} from './types';
import { createCandidateCollector } from './url';

export type SitemapParse =
  | { kind: 'urlset'; locs: string[] }
  | { kind: 'index'; locs: string[] }
  | { kind: 'invalid'; locs: [] };

export type SitemapFileFailureReason = Exclude<
  NonNullable<SitemapFile['reason']>,
  'beyond-depth' | 'file-limit'
>;

export type SitemapFileLoad =
  | { ok: true; parsed: SitemapParse }
  | { ok: false; reason: SitemapFileFailureReason; httpStatus?: number | null };

export type SitemapLoader = (url: string, level: 0 | 1 | 2) => Promise<SitemapFileLoad>;

type XmlNode = {
  localName: string;
  textContent: string | null;
  children: ArrayLike<XmlNode>;
};

const PARSER_ERROR_SEARCH_DEPTH = 3;
const LINE_BREAK_PATTERN = /\r?\n/;
const ROBOTS_SITEMAP_PATTERN = /^\s*sitemap\s*:\s*(\S+)/i;

const childrenOf = (node: XmlNode): XmlNode[] => Array.from(node.children);

const hasParserError = (node: XmlNode, depth = 0): boolean => {
  if (node.localName === 'parsererror') return true;
  if (depth >= PARSER_ERROR_SEARCH_DEPTH) return false;
  return childrenOf(node).some((child) => hasParserError(child, depth + 1));
};

const readLocs = (root: XmlNode, entryName: 'url' | 'sitemap'): string[] => {
  const locs: string[] = [];
  for (const entry of childrenOf(root)) {
    if (entry.localName !== entryName) continue;
    const loc = childrenOf(entry).find((child) => child.localName === 'loc');
    const text = loc?.textContent?.trim();
    if (text) locs.push(text);
  }
  return locs;
};

export const parseSitemapDocument = (doc: Document): SitemapParse => {
  const root = doc.documentElement as unknown as XmlNode | null;
  if (!root || hasParserError(root)) return { kind: 'invalid', locs: [] };
  if (root.localName === 'urlset') return { kind: 'urlset', locs: readLocs(root, 'url') };
  if (root.localName === 'sitemapindex') {
    return { kind: 'index', locs: readLocs(root, 'sitemap') };
  }
  return { kind: 'invalid', locs: [] };
};

export const parseSitemapText = (text: string): SitemapParse => ({
  kind: 'urlset',
  locs: text
    .split(LINE_BREAK_PATTERN)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#')),
});

export const parseRobotsSitemaps = (text: string, origin: string): string[] => {
  const found: string[] = [];
  for (const line of text.split(LINE_BREAK_PATTERN)) {
    const candidate = ROBOTS_SITEMAP_PATTERN.exec(line)?.[1];
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const isSameOrigin = url.origin === origin;
      if (isSameOrigin && !found.includes(url.href)) found.push(url.href);
    } catch {
      continue;
    }
    if (found.length >= SITEMAP_MAX_ROBOTS_ENTRIES) break;
  }
  return found;
};

export const defaultSitemapUrls = (origin: string): string[] => [
  `${origin}/sitemap.xml`,
  `${origin}/sitemap_index.xml`,
];

type QueuedFile = { url: string; level: 0 | 1 | 2 };

const toFailureReason = (reason: SitemapFileFailureReason | null): SitemapFailureReason =>
  reason ?? 'empty';

const resolveChildUrl = (loc: string, rootUrl: string): URL | null => {
  try {
    return new URL(loc, rootUrl);
  } catch {
    return null;
  }
};

const crossOriginFile = (url: string, level: 1 | 2): SitemapFile => ({
  url,
  level,
  status: 'failed',
  reason: 'cross-origin',
  httpStatus: null,
  urlCount: 0,
});

export const resolveSitemapTree = async (
  rootUrl: string,
  loadFile: SitemapLoader,
): Promise<SitemapResult> => {
  const origin = new URL(rootUrl).origin;
  const collector = createCandidateCollector('sitemap', { origin });
  const files: SitemapFile[] = [];
  const queue: QueuedFile[] = [{ url: rootUrl, level: 0 }];
  const visited = new Set<string>([rootUrl]);
  let rootReason: SitemapFileFailureReason | null = null;
  let isFileLimitReached = false;

  for (let next = queue.shift(); next; next = queue.shift()) {
    if (collector.isFull()) break;
    if (files.length >= SITEMAP_MAX_FILES) {
      isFileLimitReached = true;
      break;
    }
    const loaded = await loadFile(next.url, next.level);
    if (!loaded.ok) {
      if (next.level === 0) rootReason = loaded.reason;
      files.push({
        url: next.url,
        level: next.level,
        status: 'failed',
        reason: loaded.reason,
        httpStatus: loaded.httpStatus ?? null,
        urlCount: 0,
      });
      continue;
    }
    const { parsed } = loaded;
    if (parsed.kind === 'invalid') {
      if (next.level === 0) rootReason = 'not-xml';
      files.push({
        url: next.url,
        level: next.level,
        status: 'failed',
        reason: 'not-xml',
        httpStatus: null,
        urlCount: 0,
      });
      continue;
    }
    files.push({
      url: next.url,
      level: next.level,
      status: 'ok',
      reason: null,
      httpStatus: null,
      urlCount: parsed.locs.length,
    });
    if (parsed.kind === 'urlset') {
      for (const loc of parsed.locs) collector.add(loc);
      continue;
    }
    const childLevel = next.level + 1;
    if (childLevel > SITEMAP_MAX_DEPTH) {
      collector.addBeyondDepth(parsed.locs.length);
      continue;
    }
    for (const loc of parsed.locs) {
      const child = resolveChildUrl(loc, rootUrl);
      if (!child || visited.has(child.href)) continue;
      visited.add(child.href);
      if (child.origin !== origin) {
        if (files.length < SITEMAP_MAX_FILES) {
          files.push(crossOriginFile(child.href, childLevel as 1 | 2));
        }
        continue;
      }
      queue.push({ url: child.href, level: childLevel as 1 | 2 });
    }
  }

  const result = collector.build();
  if (result.urls.length === 0) {
    throw new NpvException('NPV-SITEMAP-FAILED', 'sitemap has no usable URL', {
      reason: toFailureReason(rootReason),
    });
  }
  return { ...result, truncated: result.truncated || isFileLimitReached, files };
};
