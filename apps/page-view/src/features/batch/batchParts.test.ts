import { describe, expect, it } from 'vitest';
import { planZipParts } from './batchParts';

const page = (pageIndex: number, bytes: number, entries = 1) => ({ pageIndex, bytes, entries });

describe('planZipParts', () => {
  it('keeps everything in one part when it fits', () => {
    expect(planZipParts([page(1, 100), page(2, 100)], { reservedBytes: 10 })).toEqual([[1, 2]]);
  });

  it('splits by page and never breaks a page', () => {
    const parts = planZipParts([page(1, 300), page(2, 300), page(3, 10)], {
      reservedBytes: 0,
      maxBytes: 1000,
    });
    expect(parts).toEqual([[1], [2, 3]]);
  });

  it('splits when the entry count passes the limit', () => {
    const parts = planZipParts([page(1, 10, 3), page(2, 10, 3)], {
      reservedBytes: 0,
      maxEntries: 6,
    });
    expect(parts).toEqual([[1], [2]]);
  });

  it('keeps an oversized page alone in its part', () => {
    const parts = planZipParts([page(1, 5000), page(2, 10)], { reservedBytes: 0, maxBytes: 1000 });
    expect(parts).toEqual([[1], [2]]);
  });

  it('returns one empty part when there are no pages', () => {
    expect(planZipParts([], { reservedBytes: 0 })).toEqual([[]]);
  });
});
