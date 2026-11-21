import {
  type BatchLocale,
  PAGE_ISSUES,
  PAGE_NOTES,
  PAGE_STATUSES,
  type ReportStrings,
} from '@neruz/core';
import { getMessages, type MessageKey } from '@neruz/i18n';

const LABEL_NAMES = [
  'hosts',
  'started',
  'ended',
  'duration',
  'extensionVersion',
  'browser',
  'requested',
  'done',
  'partial',
  'failed',
  'skipped',
  'cancelled',
  'source',
  'printMode',
  'imageFormat',
  'framed',
] as const;

const COLUMN_NAMES = [
  'screen',
  'size',
  'dpr',
  'orientation',
  'result',
  'stable',
  'height',
  'overflow',
  'parts',
  'files',
  'thumbnail',
  'requestedUrl',
  'finalUrl',
  'pageTitle',
  'httpStatus',
] as const;

const SOURCE_NAMES = ['list', 'sitemap', 'links'] as const;
const PRINT_MODE_NAMES = ['fast', 'experience', 'moments'] as const;
const ORIENTATION_NAMES = ['portrait', 'landscape'] as const;
const VALUE_NAMES = ['yes', 'no', 'stableTimeout', 'noOverflow', 'inPart'] as const;

function collect<TName extends string>(
  read: (key: MessageKey) => string,
  group: string,
  names: readonly TName[],
): Record<TName, string> {
  return Object.fromEntries(
    names.map((name) => [name, read(`report.${group}.${name}` as MessageKey)]),
  ) as Record<TName, string>;
}

export function buildReportStrings(locale: BatchLocale): ReportStrings {
  const messages = getMessages(locale);
  const read = (key: MessageKey) => messages[key] ?? key;
  return {
    title: read('report.title'),
    footer: read('report.footer'),
    generatedBy: read('report.generatedBy'),
    summaryTitle: read('report.summaryTitle'),
    pagesTitle: read('report.pagesTitle'),
    issuesTitle: read('report.issuesTitle'),
    noIssues: read('report.noIssues'),
    label: collect(read, 'label', LABEL_NAMES),
    column: collect(read, 'column', COLUMN_NAMES),
    status: collect(read, 'status', PAGE_STATUSES),
    issue: collect(read, 'issue', PAGE_ISSUES),
    note: collect(read, 'note', PAGE_NOTES),
    source: collect(read, 'source', SOURCE_NAMES),
    printMode: collect(read, 'printMode', PRINT_MODE_NAMES),
    orientation: collect(read, 'orientation', ORIENTATION_NAMES),
    value: collect(read, 'value', VALUE_NAMES),
  };
}
