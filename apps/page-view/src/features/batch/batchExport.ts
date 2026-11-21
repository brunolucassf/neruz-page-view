import {
  type BatchConfig,
  type BatchPage,
  buildBatchReport,
  collectOriginPatterns,
  NpvException,
  renderReportHtml,
  rootFolderName,
  zipEntryPath,
  zipFileName,
} from '@neruz/core';
import { downloadBlob } from '../capture/captureOutput';
import { useCapture } from '../capture/captureStore';
import { t } from '../i18n';
import { showToast } from '../toasts/toastStore';
import {
  getThumbnails,
  listArtifactFiles,
  resetArtifacts,
  wasRunCancelled,
} from './batchArtifacts';
import { planZipParts } from './batchParts';
import { buildReportStrings } from './batchReportStrings';
import {
  batchExportSegments,
  isUsingMemoryFallback,
  readExportFile,
  rememberMemoryExport,
  removeBatchFolder,
  resolveBatchSource,
  scheduleBatchCleanup,
} from './batchStorage';
import { type ExportPart, useBatch } from './batchStore';
import { runZipJob } from './batchZipClient';
import type { ZipEntryInput } from './batchZipTypes';

const REPORT_RESERVE_MIN_BYTES = 4 * 1024 * 1024;
const REPORT_RESERVE_FACTOR = 1.1;
const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg\/(\d+)/, 'Edge'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/Chrome\/(\d+)/, 'Chrome'],
];

let exportController: AbortController | null = null;

function readBrowserName(): string {
  for (const [pattern, name] of BROWSER_PATTERNS) {
    const major = pattern.exec(navigator.userAgent)?.[1];
    if (major) return `${name} ${major}`;
  }
  return navigator.userAgent.slice(0, 60);
}

const textSource = (text: string, type: string): ZipEntryInput['source'] => ({
  kind: 'memory',
  blob: new Blob([text], { type }),
});

type ReportBundle = { html: string; json: string };

function buildReportBundle(
  config: BatchConfig,
  pages: readonly BatchPage[],
  partByPageIndex: ReadonlyMap<number, number>,
  totalParts: number,
  currentPart: number,
): ReportBundle {
  const { startedAt, endedAt } = useBatch.getState();
  const report = buildBatchReport({
    config,
    pages,
    startedAt: startedAt ?? config.createdAt,
    endedAt: endedAt ?? Date.now(),
    generatedAt: Date.now(),
    extensionVersion: chrome.runtime.getManifest().version,
    browser: readBrowserName(),
    parts: totalParts,
    partByPageIndex,
  });
  return {
    html: renderReportHtml(report, buildReportStrings(config.locale), getThumbnails(), {
      currentPart,
    }),
    json: JSON.stringify(report, null, 2),
  };
}

function groupFilesByPage() {
  const weights = new Map<number, { bytes: number; entries: number }>();
  for (const file of listArtifactFiles()) {
    const weight = weights.get(file.pageIndex) ?? { bytes: 0, entries: 0 };
    weights.set(file.pageIndex, { bytes: weight.bytes + file.bytes, entries: weight.entries + 1 });
  }
  return weights;
}

function planParts(pages: readonly BatchPage[], reservedBytes: number): number[][] {
  const weights = groupFilesByPage();
  return planZipParts(
    pages.map((page) => ({
      pageIndex: page.index,
      bytes: weights.get(page.index)?.bytes ?? 0,
      entries: weights.get(page.index)?.entries ?? 0,
    })),
    { reservedBytes },
  );
}

type BuildPartInput = {
  config: BatchConfig;
  rootFolder: string;
  pages: readonly BatchPage[];
  partPages: ReadonlySet<number>;
  partIndex: number;
  totalParts: number;
  partByPageIndex: ReadonlyMap<number, number>;
  signal: AbortSignal;
  onProgress: (done: number, total: number) => void;
};

