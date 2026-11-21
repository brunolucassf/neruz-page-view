import { MEMORY_FALLBACK_MAX_BYTES, NpvException } from '@neruz/core';
import type { ZipSourceRef } from './batchZipTypes';

const ROOT_FOLDER = 'npv-tmp';
const LOCK_PREFIX = 'npv-tmp:';
const FILES_FOLDER = 'files';
const EXPORT_FOLDER = 'export';
const SESSION_CLEANUP_DELAY_MS = 120_000;

type StoredFile = { path: string; bytes: number };

const sessionId = crypto.randomUUID();
const memoryFiles = new Map<string, Blob>();
const memoryExports = new Map<string, Blob>();
let memoryBytes = 0;
let isLockHeld = false;
let isMemoryMode = false;
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;

const hasOpfs = () =>
  typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';

const getRoot = () => navigator.storage.getDirectory();

async function openFolder(
  segments: readonly string[],
  isCreating: boolean,
): Promise<FileSystemDirectoryHandle> {
  let folder = await getRoot();
  for (const segment of segments) {
    folder = await folder.getDirectoryHandle(segment, { create: isCreating });
  }
  return folder;
}

const batchRoot = (batchId: string) => [ROOT_FOLDER, sessionId, `batch-${batchId}`];

export const batchFilesSegments = (batchId: string): string[] => [
  ...batchRoot(batchId),
  FILES_FOLDER,
];

export const batchExportSegments = (batchId: string): string[] => [
  ...batchRoot(batchId),
  EXPORT_FOLDER,
];

const isQuotaError = (cause: unknown) =>
  cause instanceof DOMException && cause.name === 'QuotaExceededError';

const storageFull = () => new NpvException('NPV-STORAGE-FULL', 'no space left for the batch');

function holdSessionLock(): void {
  if (isLockHeld || !navigator.locks) return;
  isLockHeld = true;
  void navigator.locks.request(`${LOCK_PREFIX}${sessionId}`, () => new Promise<void>(() => {}));
}

async function listHeldSessions(): Promise<Set<string>> {
  if (!navigator.locks) return new Set();
  const { held } = await navigator.locks.query();
  const names = (held ?? []).flatMap((lock) => (lock.name ? [lock.name] : []));
  return new Set(
    names
      .filter((name) => name.startsWith(LOCK_PREFIX))
      .map((name) => name.slice(LOCK_PREFIX.length)),
  );
}

async function removeOrphanSessions(): Promise<void> {
  const root = await getRoot();
  const tmpRoot = await root.getDirectoryHandle(ROOT_FOLDER, { create: true });
  const held = await listHeldSessions();
  const names: string[] = [];
  for await (const [name] of tmpRoot.entries()) names.push(name);
  await Promise.all(
    names
      .filter((name) => !held.has(name))
      .map((name) => tmpRoot.removeEntry(name, { recursive: true }).catch(() => undefined)),
  );
}

export async function initBatchStorage(): Promise<void> {
  holdSessionLock();
  if (!hasOpfs()) {
    isMemoryMode = true;
    return;
  }
  try {
    await removeOrphanSessions();
  } catch {
    isMemoryMode = true;
  }
}

export const isUsingMemoryFallback = () => isMemoryMode;

export async function hasEnoughSpace(captureCount: number, bytesPerCapture: number) {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined || usage === undefined) return true;
    return quota - usage >= captureCount * bytesPerCapture;
  } catch {
    return true;
  }
}

export async function writeBatchFile(
  batchId: string,
  path: string,
  blob: Blob,
): Promise<StoredFile> {
  if (isMemoryMode) {
    if (memoryBytes + blob.size > MEMORY_FALLBACK_MAX_BYTES) throw storageFull();
    memoryFiles.set(path, blob);
    memoryBytes += blob.size;
    return { path, bytes: blob.size };
  }
  const segments = path.split('/');
  const name = segments.pop() ?? path;
  try {
    const folder = await openFolder([...batchFilesSegments(batchId), ...segments], true);
    const handle = await folder.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (cause) {
    if (isQuotaError(cause)) throw storageFull();
    throw cause;
  }
  return { path, bytes: blob.size };
}

export function resolveBatchSource(batchId: string, path: string): ZipSourceRef {
  const memoryBlob = memoryFiles.get(path);
  if (isMemoryMode && memoryBlob) return { kind: 'memory', blob: memoryBlob };
  return { kind: 'opfs', segments: [...batchFilesSegments(batchId), ...path.split('/')] };
}

export function rememberMemoryExport(fileName: string, blob: Blob): void {
  memoryExports.set(fileName, blob);
}

export async function readExportFile(batchId: string, fileName: string): Promise<Blob> {
  const memoryBlob = memoryExports.get(fileName);
  if (memoryBlob) return memoryBlob;
  const folder = await openFolder(batchExportSegments(batchId), false);
  const handle = await folder.getFileHandle(fileName);
  return handle.getFile();
}

export async function removeBatchFolder(batchId: string): Promise<void> {
  clearTimeout(cleanupTimer);
  memoryFiles.clear();
  memoryExports.clear();
  memoryBytes = 0;
  if (!hasOpfs()) return;
  try {
    const session = await openFolder([ROOT_FOLDER, sessionId], false);
    await session.removeEntry(`batch-${batchId}`, { recursive: true });
  } catch {}
}

export function scheduleBatchCleanup(batchId: string): void {
  clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => void removeBatchFolder(batchId), SESSION_CLEANUP_DELAY_MS);
}

export function removeSessionOnPageHide(): void {
  if (!hasOpfs()) return;
  void getRoot()
    .then((root) => root.getDirectoryHandle(ROOT_FOLDER))
    .then((tmpRoot) => tmpRoot.removeEntry(sessionId, { recursive: true }))
    .catch(() => undefined);
}
