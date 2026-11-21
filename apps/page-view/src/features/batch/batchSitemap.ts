import {
  type CandidateList,
  createCandidateCollector,
  defaultSitemapUrls,
  emptyDiscarded,
  NpvException,
  parseRobotsSitemaps,
  parseSitemapDocument,
  parseSitemapText,
  resolveSitemapTree,
  SITEMAP_MAX_FILE_BYTES,
  type SitemapFile,
  type SitemapFileLoad,
  type SitemapResult,
} from '@neruz/core';

const FILE_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 60_000;
const GZIP_FIRST_BYTE = 0x1f;
const GZIP_SECOND_BYTE = 0x8b;
const SITEMAP_PATH_PATTERN = /\.(?:xml|xml\.gz|txt)$/i;

class TooLargeError extends Error {}

async function readLimited(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > SITEMAP_MAX_FILE_BYTES) {
      await reader.cancel();
      throw new TooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

const isGzip = (bytes: Uint8Array) => bytes[0] === GZIP_FIRST_BYTE && bytes[1] === GZIP_SECOND_BYTE;

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return readLimited(stream);
}

type FetchedFile = { text: string; contentType: string };

async function fetchText(
  url: string,
  signal: AbortSignal,
): Promise<{ ok: true; file: FetchedFile } | Extract<SitemapFileLoad, { ok: false }>> {
  const fileSignal = AbortSignal.any([signal, AbortSignal.timeout(FILE_TIMEOUT_MS)]);
  try {
    const response = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      signal: fileSignal,
    });
    if (new URL(response.url).origin !== new URL(url).origin)
      return { ok: false, reason: 'cross-origin' };
    if (!response.ok) return { ok: false, reason: 'http', httpStatus: response.status };
    if (!response.body) return { ok: false, reason: 'network' };
    const raw = (await readLimited(response.body)) as Uint8Array<ArrayBuffer>;
    const bytes = isGzip(raw) ? ((await gunzip(raw)) as Uint8Array<ArrayBuffer>) : raw;
    return {
      ok: true,
      file: {
        text: new TextDecoder().decode(bytes),
        contentType: response.headers.get('content-type') ?? '',
      },
    };
  } catch (cause) {
    if (cause instanceof TooLargeError) return { ok: false, reason: 'too-large' };
    return { ok: false, reason: fileSignal.aborted ? 'timeout' : 'network' };
  }
}

const isPlainText = (url: string, contentType: string) =>
  new URL(url).pathname.toLowerCase().endsWith('.txt') || contentType.includes('text/plain');

const createLoader = (signal: AbortSignal) =>
  async function loadSitemapFile(url: string): Promise<SitemapFileLoad> {
    const fetched = await fetchText(url, signal);
    if (!fetched.ok) return fetched;
    const { text, contentType } = fetched.file;
    if (isPlainText(url, contentType)) return { ok: true, parsed: parseSitemapText(text) };
    const document = new DOMParser().parseFromString(text, 'application/xml');
    const parsed = parseSitemapDocument(document);
    return parsed.kind === 'invalid' ? { ok: false, reason: 'not-xml' } : { ok: true, parsed };
  };

type Discovery = { roots: string[]; isFallback: boolean };

async function discoverRoots(origin: string, signal: AbortSignal): Promise<Discovery> {
  const robots = await fetchText(`${origin}/robots.txt`, signal);
  const declared = robots.ok ? parseRobotsSitemaps(robots.file.text, origin) : [];
  if (declared.length > 0) return { roots: declared, isFallback: false };
  return { roots: defaultSitemapUrls(origin), isFallback: true };
}

const sumDiscarded = (first: CandidateList['discarded'], second: CandidateList['discarded']) => {
  const total = emptyDiscarded();
  for (const key of Object.keys(total) as (keyof typeof total)[]) {
    total[key] = first[key] + second[key];
  }
  return total;
};

function mergeResults(results: SitemapResult[], origin: string): SitemapResult {
  const collector = createCandidateCollector('sitemap', { origin });
  let discarded = emptyDiscarded();
  const files: SitemapFile[] = [];
  let truncated = false;
  for (const result of results) {
    for (const url of result.urls) collector.add(url);
    discarded = sumDiscarded(discarded, result.discarded);
    files.push(...result.files);
    truncated ||= result.truncated;
  }
  const merged = collector.build();
  return {
    ...merged,
    discarded: sumDiscarded(discarded, {
      ...emptyDiscarded(),
      duplicate: merged.discarded.duplicate,
    }),
    truncated: truncated || merged.truncated,
    files,
  };
}

export async function readSitemap(
  inputUrl: string,
  userSignal: AbortSignal,
): Promise<SitemapResult> {
  const signal = AbortSignal.any([userSignal, AbortSignal.timeout(TOTAL_TIMEOUT_MS)]);
  const parsed = new URL(inputUrl);
  const isFileUrl = SITEMAP_PATH_PATTERN.test(parsed.pathname);
  const { roots, isFallback } = isFileUrl
    ? { roots: [parsed.href], isFallback: false }
    : await discoverRoots(parsed.origin, signal);
  const loader = createLoader(signal);
  const results: SitemapResult[] = [];
  let lastFailure: unknown = null;
  for (const root of roots) {
    try {
      results.push(await resolveSitemapTree(root, loader));
      if (isFallback) break;
    } catch (cause) {
      lastFailure = cause;
    }
  }
  if (results.length === 0) {
    if (lastFailure instanceof NpvException) throw lastFailure;
    throw new NpvException('NPV-SITEMAP-FAILED', 'sitemap not found', { reason: 'not-found' });
  }
  return mergeResults(results, parsed.origin);
}
