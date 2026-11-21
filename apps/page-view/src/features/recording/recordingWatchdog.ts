export const WATCHDOG_MARGIN_MS = 5000;
export const WATCHDOG_MAX_PAUSE_MS = 10 * 60 * 1000;

export type WatchdogState = {
  deadlineAt: number;
  pausedAt: number | null;
};

export type WatchdogVerdict = 'ok' | 'overdue' | 'pause-timeout';

export const startWatchdog = (now: number, plannedMs: number): WatchdogState => ({
  deadlineAt: now + plannedMs + WATCHDOG_MARGIN_MS,
  pausedAt: null,
});

export const restartWatchdog = (
  state: WatchdogState,
  now: number,
  remainingMs: number,
): WatchdogState => ({
  deadlineAt: now + remainingMs + WATCHDOG_MARGIN_MS,
  pausedAt: state.pausedAt === null ? null : now,
});

export const pauseWatchdog = (state: WatchdogState, now: number): WatchdogState =>
  state.pausedAt === null ? { ...state, pausedAt: now } : state;

export const resumeWatchdog = (state: WatchdogState, now: number): WatchdogState =>
  state.pausedAt === null
    ? state
    : { deadlineAt: state.deadlineAt + (now - state.pausedAt), pausedAt: null };

export const judgeWatchdog = (state: WatchdogState, now: number): WatchdogVerdict => {
  if (state.pausedAt !== null) {
    return now - state.pausedAt >= WATCHDOG_MAX_PAUSE_MS ? 'pause-timeout' : 'ok';
  }
  return now >= state.deadlineAt ? 'overdue' : 'ok';
};
