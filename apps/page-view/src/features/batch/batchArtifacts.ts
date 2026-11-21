export type StoredBatchFile = { path: string; pageIndex: number; bytes: number };

const files: StoredBatchFile[] = [];
const thumbnails = new Map<string, string>();
let isCancelled = false;

export const addArtifactFile = (file: StoredBatchFile) => files.push(file);
export const addThumbnail = (key: string, dataUrl: string) => thumbnails.set(key, dataUrl);
export const listArtifactFiles = (): readonly StoredBatchFile[] => files;
export const getThumbnails = (): ReadonlyMap<string, string> => thumbnails;
export const markRunCancelled = () => {
  isCancelled = true;
};
export const wasRunCancelled = () => isCancelled;

export function resetArtifacts(): void {
  files.length = 0;
  thumbnails.clear();
  isCancelled = false;
}
