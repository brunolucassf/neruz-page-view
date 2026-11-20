import { NpvException, sleep } from '@neruz/core';

export const CAPTURE_MIN_INTERVAL_MS = 600;
export const CAPTURE_MAX_QUEUE = 200;

export type CaptureQueueOptions = {
  minIntervalMs?: number;
  maxQueue?: number;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
};

export type CaptureQueue = {
  schedule<T>(task: () => Promise<T>): Promise<T>;
};

export const createCaptureQueue = ({
  minIntervalMs = CAPTURE_MIN_INTERVAL_MS,
  maxQueue = CAPTURE_MAX_QUEUE,
  now = () => performance.now(),
  wait = sleep,
}: CaptureQueueOptions = {}): CaptureQueue => {
  let tail: Promise<unknown> = Promise.resolve();
  let pending = 0;
  let lastStartedAt = Number.NEGATIVE_INFINITY;

  const runPaced = async <T>(task: () => Promise<T>): Promise<T> => {
    const remaining = lastStartedAt + minIntervalMs - now();
    if (remaining > 0) await wait(remaining);
    lastStartedAt = now();
    return task();
  };

  return {
    schedule<T>(task: () => Promise<T>): Promise<T> {
      if (pending >= maxQueue) {
        return Promise.reject(
          new NpvException('NPV-CAPTURE-RATE', 'capture queue is full', { pending }),
        );
      }
      pending += 1;
      const result = tail.then(
        () => runPaced(task),
        () => runPaced(task),
      );
      tail = result
        .catch(() => undefined)
        .finally(() => {
          pending -= 1;
        });
      return result;
    },
  };
};
