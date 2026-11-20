import { describe, expect, it } from 'vitest';
import { createCaptureQueue } from './capture-queue';
import { createCleanupStack } from './cleanup-stack';
import { planMoments } from './moments';
import {
  assertCanvasBudget,
  computeSlice,
  planScrollTops,
  planStripes,
  splitRowsAcrossStripes,
} from './stitch';

describe('stitch planning', () => {
  it('splits tall canvases into 16000 row stripes', () => {
    expect(planStripes(14418)).toEqual([{ top: 0, height: 14418 }]);
    expect(planStripes(40000)).toEqual([
      { top: 0, height: 16000 },
      { top: 16000, height: 16000 },
      { top: 32000, height: 8000 },
    ]);
  });
  it('plans scroll steps ending at max scroll', () => {
    expect(planScrollTops(2000, 844)).toEqual([0, 844, 1156]);
    expect(planScrollTops(500, 844)).toEqual([0]);
  });
  it('splits a slice across stripe boundaries', () => {
    expect(splitRowsAcrossStripes(15900, 300, planStripes(40000))).toEqual([
      { stripeIndex: 0, sourceRowOffset: 0, destRowInStripe: 15900, rows: 100 },
      { stripeIndex: 1, sourceRowOffset: 100, destRowInStripe: 0, rows: 200 },
    ]);
  });
  it('computes slices for a partly visible iframe', () => {
    expect(
      computeSlice({
        frameRect: { left: 10, top: -100, width: 390, height: 844 },
        viewportHeight: 500,
        rowStart: 0,
        frameScrollY: 844,
        captureScale: 3,
        cssScale: 1,
      }),
    ).toEqual({
      sourceX: 30,
      sourceY: 0,
      width: 1170,
      height: 1500,
      destY: 2532 + 300,
      nextRowStart: 600,
    });
  });
  it('returns null when the iframe is out of view', () => {
    expect(
      computeSlice({
        frameRect: { left: 0, top: 900, width: 390, height: 844 },
        viewportHeight: 500,
        rowStart: 0,
        frameScrollY: 0,
        captureScale: 1,
        cssScale: 1,
      }),
    ).toBeNull();
  });
  it('rejects canvases over the limit', () => {
    expect(() => assertCanvasBudget(20000, 100)).toThrow();
    expect(() => assertCanvasBudget(1170, 14418)).not.toThrow();
  });
});

describe('capture queue and cleanup', () => {
  it('paces captures and rejects when full', async () => {
    const waits: number[] = [];
    let now = 0;
    const queue = createCaptureQueue({
      minIntervalMs: 600,
      maxQueue: 2,
      now: () => now,
      wait: async (ms) => {
        waits.push(ms);
        now += ms;
      },
    });
    const first = queue.schedule(async () => 1);
    const second = queue.schedule(async () => 2);
    await expect(queue.schedule(async () => 3)).rejects.toMatchObject({
      error: { code: 'NPV-CAPTURE-RATE' },
    });
    await Promise.all([first, second]);
    expect(waits).toEqual([600]);
  });
  it('runs every cleanup in reverse even when one throws', async () => {
    const order: string[] = [];
    const stack = createCleanupStack();
    stack.push(() => void order.push('a'));
    stack.push(() => {
      throw new Error('x');
    });
    stack.push(() => void order.push('c'));
    await stack.runAll();
    expect(order).toEqual(['c', 'a']);
  });
});

describe('moments plan', () => {
  const section = (top: number, height: number, label?: string) => ({
    top,
    height,
    selector: `#s${top}`,
    ...(label ? { label } : {}),
  });
  it('plans one moment per section with ordered slug names', () => {
    expect(
      planMoments([section(900, 600, 'Preços e Planos'), section(0, 900, 'Hero')], 3000, 800),
    ).toEqual([
      { scrollTop: 0, name: '01-hero' },
      { scrollTop: 900, name: '02-precos-e-planos' },
    ]);
  });
  it('clamps to max scroll and drops duplicated or too close moments', () => {
    const plans = planMoments(
      [section(0, 800), section(50, 800), section(2000, 500), section(2300, 500)],
      2500,
      800,
    );
    expect(plans.map((plan) => plan.scrollTop)).toEqual([0, 1700]);
  });
  it('falls back to viewport pages when there are no sections', () => {
    expect(planMoments([], 2000, 844)).toEqual([
      { scrollTop: 0, name: '01-secao' },
      { scrollTop: 844, name: '02-secao' },
      { scrollTop: 1156, name: '03-secao' },
    ]);
  });
});
