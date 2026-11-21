import { Zip, ZipPassThrough } from 'fflate';
import type {
  ZipEntryInput,
  ZipJobRequest,
  ZipWorkerRequest,
  ZipWorkerResponse,
} from './batchZipTypes';

type SyncAccessHandle = {
  truncate: (size: number) => void;
  write: (data: Uint8Array, options: { at: number }) => number;
  flush: () => void;
  close: () => void;
};

type SyncCapableFileHandle = FileSystemFileHandle & {
  createSyncAccessHandle: () => Promise<SyncAccessHandle>;
};

type ByteSink = {
  write: (chunk: Uint8Array) => void;
  finish: () => Blob | null;
  close: () => void;
};

let isAborted = false;

const post = (response: ZipWorkerResponse) => self.postMessage(response);

class AbortedError extends Error {}

async function openFolder(segments: readonly string[], isCreating: boolean) {
  let folder = await navigator.storage.getDirectory();
  for (const segment of segments) {
    folder = await folder.getDirectoryHandle(segment, { create: isCreating });
  }
  return folder;
}

async function readEntryFile(entry: ZipEntryInput): Promise<Blob> {
  if (entry.source.kind === 'memory') return entry.source.blob;
  const segments = [...entry.source.segments];
  const name = segments.pop() ?? '';
  const folder = await openFolder(segments, false);
  return (await folder.getFileHandle(name)).getFile();
}

async function createOpfsSink(request: ZipJobRequest): Promise<ByteSink> {
  const folder = await openFolder(request.outputSegments, true);
  const handle = (await folder.getFileHandle(request.outputName, {
    create: true,
  })) as SyncCapableFileHandle;
  const access = await handle.createSyncAccessHandle();
  access.truncate(0);
  let offset = 0;
  return {
    write: (chunk) => {
      offset += access.write(chunk, { at: offset });
    },
    finish: () => {
      access.flush();
      return null;
    },
    close: () => access.close(),
  };
}

function createMemorySink(): ByteSink {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  return {
    write: (chunk) => {
      chunks.push(chunk.slice() as Uint8Array<ArrayBuffer>);
    },
    finish: () => new Blob(chunks, { type: 'application/zip' }),
    close: () => {},
  };
}

async function pushFile(zipEntry: ZipPassThrough, file: Blob): Promise<void> {
  const reader = file.stream().getReader();
  for (;;) {
    if (isAborted) {
      await reader.cancel();
      throw new AbortedError();
    }
    const { done, value } = await reader.read();
    if (done) break;
    zipEntry.push(value, false);
  }
  zipEntry.push(new Uint8Array(0), true);
}

async function buildArchive(request: ZipJobRequest, sink: ByteSink): Promise<number> {
  let bytes = 0;
  const failure: { error: Error | null } = { error: null };
  const zip = new Zip((error, chunk) => {
    if (error) {
      failure.error = error;
      return;
    }
    bytes += chunk.length;
    sink.write(chunk);
  });
  for (const [index, entry] of request.entries.entries()) {
    const file = await readEntryFile(entry);
    const zipEntry = new ZipPassThrough(entry.path);
    zip.add(zipEntry);
    await pushFile(zipEntry, file);
    if (failure.error) throw failure.error;
    post({ type: 'progress', done: index + 1, total: request.entries.length });
  }
  zip.end();
  if (failure.error) throw failure.error;
  return bytes;
}

const isQuotaError = (cause: unknown) =>
  cause instanceof DOMException && cause.name === 'QuotaExceededError';

async function runJob(request: ZipJobRequest): Promise<void> {
  const sink = request.isMemoryOutput ? createMemorySink() : await createOpfsSink(request);
  try {
    const bytes = await buildArchive(request, sink);
    post({ type: 'done', bytes, blob: sink.finish() });
  } finally {
    sink.close();
  }
}

self.onmessage = (event: MessageEvent<ZipWorkerRequest>) => {
  if (event.data.type === 'abort') {
    isAborted = true;
    return;
  }
  runJob(event.data).catch((cause: unknown) => {
    if (cause instanceof AbortedError) post({ type: 'error', code: 'aborted', message: 'aborted' });
    else if (isQuotaError(cause)) post({ type: 'error', code: 'storage-full', message: 'quota' });
    else
      post({
        type: 'error',
        code: 'failed',
        message: cause instanceof Error ? cause.message.slice(0, 300) : 'zip failed',
      });
  });
};
