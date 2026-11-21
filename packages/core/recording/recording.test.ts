import { describe, expect, it } from 'vitest';
import {
  buildAutoscrollTimeline,
  sampleAutoscroll,
  sumPauseMs,
} from '../scroll/autoscroll-timeline';
import { countRepeatedFrames, createFrameDecimator, fitContain, locateSourceRect } from './crop';

describe('locateSourceRect', () => {
  it('scales and centers the viewport inside a 16:9 frame', () => {
    const rect = locateSourceRect(
      { width: 3840, height: 2160 },
      { width: 1920, height: 1080 },
      { x: 100, y: 50, width: 400, height: 800 },
    );
    expect(rect).toEqual({ x: 200, y: 100, width: 800, height: 1600 });
  });

  it('adds pillarbox offset when the viewport is squarer than the frame', () => {
    const rect = locateSourceRect(
      { width: 3840, height: 2160 },
      { width: 1080, height: 1080 },
      { x: 0, y: 0, width: 1080, height: 1080 },
    );
    expect(rect).toEqual({ x: 840, y: 0, width: 2160, height: 2160 });
  });
});

describe('fitContain', () => {
  it('centers a portrait source in a landscape output', () => {
    expect(fitContain({ width: 500, height: 1000 }, { width: 1920, height: 1080 })).toEqual({
      x: 690,
      y: 0,
      width: 540,
      height: 1080,
    });
  });
});

describe('frame decimation', () => {
  it('drops frames arriving faster than the output rate', () => {
    const decimator = createFrameDecimator(30);
    const accepted = [0, 0.008, 0.016, 0.033, 0.041, 0.066].filter((time) =>
      decimator.accept(time),
    );
    expect(accepted).toEqual([0, 0.033, 0.066]);
  });

  it('counts frames needed to reach the requested duration', () => {
    expect(countRepeatedFrames(13.2, 15000, 30)).toBe(54);
    expect(countRepeatedFrames(15.2, 15000, 30)).toBe(0);
  });
});

describe('autoscroll timeline', () => {
  const plan = { totalScroll: 1000, durationMs: 10_000, easing: 'linear' as const };

  it('adds pause time to the total and holds the scroll position', () => {
    const timeline = buildAutoscrollTimeline({ ...plan, stops: [{ top: 500, pauseMs: 2000 }] });
    expect(timeline.totalMs).toBe(12_000);
    expect(sampleAutoscroll(timeline, 5000)).toMatchObject({ scrollTop: 500, isPaused: true });
    expect(sampleAutoscroll(timeline, 6999)).toMatchObject({ scrollTop: 500, isPaused: true });
    expect(sampleAutoscroll(timeline, 7000).scrollTop).toBeCloseTo(500, 5);
    expect(sampleAutoscroll(timeline, 12_000)).toMatchObject({ scrollTop: 1000, isComplete: true });
  });

  it('pauses at the right position under sine easing', () => {
    const timeline = buildAutoscrollTimeline({
      ...plan,
      easing: 'inOutSine',
      stops: [{ top: 250, pauseMs: 1000 }],
    });
    const pause = timeline.segments.find((segment) => segment.kind === 'pause');
    expect(pause).toBeDefined();
    const sample = sampleAutoscroll(timeline, (pause?.startMs ?? 0) + 10);
    expect(sample.scrollTop).toBeCloseTo(250, 5);
    expect(sample.isPaused).toBe(true);
  });

  it('orders stops by position and ignores zero pauses', () => {
    const timeline = buildAutoscrollTimeline({
      ...plan,
      stops: [
        { top: 800, pauseMs: 500 },
        { top: 200, pauseMs: 500 },
        { top: 400, pauseMs: 0 },
      ],
    });
    expect(timeline.segments.filter((segment) => segment.kind === 'pause')).toHaveLength(2);
    expect(timeline.totalMs).toBe(11_000);
  });

  it('sums pauses', () => {
    expect(sumPauseMs([{ pauseMs: 300 }, { pauseMs: 200 }])).toBe(500);
  });
});
