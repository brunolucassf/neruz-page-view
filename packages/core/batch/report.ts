import type { BatchSource } from '../storage/schemas';
import { sanitizeZipPath } from './paths';
import type {
  BatchConfig,
  BatchLocale,
  BatchPage,
  BatchPrintMode,
  BatchReport,
  BatchScreen,
  PageIssue,
  PageNote,
  PageStatus,
} from './types';

const MAX_OVERFLOW_SELECTORS = 5;
const DATA_IMAGE_PATTERN = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const CONTENT_SECURITY_POLICY = "default-src 'none'; img-src data:; style-src 'unsafe-inline'";
const EMPTY_VALUE = '—';

export type BuildBatchReportInput = {
  config: BatchConfig;
  pages: readonly BatchPage[];
  startedAt: number;
  endedAt: number;
  generatedAt: number;
  extensionVersion: string;
  browser: string;
  parts?: number;
  partByPageIndex?: ReadonlyMap<number, number>;
};

const toIso = (timestamp: number): string => new Date(timestamp).toISOString();

const countByStatus = (pages: readonly BatchPage[], status: PageStatus): number =>
  pages.filter((page) => page.status === status).length;

export const buildBatchReport = (input: BuildBatchReportInput): BatchReport => {
  const { config, pages, partByPageIndex } = input;
  return {
    schema: 'neruz.pageview.batch-report',
    version: 1,
    generatedAt: toIso(input.generatedAt),
    extensionVersion: input.extensionVersion,
    browser: input.browser,
    locale: config.locale,
    source: config.source,
    startedAt: toIso(input.startedAt),
    endedAt: toIso(input.endedAt),
    durationMs: Math.max(0, input.endedAt - input.startedAt),
    printMode: config.printMode,
    imageFormat: config.imageFormat,
    framed: config.framed !== null,
    screens: config.screens,
    totals: {
      requested: pages.length,
      done: countByStatus(pages, 'done'),
      partial: countByStatus(pages, 'partial'),
      failed: countByStatus(pages, 'failed'),
      skipped: countByStatus(pages, 'skipped'),
      cancelled: countByStatus(pages, 'cancelled'),
    },
    pages: pages.map((page) => ({
      ...page,
      startedAt: page.startedAt === null ? null : toIso(page.startedAt),
      endedAt: page.endedAt === null ? null : toIso(page.endedAt),
      part: partByPageIndex?.get(page.index) ?? 1,
    })),
    parts: input.parts ?? 1,
  };
};

export type ReportStrings = {
  title: string;
  footer: string;
  generatedBy: string;
  summaryTitle: string;
  pagesTitle: string;
  issuesTitle: string;
  noIssues: string;
  label: {
    hosts: string;
    started: string;
    ended: string;
    duration: string;
    extensionVersion: string;
    browser: string;
    requested: string;
    done: string;
    partial: string;
    failed: string;
    skipped: string;
    cancelled: string;
    source: string;
    printMode: string;
    imageFormat: string;
    framed: string;
  };
  column: {
    screen: string;
    size: string;
    dpr: string;
    orientation: string;
    result: string;
    stable: string;
    height: string;
    overflow: string;
    parts: string;
    files: string;
    thumbnail: string;
    requestedUrl: string;
    finalUrl: string;
    pageTitle: string;
    httpStatus: string;
  };
  status: Record<PageStatus, string>;
  issue: Record<PageIssue, string>;
  note: Record<PageNote, string>;
  source: Record<BatchSource, string>;
  printMode: Record<BatchPrintMode, string>;
  orientation: { portrait: string; landscape: string };
  value: {
    yes: string;
    no: string;
    stableTimeout: string;
    noOverflow: string;
    inPart: string;
  };
};

export type ReportThumbnails = ReadonlyMap<string, string> | Record<string, string>;

export type RenderReportOptions = {
  currentPart?: number;
  timeZone?: string;
};

export const thumbnailKey = (pageIndex: number, screenId: string): string =>
  `${pageIndex}:${screenId}`;

export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );

const readThumbnail = (thumbnails: ReportThumbnails, key: string): string | null => {
  const value =
    thumbnails instanceof Map ? thumbnails.get(key) : (thumbnails as Record<string, string>)[key];
  return typeof value === 'string' && DATA_IMAGE_PATTERN.test(value) ? value : null;
};

const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const renderUrl = (url: string): string =>
  isHttpUrl(url)
    ? `<a href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(url)}</a>`
    : escapeHtml(url);

const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours > 0 ? `${hours} h` : '',
    hours > 0 || minutes > 0 ? `${minutes} min` : '',
    `${seconds} s`,
  ]
    .filter(Boolean)
    .join(' ');
};

const createFormatters = (locale: BatchLocale, timeZone: string | undefined) => {
  const dateTime = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  });
  const oneDecimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return {
    dateTime: (iso: string) => dateTime.format(new Date(iso)),
    oneDecimal: (value: number) => oneDecimal.format(value),
    integer: (value: number) => integer.format(value),
  };
};

type Formatters = ReturnType<typeof createFormatters>;

