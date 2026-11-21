import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createNpvError } from '../messaging/errors';
import { studioCollectLinks, studioPageFacts } from '../messaging/studio';
import { BatchPreferencesSchema, DEFAULT_BATCH_PREFERENCES } from '../storage/schemas';
import { estimateRemainingMs } from './eta';
import {
  fileName,
  pageFolderName,
  rootFolderName,
  sanitizeZipPath,
  screenFolderName,
  zipFileName,
} from './paths';
import { buildBatchReport, escapeHtml, type ReportStrings, renderReportHtml } from './report';
import {
  parseRobotsSitemaps,
  parseSitemapDocument,
  parseSitemapText,
  resolveSitemapTree,
  type SitemapFileLoad,
} from './sitemap';
import type { BatchConfig, BatchPage } from './types';
import { isSamePage, normalizePageUrl, parseUrlList } from './url';

type FakeNode = { localName: string; textContent: string | null; children: FakeNode[] };

const node = (localName: string, children: FakeNode[] = [], textContent: string | null = null) => ({
  localName,
  textContent,
  children,
});

const fakeDocument = (root: FakeNode | null) => ({ documentElement: root }) as unknown as Document;

const urlsetOf = (locs: string[]) =>
  fakeDocument(
    node(
      'urlset',
      locs.map((loc) => node('url', [node('loc', [], ` ${loc} `), node('lastmod', [], 'x')])),
    ),
  );

