import { describe, expect, it } from 'vitest';
import {
  judgeWatchdog,
  pauseWatchdog,
  restartWatchdog,
  resumeWatchdog,
  startWatchdog,
  WATCHDOG_MARGIN_MS,
  WATCHDOG_MAX_PAUSE_MS,
} from './recordingWatchdog';

describe('recordingWatchdog', () => {
  it('prazo inicial soma o planejado e a margem', () => {
    const state = startWatchdog(1000, 20000);
    expect(state.deadlineAt).toBe(1000 + 20000 + WATCHDOG_MARGIN_MS);
    expect(judgeWatchdog(state, state.deadlineAt - 1)).toBe('ok');
  });

  it('reinicia o prazo depois de uma velocidade aceita', () => {
    const restarted = restartWatchdog(startWatchdog(0, 20000), 8000, 5000);
    expect(restarted.deadlineAt).toBe(8000 + 5000 + WATCHDOG_MARGIN_MS);
    expect(judgeWatchdog(restarted, 17999)).toBe('ok');
    expect(judgeWatchdog(restarted, 18000)).toBe('overdue');
  });

  it('pausa congela o relogio e retomar devolve o tempo parado', () => {
    const paused = pauseWatchdog(startWatchdog(0, 10000), 4000);
    expect(judgeWatchdog(paused, 4000 + 300000)).toBe('ok');
    const resumed = resumeWatchdog(paused, 4000 + 300000);
    expect(resumed.deadlineAt).toBe(10000 + WATCHDOG_MARGIN_MS + 300000);
    expect(judgeWatchdog(resumed, resumed.deadlineAt - 1)).toBe('ok');
  });

  it('pausa passa do teto de 10 minutos', () => {
    const paused = pauseWatchdog(startWatchdog(0, 10000), 1000);
    expect(judgeWatchdog(paused, 1000 + WATCHDOG_MAX_PAUSE_MS - 1)).toBe('ok');
    expect(judgeWatchdog(paused, 1000 + WATCHDOG_MAX_PAUSE_MS)).toBe('pause-timeout');
  });

  it('estouro do prazo sem pausa', () => {
    const state = startWatchdog(0, 10000);
    expect(judgeWatchdog(state, state.deadlineAt)).toBe('overdue');
  });

  it('velocidade aplicada em pausa mantem o congelamento', () => {
    const paused = pauseWatchdog(startWatchdog(0, 10000), 2000);
    const restarted = restartWatchdog(paused, 3000, 4000);
    expect(restarted.pausedAt).toBe(3000);
  });
});
