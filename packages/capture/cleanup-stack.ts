export type CleanupStack = {
  push(cleanup: () => void | Promise<void>): void;
  runAll(): Promise<void>;
};

export const createCleanupStack = (): CleanupStack => {
  const cleanups: Array<() => void | Promise<void>> = [];
  return {
    push(cleanup) {
      cleanups.push(cleanup);
    },
    async runAll() {
      while (cleanups.length) {
        const cleanup = cleanups.pop();
        try {
          await cleanup?.();
        } catch {}
      }
    },
  };
};
