import {
  type ScreenId,
  type StudioClient,
  type StudioEvent,
  studioAutoscrollStart,
} from '@neruz/core';

export type AutoscrollRequest = {
  screenId: ScreenId;
  durationMs: number;
  easing: 'linear' | 'inOutSine';
  stops?: { selector: string; pauseMs: number }[];
  tailMs?: number;
};

const DEFAULT_TAIL_MS = 400;

export const createAutoscrollDriver = (
  client: StudioClient,
  request: AutoscrollRequest | undefined,
  stopRecording: () => void,
) => {
  let tailTimer: ReturnType<typeof setTimeout> | undefined;
  return {
    async start() {
      if (!request) return;
      await client.command(studioAutoscrollStart, request.screenId, {
        durationMs: request.durationMs,
        easing: request.easing,
        ...(request.stops ? { stops: request.stops } : {}),
      });
    },
    handleEvent(event: StudioEvent) {
      if (!request || event.type !== 'frame.autoscroll.ended') return;
      if (client.getScreenOfFrame(event.frameId) !== request.screenId) return;
      tailTimer = setTimeout(stopRecording, request.tailMs ?? DEFAULT_TAIL_MS);
    },
    dispose() {
      clearTimeout(tailTimer);
    },
  };
};
