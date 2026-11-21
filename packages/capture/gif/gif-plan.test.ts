import { describe, expect, it } from 'vitest';
import { DEFAULT_GIF_LIMITS, planGif } from './gif-plan';

describe('planGif', () => {
  it('downscales to the max width keeping even sides', () => {
    const plan = planGif({ durationSeconds: 5, sourceWidth: 1080, sourceHeight: 1920 });
    expect(plan.width).toBe(720);
    expect(plan.height).toBe(1280);
  });

  it('keeps small sources untouched', () => {
    const plan = planGif({ durationSeconds: 2, sourceWidth: 400, sourceHeight: 300 });
    expect([plan.width, plan.height]).toEqual([400, 300]);
  });

  it('truncates at the max seconds and flags it', () => {
    const plan = planGif({ durationSeconds: 60, sourceWidth: 400, sourceHeight: 300 });
    expect(plan.isTruncated).toBe(true);
    expect(plan.timestamps.at(-1)).toBeLessThan(DEFAULT_GIF_LIMITS.maxSeconds);
  });

  it('lowers the frame rate to respect the frame cap', () => {
    const plan = planGif({
      durationSeconds: 15,
      sourceWidth: 400,
      sourceHeight: 300,
      fps: 30,
    });
    expect(plan.timestamps.length).toBeLessThanOrEqual(DEFAULT_GIF_LIMITS.maxFrames);
    expect(plan.fps).toBeLessThanOrEqual(16);
  });

  it('always plans at least one frame', () => {
    const plan = planGif({ durationSeconds: 0.01, sourceWidth: 400, sourceHeight: 300 });
    expect(plan.timestamps).toEqual([0]);
  });
});