describe('normalizePageUrl', () => {
  it('adds https, drops hash and credentials, keeps query', () => {
    expect(normalizePageUrl('  https://user:pw@site.com/sobre?a=1#topo ')).toEqual({
      ok: true,
      url: 'https://site.com/sobre?a=1',
    });
    expect(normalizePageUrl('localhost:3000/x')).toEqual({
      ok: true,
      url: 'https://localhost:3000/x',
    });
  });

  it('resolves root-relative paths against the base', () => {
    expect(normalizePageUrl('/contato', 'https://site.com/a/b')).toEqual({
      ok: true,
      url: 'https://site.com/contato',
    });
    expect(normalizePageUrl('/contato')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('reports scheme, length and file extensions', () => {
    expect(normalizePageUrl('mailto:a@b.com')).toEqual({ ok: false, reason: 'scheme' });
    expect(normalizePageUrl('ftp://a.com/x')).toEqual({ ok: false, reason: 'scheme' });
    expect(normalizePageUrl(`https://a.com/${'x'.repeat(2100)}`)).toEqual({
      ok: false,
      reason: 'too-long',
    });
    expect(normalizePageUrl('https://a.com/guia.PDF')).toEqual({ ok: false, reason: 'not-page' });
    expect(normalizePageUrl('https://a.com/v1.2/sobre')).toMatchObject({ ok: true });
    expect(normalizePageUrl('http://')).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('isSamePage', () => {
  it('ignores trailing slash, query and hash but not origin', () => {
    expect(isSamePage('https://a.com/x/', 'https://a.com/x?y=1#z')).toBe(true);
    expect(isSamePage('https://a.com/x', 'https://b.com/x')).toBe(false);
    expect(isSamePage('https://a.com', 'https://a.com/')).toBe(true);
    expect(isSamePage('https://a.com/x', 'https://a.com/y')).toBe(false);
  });
});

describe('parseUrlList', () => {
  it('splits on every separator, dedupes and counts discards', () => {
    const list = parseUrlList(
      'a.com/x, a.com/y;a.com/x\n\tmailto:z@a.com  a.com/f.zip not a url',
      'https://a.com',
    );
    expect(list.urls).toEqual([
      'https://a.com/x',
      'https://a.com/y',
      'https://not/',
      'https://a/',
      'https://url/',
    ]);
    expect(list.discarded).toMatchObject({ duplicate: 1, scheme: 1, notPage: 1 });
    expect(list.source).toBe('list');
  });

  it('stops at the candidate cap and flags truncation', () => {
    const text = Array.from({ length: 5003 }, (_, index) => `a.com/p${index}`).join('\n');
    const list = parseUrlList(text);
    expect(list.urls).toHaveLength(5000);
    expect(list.truncated).toBe(true);
  });
});

describe('sitemap parsing', () => {
  it('reads urlset and index by local name, trimming loc text', () => {
    expect(parseSitemapDocument(urlsetOf(['https://a.com/x']))).toEqual({
      kind: 'urlset',
      locs: ['https://a.com/x'],
    });
    const index = fakeDocument(
      node('sitemapindex', [node('sitemap', [node('loc', [], 'https://a.com/s1.xml')])]),
    );
    expect(parseSitemapDocument(index)).toEqual({ kind: 'index', locs: ['https://a.com/s1.xml'] });
  });

  it('flags parser errors and unknown roots as invalid', () => {
    expect(
      parseSitemapDocument(fakeDocument(node('html', [node('body', [node('parsererror')])]))),
    ).toEqual({
      kind: 'invalid',
      locs: [],
    });
    expect(parseSitemapDocument(fakeDocument(node('rss'))).kind).toBe('invalid');
    expect(parseSitemapDocument(fakeDocument(null)).kind).toBe('invalid');
  });

  it('reads text sitemaps and robots entries of the same origin only', () => {
    expect(parseSitemapText('# c\nhttps://a.com/x\r\n\n https://a.com/y ').locs).toEqual([
      'https://a.com/x',
      'https://a.com/y',
    ]);
    const robots = [
      'User-agent: *',
      'Sitemap: https://a.com/s1.xml',
      'sitemap:https://other.com/s.xml',
      'SITEMAP: https://a.com/s1.xml',
      ...Array.from({ length: 8 }, (_, index) => `Sitemap: https://a.com/m${index}.xml`),
    ].join('\n');
    const found = parseRobotsSitemaps(robots, 'https://a.com');
    expect(found).toHaveLength(5);
    expect(found[0]).toBe('https://a.com/s1.xml');
    expect(found).not.toContain('https://other.com/s.xml');
  });
});

describe('resolveSitemapTree', () => {
  const ok = (parsed: Extract<SitemapFileLoad, { ok: true }>['parsed']): SitemapFileLoad => ({
    ok: true,
    parsed,
  });

  it('follows indexes up to depth 2 and counts what lies beyond', async () => {
    const loaded: string[] = [];
    const result = await resolveSitemapTree('https://a.com/s.xml', async (url) => {
      loaded.push(url);
      if (url.endsWith('/s.xml'))
        return ok({ kind: 'index', locs: ['https://a.com/l1.xml', 'https://a.com/u.xml'] });
      if (url.endsWith('/l1.xml')) return ok({ kind: 'index', locs: ['https://a.com/l2.xml'] });
      if (url.endsWith('/l2.xml')) {
        return ok({ kind: 'index', locs: ['https://a.com/l3.xml', 'https://a.com/l4.xml'] });
      }
      return ok({ kind: 'urlset', locs: ['https://a.com/found'] });
    });
    expect(loaded).toEqual([
      'https://a.com/s.xml',
      'https://a.com/l1.xml',
      'https://a.com/u.xml',
      'https://a.com/l2.xml',
    ]);
    expect(result.discarded.beyondDepth).toBe(2);
  });

  it('collects, filters origin and dedupes across files', async () => {
    const result = await resolveSitemapTree('https://a.com/s.xml', async (url) => {
      if (url.endsWith('/s.xml')) {
        return ok({ kind: 'index', locs: ['https://a.com/p1.xml', 'https://evil.com/p.xml'] });
      }
      return ok({
        kind: 'urlset',
        locs: ['https://a.com/x', 'https://a.com/x#a', 'https://b.com/y', 'https://a.com/f.pdf'],
      });
    });
    expect(result.urls).toEqual(['https://a.com/x']);
    expect(result.discarded).toMatchObject({ duplicate: 1, offOrigin: 1, notPage: 1 });
    expect(result.files.find((file) => file.url.includes('evil'))?.reason).toBe('cross-origin');
  });

  it('truncates at the candidate cap', async () => {
    const locs = Array.from({ length: 5100 }, (_, index) => `https://a.com/p${index}`);
    const result = await resolveSitemapTree('https://a.com/s.xml', async () =>
      ok({ kind: 'urlset', locs }),
    );
    expect(result.urls).toHaveLength(5000);
    expect(result.truncated).toBe(true);
  });

  it('stops at the file limit', async () => {
    let calls = 0;
    const result = await resolveSitemapTree('https://a.com/s0.xml', async (url) => {
      calls += 1;
      if (url.endsWith('/s0.xml')) {
        return ok({
          kind: 'index',
          locs: Array.from({ length: 80 }, (_, index) => `https://a.com/c${index}.xml`),
        });
      }
      return ok({ kind: 'urlset', locs: [`${url}/page`] });
    });
    expect(calls).toBe(50);
    expect(result.files).toHaveLength(50);
    expect(result.truncated).toBe(true);
  });

  it('throws NPV-SITEMAP-FAILED with the root reason when nothing is usable', async () => {
    await expect(
      resolveSitemapTree('https://a.com/s.xml', async () => ({
        ok: false,
        reason: 'http',
        httpStatus: 404,
      })),
    ).rejects.toMatchObject({
      error: { code: 'NPV-SITEMAP-FAILED', details: { reason: 'http' }, retryable: false },
    });
    await expect(
      resolveSitemapTree('https://a.com/s.xml', async () => ok({ kind: 'urlset', locs: [] })),
    ).rejects.toMatchObject({ error: { details: { reason: 'empty' } } });
  });
});

describe('error codes', () => {
  it('marks sitemap network and timeout as retryable only', () => {
    expect(createNpvError('NPV-SITEMAP-FAILED', 'x', { reason: 'network' }).retryable).toBe(true);
    expect(createNpvError('NPV-SITEMAP-FAILED', 'x', { reason: 'http' }).retryable).toBe(false);
    expect(createNpvError('NPV-STORAGE-FULL', 'x').retryable).toBe(false);
    expect(createNpvError('NPV-BATCH-LIMIT', 'x', { limit: 'pages' }).retryable).toBe(false);
  });
});

describe('zip paths', () => {
  it('builds the root folder name with host, port and extra origins', () => {
    const startedAt = new Date(2026, 10, 21, 9, 5);
    expect(rootFolderName({ firstUrl: 'https://Site.com:8080/x', originCount: 1, startedAt })).toBe(
      'neruz-page-view_site.com-8080_2026-11-21_0905',
    );
    expect(rootFolderName({ firstUrl: 'https://site.com/', originCount: 3, startedAt })).toBe(
      'neruz-page-view_site.com-mais-2_2026-11-21_0905',
    );
    expect(zipFileName('r', { index: 2, total: 3 })).toBe('r_parte-2-de-3.zip');
    expect(zipFileName('r')).toBe('r.zip');
  });

  it('slugs page and screen folders', () => {
    expect(pageFolderName(1, 'https://a.com/')).toBe('001-inicio');
    expect(pageFolderName(12, 'https://a.com/Sobre-Nós/Equipe%20Técnica')).toBe(
      '012-sobre-nos-equipe-tecnica',
    );
    expect(pageFolderName(3, `https://a.com/${'abcdefghij'.repeat(8)}`)).toBe(
      `003-${'abcdefghij'.repeat(8).slice(0, 48)}`,
    );
    expect(screenFolderName(1, 'iPhone 15 Pro')).toBe('01-iphone-15-pro');
    expect(screenFolderName(2, '???')).toBe('02-tela');
  });

  it('names files by kind and format', () => {
    expect(fileName({ kind: 'print', part: null }, 'jpeg')).toBe('print.jpg');
    expect(fileName({ kind: 'print', part: 2 }, 'png')).toBe('print-parte-02.png');
    expect(fileName({ kind: 'moment', number: 3 }, 'webp')).toBe('momentos/momento-03.webp');
    expect(fileName({ kind: 'frame' }, 'png')).toBe('moldura.png');
  });

  it('sanitizes traversal, absolute paths, odd characters and length', () => {
    expect(sanitizeZipPath('/../a/../b//C d.png')).toBe('a/b/c-d.png');
    expect(sanitizeZipPath('a/./b..c')).toBe('a/b.c');
    expect(sanitizeZipPath('x'.repeat(300))).toHaveLength(200);
    expect(sanitizeZipPath('pasta/ação.png')).toMatch(/^[a-z0-9._/-]+$/);
  });
});

describe('estimateRemainingMs', () => {
  const page = (
    status: BatchPage['status'],
    startedAt: number | null = null,
    endedAt: number | null = null,
  ) => ({
    status,
    startedAt,
    endedAt,
  });

  it('uses the print mode base before any page is done', () => {
    expect(
      estimateRemainingMs({
        printMode: 'fast',
        screenCount: 2,
        pages: [page('pending'), page('pending')],
      }),
    ).toBe(2 * (2 * 8000 + 5000));
  });

  it('averages the last five completed pages afterwards', () => {
    const done = Array.from({ length: 7 }, (_, index) =>
      page('done', 0, index === 0 ? 100_000 : 10_000),
    );
    expect(
      estimateRemainingMs({
        printMode: 'experience',
        screenCount: 4,
        pages: [...done, page('pending'), page('capturing')],
      }),
    ).toBe(20_000);
  });

  it('is zero when nothing is left', () => {
    expect(
      estimateRemainingMs({ printMode: 'fast', screenCount: 1, pages: [page('done', 0, 1)] }),
    ).toBe(0);
  });
});

const strings: ReportStrings = {
  title: 'Título <b>',
  footer: 'Rodapé fixo',
  generatedBy: 'Gerado por Neruz Page View {version}',
  summaryTitle: 'Resumo',
  pagesTitle: 'Páginas',
  issuesTitle: 'Ocorrências',
  noIssues: 'Nenhuma',
  label: {
    hosts: 'Sites',
    started: 'Início',
    ended: 'Fim',
    duration: 'Duração',
    extensionVersion: 'Versão',
    browser: 'Navegador',
    requested: 'Pedidas',
    done: 'Concluídas',
    partial: 'Parciais',
    failed: 'Falhas',
    skipped: 'Puladas',
    cancelled: 'Canceladas',
    source: 'Fonte',
    printMode: 'Modo',
    imageFormat: 'Formato',
    framed: 'Moldura',
  },
  column: {
    screen: 'Tela',
    size: 'Tamanho',
    dpr: 'DPR',
    orientation: 'Orientação',
    result: 'Resultado',
    stable: 'Estável',
    height: 'Altura',
    overflow: 'Rolagem lateral',
    parts: 'Partes',
    files: 'Arquivos',
    thumbnail: 'Miniatura',
    requestedUrl: 'URL',
    finalUrl: 'URL final',
    pageTitle: 'Título',
    httpStatus: 'HTTP',
  },
  status: {
    pending: 'pendente',
    loading: 'carregando',
    capturing: 'capturando',
    done: 'concluída',
    partial: 'parcial',
    failed: 'falhou',
    skipped: 'pulada',
    cancelled: 'cancelada',
  },
  issue: {
    'iframe-blocked': 'bloqueada',
    'load-timeout': 'carga',
    'login-redirect': 'login',
    'agent-missing': 'agente',
    'permission-missing': 'permissão',
    'capture-timeout': 'tempo',
    'capture-failed': 'captura',
    'storage-full': 'espaço',
  },
  note: {
    redirected: 'redirecionada',
    'http-error': 'erro http',
    'password-field': 'senha',
    'stable-timeout': 'estável',
    'split-into-parts': 'partes',
  },
  source: { list: 'lista', sitemap: 'sitemap', links: 'links' },
  printMode: { fast: 'rápido', experience: 'experiência', moments: 'momentos' },
  orientation: { portrait: 'retrato', landscape: 'paisagem' },
  value: {
    yes: 'sim',
    no: 'não',
    stableTimeout: 'não estabilizou em 4 s',
    noOverflow: 'não',
    inPart: 'na parte {n}',
  },
};

const hostileTitle = '<script>alert(1)</script>"\'&';

const config: BatchConfig = {
  id: '0b8b7c1e-6a8a-4d6e-9a53-1f3f9a1d2c11',
  source: 'list',
  urls: ['https://a.com/x', 'javascript:alert(1)'],
  screens: [
    {
      screenId: 's1',
      presetId: 'iphone-15',
      label: 'iPhone <15>',
      width: 393,
      height: 852,
      dpr: 3,
      orientation: 'portrait',
      folder: '01-iphone-15',
    },
  ],
  printMode: 'fast',
  imageFormat: 'png',
  imageQuality: 0.92,
  framed: null,
  locale: 'pt-BR',
  createdAt: 1,
};

const screenResult = (
  overrides: Partial<BatchPage['screens'][number]> = {},
): BatchPage['screens'][number] => ({
  screenId: 's1',
  status: 'done',
  issue: null,
  error: null,
  stableMs: 1234,
  stableTimedOut: false,
  scrollHeight: 4200,
  overflow: { overflowPx: 12, offenders: [{ selector: '.a<b>', rightPx: 400 }], truncated: false },
  parts: 1,
  files: ['001-inicio/01-iphone-15/print.png'],
  durationMs: 5000,
  ...overrides,
});

const pageOf = (index: number, url: string, overrides: Partial<BatchPage> = {}): BatchPage => ({
  index,
  url,
  finalUrl: null,
  title: hostileTitle,
  httpStatus: 200,
  status: 'done',
  issue: null,
  notes: [],
  folder: `00${index}-x`,
  startedAt: 1000,
  endedAt: 6000,
  screens: [screenResult()],
  ...overrides,
});

describe('batch report', () => {
  const pages = [
    pageOf(1, 'https://a.com/x'),
    pageOf(2, 'javascript:alert(1)', {
      status: 'failed',
      issue: 'login-redirect',
      screens: [screenResult({ status: 'failed', files: [] })],
    }),
    pageOf(3, 'https://a.com/z', {
      status: 'partial',
      notes: ['redirected'],
      finalUrl: 'https://a.com/login?"x',
    }),
  ];
  const report = buildBatchReport({
    config,
    pages,
    startedAt: Date.UTC(2026, 10, 21, 12),
    endedAt: Date.UTC(2026, 10, 21, 12, 6, 5),
    generatedAt: Date.UTC(2026, 10, 21, 12, 7),
    extensionVersion: '1.5.0',
    browser: 'Chrome 142',
  });

  it('computes totals, ISO dates and default part', () => {
    expect(report.totals).toEqual({
      requested: 3,
      done: 1,
      partial: 1,
      failed: 1,
      skipped: 0,
      cancelled: 0,
    });
    expect(report.durationMs).toBe(365_000);
    expect(report.startedAt).toBe('2026-11-21T12:00:00.000Z');
    expect(report.pages.every((page) => page.part === 1)).toBe(true);
    expect(report.pages[0]?.startedAt).toBe('1970-01-01T00:00:01.000Z');
  });

  it('escapes everything that comes from the page and the user', () => {
    const html = renderReportHtml(report, strings, new Map(), { timeZone: 'UTC' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<15>');
    expect(html).not.toContain('.a<b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&amp;');
    expect(html).toContain('iPhone &lt;15&gt;');
    expect(html).toContain('login?&quot;x');
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('links only http and https pages, with rel noopener noreferrer', () => {
    const html = renderReportHtml(report, strings, new Map());
    expect(html).toContain('<a href="https://a.com/x" rel="noopener noreferrer"');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('javascript:alert(1)');
  });

  it('has CSP, language, no script, fixed footer and generatedBy', () => {
    const html = renderReportHtml(report, strings, new Map());
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">`,
    );
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('Rodapé fixo');
    expect(html).toContain('Gerado por Neruz Page View 1.5.0');
    expect(html).toContain('login</li>');
  });

  it('embeds only well-formed data image thumbnails', () => {
    const good = 'data:image/webp;base64,AAAA';
    const html = renderReportHtml(report, strings, {
      '1:s1': good,
      '3:s1': 'data:text/html;base64,AAAA',
      '2:s1': 'https://evil.com/x.png',
    });
    expect(html).toContain(`<img src="${good}"`);
    expect(html).not.toContain('evil.com/x.png');
    expect(html).not.toContain('data:text/html');
  });

  it('shows "in part N" instead of links for files in other parts', () => {
    const multi = buildBatchReport({
      config,
      pages: [pageOf(1, 'https://a.com/x')],
      startedAt: 0,
      endedAt: 1,
      generatedAt: 2,
      extensionVersion: '1',
      browser: 'Chrome 142',
      parts: 2,
      partByPageIndex: new Map([[1, 2]]),
    });
    const html = renderReportHtml(multi, strings, new Map(), { currentPart: 1 });
    expect(html).toContain('na parte 2');
    expect(html).not.toContain('href="001-inicio');
    expect(renderReportHtml(multi, strings, new Map(), { currentPart: 2 })).toContain(
      'href="001-inicio/01-iphone-15/print.png"',
    );
  });

  it('shows timed-out stability and lateral scroll facts', () => {
    const html = renderReportHtml(
      buildBatchReport({
        config,
        pages: [
          pageOf(1, 'https://a.com/x', {
            screens: [
              screenResult({
                stableTimedOut: true,
                overflow: { overflowPx: 0, offenders: [], truncated: false },
              }),
            ],
          }),
        ],
        startedAt: 0,
        endedAt: 1,
        generatedAt: 2,
        extensionVersion: '1',
        browser: 'b',
      }),
      strings,
      new Map(),
    );
    expect(html).toContain('não estabilizou em 4 s');
    expect(html).toContain('<td>não</td>');
  });
});

describe('contract additions', () => {
  it('validates batch preferences range', () => {
    expect(v.safeParse(BatchPreferencesSchema, DEFAULT_BATCH_PREFERENCES).success).toBe(true);
    expect(v.safeParse(BatchPreferencesSchema, { pageLimit: 0, source: 'list' }).success).toBe(
      false,
    );
    expect(v.safeParse(BatchPreferencesSchema, { pageLimit: 101, source: 'list' }).success).toBe(
      false,
    );
    expect(v.safeParse(BatchPreferencesSchema, { pageLimit: 25, source: 'rss' }).success).toBe(
      false,
    );
  });

  it('defines the two new studio commands with the documented timeouts', () => {
    expect(studioCollectLinks.timeoutMs).toBe(5000);
    expect(studioPageFacts.timeoutMs).toBe(3000);
    expect(v.safeParse(studioCollectLinks.payload, { max: 501 }).success).toBe(false);
    expect(v.safeParse(studioCollectLinks.payload, {}).success).toBe(true);
    expect(
      v.safeParse(studioPageFacts.data, {
        url: 'https://a.com',
        title: '',
        httpStatus: null,
        hasPasswordField: false,
      }).success,
    ).toBe(true);
  });
});
