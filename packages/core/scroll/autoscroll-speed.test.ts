import { describe, expect, it } from 'vitest';
import {
  AUTOSCROLL_FACTOR_MAX,
  AUTOSCROLL_FACTOR_MIN,
  buildAutoscrollTimeline,
  measureAutoscrollRemaining,
  resolveAutoscrollFactor,
  retimeAutoscroll,
  sampleAutoscroll,
} from './autoscroll-timeline';

const basePlan = {
  totalScroll: 1000,
  durationMs: 10_000,
  easing: 'inOutSine' as const,
  stops: [
    { top: 300, pauseMs: 2000 },
    { top: 700, pauseMs: 2000 },
  ],
};

describe('retimeAutoscroll', () => {
  const timeline = buildAutoscrollTimeline(basePlan);

  it('keeps the position identical for every instant up to the cut', () => {
    const cut = 2500;
    const retimed = retimeAutoscroll(timeline, cut, 2);
    for (let elapsed = 0; elapsed <= cut; elapsed += 125) {
      expect(sampleAutoscroll(retimed, elapsed).scrollTop).toBeCloseTo(
        sampleAutoscroll(timeline, elapsed).scrollTop,
        6,
      );
    }
  });

  it('shortens only the moves ahead and keeps pauses', () => {
    const retimed = retimeAutoscroll(timeline, 1000, 2);
    const pauses = retimed.segments.filter((segment) => segment.kind === 'pause');
    expect(pauses.map((segment) => segment.endMs - segment.startMs)).toEqual([2000, 2000]);
    const moveMs = retimed.segments
      .filter((segment) => segment.kind === 'move' && segment.startMs >= 1000)
      .reduce((sum, segment) => sum + (segment.endMs - segment.startMs), 0);
    expect(moveMs).toBeGreaterThan(0);
    expect(retimed.rate).toBe(2);
    expect(retimed.totalMs).toBeLessThan(timeline.totalMs);
  });

  it('does not scale the pause in progress', () => {
    const pause = timeline.segments.find((segment) => segment.kind === 'pause');
    const cut = (pause?.startMs ?? 0) + 500;
    const retimed = retimeAutoscroll(timeline, cut, 4);
    const running = retimed.segments.find((segment) => segment.kind === 'pause');
    expect(running?.endMs).toBe(pause?.endMs);
    expect(sampleAutoscroll(retimed, cut).isPaused).toBe(true);
  });

  it('is absolute, not cumulative', () => {
    const twice = retimeAutoscroll(retimeAutoscroll(timeline, 1000, 2), 1000, 2);
    const once = retimeAutoscroll(timeline, 1000, 2);
    expect(twice.totalMs).toBeCloseTo(once.totalMs, 6);
  });

  it('ends at the same scroll position', () => {
    const retimed = retimeAutoscroll(timeline, 3000, 0.5);
    expect(sampleAutoscroll(retimed, retimed.totalMs)).toMatchObject({
      scrollTop: 1000,
      isComplete: true,
    });
  });
});

describe('measureAutoscrollRemaining', () => {
  const timeline = buildAutoscrollTimeline(basePlan);

  it('measures all at the start', () => {
    const remaining = measureAutoscrollRemaining(timeline, 0);
    expect(remaining.moveBaseMs).toBeCloseTo(10_000, 6);
    expect(remaining.pauseLeftMs).toBe(4000);
  });

  it('counts the rest of the pause in progress', () => {
    const pause = timeline.segments.find((segment) => segment.kind === 'pause');
    const remaining = measureAutoscrollRemaining(timeline, (pause?.startMs ?? 0) + 500);
    expect(remaining.pauseLeftMs).toBe(3500);
  });
});

describe('resolveAutoscrollFactor', () => {
  const remaining = { moveBaseMs: 10_000, pauseLeftMs: 4000 };

  it('never limits speeding up', () => {
    expect(resolveAutoscrollFactor(2, remaining, 20_000)).toEqual({ factor: 2, isClamped: false });
  });

  it('limits slowing down to what fits', () => {
    const result = resolveAutoscrollFactor(0.5, remaining, 18_000);
    expect(result.factor).toBeCloseTo(10_000 / 14_000, 6);
    expect(result.isClamped).toBe(true);
  });

  it('accepts the request when it fits', () => {
    expect(resolveAutoscrollFactor(0.5, remaining, 30_000)).toEqual({
      factor: 0.5,
      isClamped: false,
    });
  });

  it('uses the maximum when pauses already use the whole budget', () => {
    expect(resolveAutoscrollFactor(1, remaining, 3000).factor).toBe(AUTOSCROLL_FACTOR_MAX);
  });

  it('respects the global bounds', () => {
    expect(resolveAutoscrollFactor(0.01, { moveBaseMs: 1, pauseLeftMs: 0 }, 1e9).factor).toBe(
      AUTOSCROLL_FACTOR_MIN,
    );
    expect(resolveAutoscrollFactor(99, remaining, 1e9).factor).toBe(AUTOSCROLL_FACTOR_MAX);
  });
});
