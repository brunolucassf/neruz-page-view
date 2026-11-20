export type RateLimiter = {
  tryAcquire(): boolean;
};

export const createRateLimiter = (
  maxPerSecond: number,
  now: () => number = () => Date.now(),
): RateLimiter => {
  let windowStart = now();
  let used = 0;
  return {
    tryAcquire() {
      const current = now();
      if (current - windowStart >= 1000) {
        windowStart = current;
        used = 0;
      }
      if (used >= maxPerSecond) return false;
      used += 1;
      return true;
    },
  };
};