type RenderContext = {
  report: BatchReport;
  strings: ReportStrings;
  thumbnails: ReportThumbnails;
  currentPart: number;
  format: Formatters;
};

const listHosts = (report: BatchReport): string[] => {
  const hosts = new Set<string>();
  for (const page of report.pages) {
    try {
      hosts.add(new URL(page.url).host);
    } catch {}
  }
  return [...hosts];
};

const renderRow = (label: string, valueHtml: string): string =>
  `<tr><th scope="row">${escapeHtml(label)}</th><td>${valueHtml}</td></tr>`;

const renderSummary = ({ report, strings, format }: RenderContext): string => {
  const { label, value } = strings;
  const { totals } = report;
  const hosts = listHosts(report).map(escapeHtml).join(', ');
  const rows = [
    renderRow(label.hosts, hosts || EMPTY_VALUE),
    renderRow(label.started, escapeHtml(format.dateTime(report.startedAt))),
    renderRow(label.ended, escapeHtml(format.dateTime(report.endedAt))),
    renderRow(label.duration, escapeHtml(formatDuration(report.durationMs))),
    renderRow(label.extensionVersion, escapeHtml(report.extensionVersion)),
    renderRow(label.browser, escapeHtml(report.browser)),
    renderRow(label.requested, String(totals.requested)),
    renderRow(label.done, String(totals.done)),
    renderRow(label.partial, String(totals.partial)),
    renderRow(label.failed, String(totals.failed)),
    renderRow(label.skipped, String(totals.skipped)),
    renderRow(label.cancelled, String(totals.cancelled)),
    renderRow(label.source, escapeHtml(strings.source[report.source])),
    renderRow(label.printMode, escapeHtml(strings.printMode[report.printMode])),
    renderRow(label.imageFormat, escapeHtml(report.imageFormat.toUpperCase())),
    renderRow(label.framed, escapeHtml(report.framed ? value.yes : value.no)),
  ].join('');
  return `<table class="facts"><tbody>${rows}</tbody></table>${renderScreensTable(report.screens, strings)}`;
};

