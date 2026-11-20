import { sleep } from '@neruz/core';
import { maxScrollTop, scrollInstantly } from './timing';

const DOM_QUIET_MS = 300;
const NETWORK_QUIET_MS = 500;
const POLL_MS = 50;
const DEFAULT_STEP_CAP_MS = 4000;
const IMAGE_DECODE_CAP_MS = 1500;
const WARMUP_DEADLINE_MS = 85_000;
const DEFAULT_WARMUP_STEP_RATIO = 0.5;
const DEFAULT_WARMUP_MAX_STEPS = 60;

const listVisibleImages = () =>
  [...document.images].filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });

const areAnimationsSettled = () =>
  document.getAnimations().every((animation) => {
    if (animation.playState === 'finished' || animation.playState === 'idle') return true;
    return animation.effect?.getComputedTiming().iterations === Number.POSITIVE_INFINITY;
  });

export type StableResult = { waitedMs: number; timedOut: boolean };

export const waitStable = async (maxMs: number = DEFAULT_STEP_CAP_MS): Promise<StableResult> => {
  const startedAt = performance.now();
  let lastDomChange = startedAt;
  let lastNetwork = startedAt;
  const mutations = new MutationObserver(() => {
    lastDomChange = performance.now();
  });
  mutations.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  const network = new PerformanceObserver(() => {
    lastNetwork = performance.now();
  });
  network.observe({ type: 'resource', buffered: false });

  let timedOut = false;
  try {
    while (true) {
      await sleep(POLL_MS);
      const now = performance.now();
      const isStable =
        now - lastDomChange >= DOM_QUIET_MS &&
        now - lastNetwork >= NETWORK_QUIET_MS &&
        areAnimationsSettled() &&
        listVisibleImages().every((image) => image.complete);
      if (isStable) break;
      if (now - startedAt > maxMs) {
        timedOut = true;
        break;
      }
    }
  } finally {
    mutations.disconnect();
    network.disconnect();
  }
  await Promise.all(
    listVisibleImages().map((image) =>
      Promise.race([image.decode().catch(() => undefined), sleep(IMAGE_DECODE_CAP_MS)]),
    ),
  );
  return { waitedMs: Math.round(performance.now() - startedAt), timedOut };
};

export type WarmupOptions = { stepRatio?: number; maxSteps?: number };

export const warmup = async ({
  stepRatio = DEFAULT_WARMUP_STEP_RATIO,
  maxSteps = DEFAULT_WARMUP_MAX_STEPS,
}: WarmupOptions) => {
  const startedAt = performance.now();
  const step = Math.max(1, window.innerHeight * stepRatio);
  let steps = 0;
  let timeouts = 0;
  for (
    let top = 0;
    steps < maxSteps &&
    top <= maxScrollTop() + step &&
    performance.now() - startedAt < WARMUP_DEADLINE_MS;
    top += step
  ) {
    scrollInstantly(Math.min(top, maxScrollTop()));
    const result = await waitStable();
    steps += 1;
    if (result.timedOut) timeouts += 1;
  }
  scrollInstantly(0);
  await waitStable();
  return {
    steps,
    timeouts,
    durationMs: Math.round(performance.now() - startedAt),
    scrollHeight: document.documentElement.scrollHeight,
  };
};
