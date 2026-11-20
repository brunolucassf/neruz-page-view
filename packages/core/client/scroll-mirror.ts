import { studioApplyScroll } from '../messaging/studio';
import type { ScreenId, ScrollAnchor } from '../types';
import type { StudioClient } from './studio-client';

export type ScrollMirror = {
  stop(): void;
};

export type ScrollMirrorOptions = {
  isEnabled: () => boolean;
};

export const createScrollMirror = (
  client: StudioClient,
  { isEnabled }: ScrollMirrorOptions,
): ScrollMirror => {
  const pendingByScreen = new Map<ScreenId, ScrollAnchor>();
  const inFlight = new Set<ScreenId>();

  const flush = async (screenId: ScreenId) => {
    if (inFlight.has(screenId)) return;
    inFlight.add(screenId);
    try {
      for (
        let anchor = pendingByScreen.get(screenId);
        anchor;
        anchor = pendingByScreen.get(screenId)
      ) {
        pendingByScreen.delete(screenId);
        await client.command(studioApplyScroll, screenId, { anchor }).catch(() => undefined);
      }
    } finally {
      inFlight.delete(screenId);
    }
  };

  const stopListening = client.onEvent((event) => {
    if (event.type !== 'frame.scroll' || !isEnabled()) return;
    const source = client.getScreenOfFrame(event.frameId);
    if (!source) return;
    for (const target of client.listKnownScreens()) {
      if (target === source) continue;
      pendingByScreen.set(target, event.payload.anchor);
      void flush(target);
    }
  });

  return {
    stop() {
      stopListening();
      pendingByScreen.clear();
    },
  };
};
