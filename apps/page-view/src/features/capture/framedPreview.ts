import { create } from 'zustand';
import { useResult } from '../export/resultStore';
import { useFramed } from './framedStore';
import { composePreview } from './framing/framedOutput';

const REFRESH_DELAY_MS = 120;
const REVOKE_DELAY_MS = 400;

type PreviewState = { url: string | null };

export const usePreview = create<PreviewState>()(() => ({ url: null }));

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshToken = 0;

async function refreshPreview() {
  const { shots, previewSource } = useResult.getState();
  const shot = shots[0];
  const token = ++refreshToken;
  if (!shot || !previewSource) {
    usePreview.setState({ url: null });
    return;
  }
  try {
    const blob = await composePreview(previewSource, shot, false);
    if (token !== refreshToken) return;
    const previousUrl = usePreview.getState().url;
    usePreview.setState({ url: URL.createObjectURL(blob) });
    if (previousUrl) setTimeout(() => URL.revokeObjectURL(previousUrl), REVOKE_DELAY_MS);
  } catch {
    if (token === refreshToken) usePreview.setState({ url: null });
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refreshPreview(), REFRESH_DELAY_MS);
}

export function startFramedPreview(): void {
  useFramed.subscribe(scheduleRefresh);
  useResult.subscribe((state, previous) => {
    if (state.captureId !== previous.captureId) scheduleRefresh();
  });
}

export async function composeLargePreview(): Promise<Blob | null> {
  const { shots, previewSource } = useResult.getState();
  const shot = shots[0];
  if (!shot || !previewSource) return null;
  return composePreview(previewSource, shot, true);
}
