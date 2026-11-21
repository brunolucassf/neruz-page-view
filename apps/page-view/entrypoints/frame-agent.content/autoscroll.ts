import {
  type AutoscrollPlan,
  type AutoscrollStop,
  type AutoscrollTimeline,
  buildAutoscrollTimeline,
  frameAutoscrollEnded,
  measureAutoscrollRemaining,
  NpvException,
  type PayloadOf,
  resolveAutoscrollFactor,
  retimeAutoscroll,
  sampleAutoscroll,
  type studioAutoscrollSpeed,
  type studioAutoscrollStart,
} from '@neruz/core';
import { sendFrameEvent } from './frame-events';
import { maxScrollTop, scrollInstantly } from './timing';

type RunningAutoscroll = {
  timeline: AutoscrollTimeline;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  frameHandle: number;
};

let running: RunningAutoscroll | null = null;

const elapsedOf = (state: RunningAutoscroll, now: number) =>
  (state.pausedAt ?? now) - state.startedAt - state.pausedTotalMs;

const resolveStops = (
  stops: NonNullable<PayloadOf<typeof studioAutoscrollStart>['stops']>,
  totalScroll: number,
): AutoscrollStop[] =>
  stops.flatMap((stop) => {
    try {
      const element = document.querySelector(stop.selector);
      if (!element) return [];
      const top = element.getBoundingClientRect().top + window.scrollY;
      return [{ top: Math.min(Math.max(0, top), totalScroll), pauseMs: stop.pauseMs }];
    } catch {
      return [];
    }
  });

const endAutoscroll = (reason: 'complete' | 'stopped') => {
  const state = running;
  if (!state) return window.scrollY;
  running = null;
  cancelAnimationFrame(state.frameHandle);
  sendFrameEvent(frameAutoscrollEnded, {
    reason,
    scrollY: window.scrollY,
    elapsedMs: Math.round(Math.max(0, elapsedOf(state, performance.now()))),
  });
  return window.scrollY;
};

const step = (state: RunningAutoscroll) => {
  if (running !== state || state.pausedAt !== null) return;
  const sample = sampleAutoscroll(state.timeline, elapsedOf(state, performance.now()));
  scrollInstantly(sample.scrollTop);
  if (sample.isComplete) {
    endAutoscroll('complete');
    return;
  }
  state.frameHandle = requestAnimationFrame(() => step(state));
};

export const startAutoscroll = (payload: PayloadOf<typeof studioAutoscrollStart>) => {
  endAutoscroll('stopped');
  const totalScroll = maxScrollTop();
  const plan: AutoscrollPlan = {
    totalScroll,
    durationMs: payload.durationMs,
    easing: payload.easing,
    stops: resolveStops(payload.stops ?? [], totalScroll),
  };
  const state: RunningAutoscroll = {
    timeline: buildAutoscrollTimeline(plan),
    startedAt: performance.now(),
    pausedAt: null,
    pausedTotalMs: 0,
    frameHandle: 0,
  };
  running = state;
  scrollInstantly(0);
  state.frameHandle = requestAnimationFrame(() => step(state));
  return { totalScroll };
};

export const pauseAutoscroll = () => {
  if (running && running.pausedAt === null) {
    running.pausedAt = performance.now();
    cancelAnimationFrame(running.frameHandle);
  }
  return { scrollY: window.scrollY };
};

export const resumeAutoscroll = () => {
  const state = running;
  if (state && state.pausedAt !== null) {
    state.pausedTotalMs += performance.now() - state.pausedAt;
    state.pausedAt = null;
    state.frameHandle = requestAnimationFrame(() => step(state));
  }
  return { scrollY: window.scrollY };
};

export const stopAutoscroll = () => ({ scrollY: endAutoscroll('stopped') });

export const setAutoscrollSpeed = ({
  factor,
  maxRemainingMs,
}: PayloadOf<typeof studioAutoscrollSpeed>) => {
  const state = running;
  if (!state)
    throw new NpvException('NPV-BAD-REQUEST', 'autoscroll not running', { reason: 'not-running' });
  const elapsedMs = Math.max(0, elapsedOf(state, performance.now()));
  const remaining = measureAutoscrollRemaining(state.timeline, elapsedMs);
  const resolved = resolveAutoscrollFactor(factor, remaining, maxRemainingMs);
  state.timeline = retimeAutoscroll(state.timeline, elapsedMs, resolved.factor);
  return {
    factor: resolved.factor,
    isClamped: resolved.isClamped,
    remainingMs: Math.max(0, Math.round(state.timeline.totalMs - elapsedMs)),
    scrollY: window.scrollY,
  };
};