async function buildPart(input: BuildPartInput): Promise<ExportPart> {
  const { config, rootFolder, partIndex, totalParts } = input;
  const bundle = buildReportBundle(
    config,
    input.pages,
    input.partByPageIndex,
    totalParts,
    partIndex,
  );
  const entries: ZipEntryInput[] = [
    {
      path: zipEntryPath(rootFolder, 'relatorio.html'),
      source: textSource(bundle.html, 'text/html'),
    },
    {
      path: zipEntryPath(rootFolder, 'relatorio.json'),
      source: textSource(bundle.json, 'application/json'),
    },
    ...listArtifactFiles()
      .filter((file) => input.partPages.has(file.pageIndex))
      .map((file) => ({
        path: zipEntryPath(rootFolder, file.path),
        source: resolveBatchSource(config.id, file.path),
      })),
  ];
  const outputName = zipFileName(rootFolder, { index: partIndex, total: totalParts });
  const isMemoryOutput = isUsingMemoryFallback();
  const result = await runZipJob({
    entries,
    outputSegments: batchExportSegments(config.id),
    outputName,
    isMemoryOutput,
    signal: input.signal,
    onProgress: input.onProgress,
  });
  if (isMemoryOutput && result.blob) rememberMemoryExport(outputName, result.blob);
  return { fileName: outputName, bytes: result.bytes };
}

function readReportReserve(config: BatchConfig, pages: readonly BatchPage[]): number {
  const draft = buildReportBundle(config, pages, new Map(), 1, 1);
  const size = new Blob([draft.html, draft.json]).size;
  return Math.max(REPORT_RESERVE_MIN_BYTES, Math.round(size * REPORT_RESERVE_FACTOR));
}

async function buildAllParts(
  config: BatchConfig,
  pages: readonly BatchPage[],
): Promise<ExportPart[]> {
  const controller = new AbortController();
  exportController = controller;
  const groups = planParts(pages, readReportReserve(config, pages));
  const partByPageIndex = new Map<number, number>();
  for (const [position, group] of groups.entries()) {
    for (const pageIndex of group) partByPageIndex.set(pageIndex, position + 1);
  }
  const { startedAt } = useBatch.getState();
  const rootFolder = rootFolderName({
    firstUrl: config.urls[0] ?? 'http://localhost/',
    originCount: collectOriginPatterns(config.urls).length,
    startedAt: new Date(startedAt ?? config.createdAt),
  });
  const parts: ExportPart[] = [];
  for (const [position, group] of groups.entries()) {
    parts.push(
      await buildPart({
        config,
        rootFolder,
        pages,
        partPages: new Set(group),
        partIndex: position + 1,
        totalParts: groups.length,
        partByPageIndex,
        signal: controller.signal,
        onProgress: (done, total) =>
          useBatch.setState({ zipRatio: (position + done / Math.max(1, total)) / groups.length }),
      }),
    );
  }
  return parts;
}

export async function exportBatch(): Promise<void> {
  const { config, pages, startedAt } = useBatch.getState();
  const endPhase = wasRunCancelled() ? 'cancelled' : 'done';
  if (!config) return;
  if (!pages.some((page) => page.startedAt !== null) || startedAt === null) {
    useBatch.setState({ phase: endPhase, hasFiles: false });
    return;
  }
  useBatch.setState({ phase: 'exporting', zipRatio: 0, hasFiles: true });
  useCapture.setState({ isRunning: true });
  try {
    const exportParts = await buildAllParts(config, pages);
    useBatch.setState({ phase: endPhase, exportParts, zipRatio: 1 });
  } catch (cause) {
    const isAborted = cause instanceof NpvException && cause.error.code === 'NPV-ABORTED';
    useBatch.setState({ phase: endPhase, exportParts: [] });
    if (!isAborted) showToast({ tone: 'error', title: t('batch.result.exportFailed') });
  } finally {
    exportController = null;
    useCapture.setState({ isRunning: false });
  }
}

export function cancelExport(): void {
  exportController?.abort();
}

export async function downloadExportPart(part: ExportPart): Promise<void> {
  const { config } = useBatch.getState();
  if (!config) return;
  try {
    downloadBlob(await readExportFile(config.id, part.fileName), part.fileName);
    scheduleBatchCleanup(config.id);
  } catch {
    showToast({ tone: 'error', title: t('batch.result.exportFailed') });
  }
}

export async function finishBatch(): Promise<void> {
  const { config } = useBatch.getState();
  cancelExport();
  resetArtifacts();
  useBatch.getState().backToSetup();
  if (config) await removeBatchFolder(config.id);
}
