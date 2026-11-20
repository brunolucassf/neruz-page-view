import { NpvException } from '../messaging/errors';

export const withTimeout = <T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new NpvException('NPV-TIMEOUT', `${label} exceeded ${timeoutMs} ms`, { timeoutMs })),
      timeoutMs,
    );
    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