const renderScreensTable = (screens: readonly BatchScreen[], strings: ReportStrings): string => {
  const { column } = strings;
  const head = [column.screen, column.size, column.dpr, column.orientation]
    .map((text) => `<th scope="col">${escapeHtml(text)}</th>`)
    .join('');
  const body = screens
    .map(
      (screen) =>
        `<tr><td>${escapeHtml(screen.label)}</td><td>${screen.width} × ${screen.height} px</td><td>${screen.dpr}</td><td>${escapeHtml(strings.orientation[screen.orientation])}</td></tr>`,
    )
    .join('');
  return `<table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

const renderStable = (
  result: BatchPage['screens'][number],
  { strings, format }: RenderContext,
): string => {
  if (result.stableTimedOut) return escapeHtml(strings.value.stableTimeout);
  if (result.stableMs === null) return EMPTY_VALUE;
  return escapeHtml(`${format.oneDecimal(result.stableMs / 1000)} s`);
};

const renderOverflow = (
  result: BatchPage['screens'][number],
  { strings, format }: RenderContext,
): string => {
  if (!result.overflow) return EMPTY_VALUE;
  if (result.overflow.overflowPx <= 0) return escapeHtml(strings.value.noOverflow);
  const selectors = result.overflow.offenders
    .slice(0, MAX_OVERFLOW_SELECTORS)
    .map((offender) => `<code>${escapeHtml(offender.selector)}</code>`)
    .join(' ');
  const amount = escapeHtml(`${format.integer(Math.round(result.overflow.overflowPx))} px`);
  return selectors ? `${amount} ${selectors}` : amount;
};

const renderFiles = (
  page: BatchReport['pages'][number],
  files: readonly string[],
  { strings, currentPart }: RenderContext,
): string => {
  if (files.length === 0) return EMPTY_VALUE;
  if (page.part !== currentPart) {
    return escapeHtml(fill(strings.value.inPart, { n: page.part }));
  }
  return files
    .map((file) => {
      const path = sanitizeZipPath(file);
      return `<a href="${escapeHtml(path)}">${escapeHtml(path.slice(path.lastIndexOf('/') + 1))}</a>`;
    })
    .join('<br>');
};

const renderThumbnail = (
  page: BatchReport['pages'][number],
  screenId: string,
  { thumbnails }: RenderContext,
): string => {
  const source = readThumbnail(thumbnails, thumbnailKey(page.index, screenId));
  return source ? `<img src="${escapeHtml(source)}" alt="" loading="lazy">` : EMPTY_VALUE;
};

const renderScreenRows = (page: BatchReport['pages'][number], context: RenderContext): string => {
  const { strings, report, format } = context;
  return page.screens
    .map((result) => {
      const screen = report.screens.find((item) => item.screenId === result.screenId);
      const height =
        result.scrollHeight === null
          ? EMPTY_VALUE
          : escapeHtml(`${format.integer(Math.round(result.scrollHeight))} px`);
      const cells = [
        escapeHtml(screen?.label ?? result.screenId),
        escapeHtml(strings.status[result.status]),
        renderStable(result, context),
        height,
        renderOverflow(result, context),
        String(result.parts),
        renderFiles(page, result.files, context),
        renderThumbnail(page, result.screenId, context),
      ];
      return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
    })
    .join('');
};

const renderPageNotes = (page: BatchReport['pages'][number], strings: ReportStrings): string => {
  const phrases = [
    ...(page.issue ? [strings.issue[page.issue]] : []),
    ...page.notes.map((note) => strings.note[note]),
  ];
  return phrases.length === 0
    ? ''
    : `<ul class="notes">${phrases.map((phrase) => `<li>${escapeHtml(phrase)}</li>`).join('')}</ul>`;
};

const renderPage = (page: BatchReport['pages'][number], context: RenderContext): string => {
  const { strings } = context;
  const { column } = strings;
  const facts = [
    renderRow(column.requestedUrl, renderUrl(page.url)),
    ...(page.finalUrl && page.finalUrl !== page.url
      ? [renderRow(column.finalUrl, renderUrl(page.finalUrl))]
      : []),
    ...(page.title ? [renderRow(column.pageTitle, escapeHtml(page.title))] : []),
    ...(page.httpStatus === null ? [] : [renderRow(column.httpStatus, String(page.httpStatus))]),
    renderRow(column.result, escapeHtml(strings.status[page.status])),
  ].join('');
  const head = [
    column.screen,
    column.result,
    column.stable,
    column.height,
    column.overflow,
    column.parts,
    column.files,
    column.thumbnail,
  ]
    .map((text) => `<th scope="col">${escapeHtml(text)}</th>`)
    .join('');
  return `<section class="page"><h3>${page.index}</h3><table class="facts"><tbody>${facts}</tbody></table>${renderPageNotes(page, strings)}<div class="scroll"><table class="grid"><thead><tr>${head}</tr></thead><tbody>${renderScreenRows(page, context)}</tbody></table></div></section>`;
};

const renderIssues = (context: RenderContext): string => {
  const { report, strings } = context;
  const affected = report.pages.filter((page) => page.issue !== null);
  if (affected.length === 0) return `<p>${escapeHtml(strings.noIssues)}</p>`;
  const items = affected
    .map(
      (page) =>
        `<li>${page.index} · ${renderUrl(page.url)} · ${escapeHtml(strings.issue[page.issue as PageIssue])}</li>`,
    )
    .join('');
  return `<ul class="notes">${items}</ul>`;
};

const REPORT_CSS = `
:root{color-scheme:light;--ink:#080D14;--muted:#46566A;--line:#CBD6E1;--surface:#F4F8FC;--accent:#007D8A}
*{box-sizing:border-box}
body{margin:0 auto;max-width:72rem;padding:2rem 1rem;background:#fff;color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
h1{font-size:1.75rem;margin:0 0 1.5rem}
h2{font-size:1.25rem;margin:2.5rem 0 1rem;border-bottom:2px solid var(--accent);padding-bottom:.25rem}
h3{font-size:1rem;margin:0 0 .5rem}
table{border-collapse:collapse;width:100%;margin:.5rem 0 1rem;font-variant-numeric:tabular-nums}
th,td{border:1px solid var(--line);padding:.4rem .6rem;text-align:left;vertical-align:top;overflow-wrap:anywhere}
thead th,.facts th{background:var(--surface);font-weight:600}
.facts th{width:14rem}
.scroll{overflow-x:auto}
.page{margin:1.5rem 0;padding:1rem;border:1px solid var(--line);border-radius:.5rem;break-inside:avoid}
.notes{margin:.5rem 0 1rem;padding-left:1.25rem}
img{display:block;width:10rem;max-width:100%;height:auto;border:1px solid var(--line)}
a{color:var(--accent)}
code{font-size:.85em}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted)}
@media print{body{max-width:none;padding:0}.page{break-inside:avoid}}
`;

export const renderReportHtml = (
  report: BatchReport,
  strings: ReportStrings,
  thumbnails: ReportThumbnails,
  options: RenderReportOptions = {},
): string => {
  const context: RenderContext = {
    report,
    strings,
    thumbnails,
    currentPart: options.currentPart ?? 1,
    format: createFormatters(report.locale, options.timeZone),
  };
  const pages = report.pages.map((page) => renderPage(page, context)).join('');
  const generatedBy = fill(strings.generatedBy, { version: report.extensionVersion });
  return `<!doctype html>
<html lang="${escapeHtml(report.locale)}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(strings.title)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<h1>${escapeHtml(strings.title)}</h1>
<h2>${escapeHtml(strings.summaryTitle)}</h2>
${renderSummary(context)}
<h2>${escapeHtml(strings.pagesTitle)}</h2>
${pages}
<h2>${escapeHtml(strings.issuesTitle)}</h2>
${renderIssues(context)}
<footer><p>${escapeHtml(strings.footer)}</p><p>${escapeHtml(generatedBy)}</p></footer>
</body>
</html>
`;
};
