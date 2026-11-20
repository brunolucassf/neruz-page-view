import { frameScroll } from '@neruz/core';
import { readCurrentAnchor } from './anchor-dom';
import { sendFrameEvent } from './frame-events';

const TRUSTED_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
const TRUSTED_INPUT_WINDOW_MS = 1500;
const ECHO_LOCK_MS = 150;

export type ScrollMirroring = {
  lockEcho(): void;
};

export const startScrollMirroring = (): ScrollMirroring => {
  let lastTrustedInputAt = Number.NEGATIVE_INFINITY;
  let echoLockedUntil = 0;
  let isScheduled = false;

  for (const eventName of TRUSTED_INPUT_EVENTS) {
    window.addEventListener(
      eventName,
      (event) => {
        if (event.isTrusted) lastTrustedInputAt = performance.now();
      },
      { passive: true, capture: true },
    );
  }

  window.addEventListener(
    'scroll',
    (event) => {
      const now = performance.now();
      const hasRecentInput = now - lastTrustedInputAt <= TRUSTED_INPUT_WINDOW_MS;
      if (!event.isTrusted || now < echoLockedUntil || !hasRecentInput || isScheduled) return;
      isScheduled = true;
      requestAnimationFrame(() => {
        isScheduled = false;
        sendFrameEvent(frameScroll, { anchor: readCurrentAnchor() });
      });
    },
    { passive: true },
  );

  return {
    lockEcho() {
      echoLockedUntil = performance.now() + ECHO_LOCK_MS;
    },
  };
};
