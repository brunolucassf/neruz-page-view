import { describe, expect, it } from 'vitest';
import { formatClock, pickTabZoom, planRecording, resolveOutputSize } from './recordingPlan';

describe('resolveOutputSize', () => {
  it('uses fixed sizes for vertical and horizontal', () => {
    expect(resolveOutputSize('vertical', { width: 390, height: 844 })).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(resolveOutputSize('horizontal', { width: 390, height: 844 })).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('scales the screen size to an even output of at least 1080 on the long side', () => {
    const size = resolveOutputSize('screen', { width: 390, height: 844 });
    expect(size.height).toBe(1080);
    expect(size.width % 2).toBe(0);
  });

  it('never exceeds 3840 on any side', () => {
    const size = resolveOutputSize('screen', { width: 5000, height: 2000 });
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(3840);
  });
});

describe('planRecording', () => {
  const sections = [
    { selector: 'a', top: 0 },
    { selector: 'b', top: 900 },
    { selector: 'c', top: 1800 },
    { selector: 'd', top: 99999 },
  ];

  it('derives scroll time from speed and clamps to the minimum', () => {
    const plan = planRecording({
      speed: 'normal',
      totalScroll: 2800,
      sections: [],
      hasPauses: false,
    });
    expect(plan.scrollMs).toBe(10_000);
    const short = planRecording({
      speed: 'fast',
      totalScroll: 100,
      sections: [],
      hasPauses: false,
    });
    expect(short.scrollMs).toBe(4000);
  });

  it('adds one pause per section below the top and inside the scroll range', () => {
    const plan = planRecording({ speed: 'normal', totalScroll: 2800, sections, hasPauses: true });
    expect(plan.stops.map((stop) => stop.selector)).toEqual(['b', 'c']);
    expect(plan.durationMs).toBe(10_000 + 2400 + 3000 + 120_000);
  });

  it('skips pauses when disabled', () => {
    const plan = planRecording({ speed: 'normal', totalScroll: 2800, sections, hasPauses: false });
    expect(plan.stops).toEqual([]);
  });

  it('caps the total at ten minutes', () => {
    const plan = planRecording({
      speed: 'slow',
      totalScroll: 10_000_000,
      sections: [],
      hasPauses: true,
    });
    expect(plan.durationMs).toBeLessThanOrEqual(600_000);
  });
});

describe('pickTabZoom', () => {
  it('fits the screen to the tallest side within the allowed range', () => {
    expect(pickTabZoom({ width: 390, height: 844 }, { width: 1400, height: 900 })).toBe(1.05);
    expect(pickTabZoom({ width: 390, height: 400 }, { width: 1400, height: 900 })).toBe(2.25);
    expect(pickTabZoom({ width: 100, height: 100 }, { width: 1400, height: 900 })).toBe(3);
    expect(pickTabZoom({ width: 1920, height: 4000 }, { width: 1400, height: 900 })).toBe(0.25);
  });
});

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(65_000)).toBe('01:05');
  });
});
