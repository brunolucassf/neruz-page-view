import { describe, expect, it } from 'vitest';
import { pickInitialBarPoint, placeBarOutsideVideo } from './recordingBarLayout';

const video = { x: 0, y: 0, width: 390, height: 844 };
const bar = { width: 320, height: 56 };

describe('placeBarOutsideVideo', () => {
  it('keeps a free position unchanged', () => {
    expect(
      placeBarOutsideVideo({ x: 500, y: 40 }, bar, video, { width: 1200, height: 900 }),
    ).toEqual({
      x: 500,
      y: 40,
    });
  });

  it('pushes a position that overlaps the video to the nearest free side', () => {
    const placed = placeBarOutsideVideo({ x: 200, y: 40 }, bar, video, {
      width: 1200,
      height: 900,
    });
    expect(placed?.x).toBe(406);
  });

  it('returns null when the video leaves no room', () => {
    const full = { x: 0, y: 0, width: 1200, height: 900 };
    expect(
      placeBarOutsideVideo({ x: 100, y: 100 }, bar, full, { width: 1200, height: 900 }),
    ).toBeNull();
  });
});

describe('pickInitialBarPoint', () => {
  it('starts beside the video when there is room', () => {
    expect(pickInitialBarPoint(bar, video, { width: 1200, height: 900 })).toEqual({
      x: 406,
      y: 32,
    });
  });

  it('falls below the video when the sides are full', () => {
    const wide = { x: 0, y: 0, width: 1200, height: 700 };
    expect(pickInitialBarPoint(bar, wide, { width: 1200, height: 900 })?.y).toBe(716);
  });
});
