export type AutoscrollEasing = 'linear' | 'inOutSine';

export type AutoscrollStop = { top: number; pauseMs: number };

export type AutoscrollPlan = {
  totalScroll: number;
  durationMs: number;
  easing: AutoscrollEasing;
  stops: AutoscrollStop[];
};

export type AutoscrollSegment =
  | { kind: 'move'; startMs: number; endMs: number; fromTime: number; toTime: number }
  | { kind: 'pause'; startMs: number; endMs: number; time: number };

export type AutoscrollTimeline = {
  plan: AutoscrollPlan;
  segments: AutoscrollSegment[];
  totalMs: number;
  rate: number;
};

export type AutoscrollRemaining = { moveBaseMs: number; pauseLeftMs: number };

export type AutoscrollSample = { scrollTop: number; isPaused: boolean; isComplete: boolean };

export const AUTOSCROLL_FACTOR_MIN = 0.25;
export const AUTOSCROLL_FACTOR_MAX = 4;

const SINE_WEIGHT = 0.7;
const INVERSION_STEPS = 32;

const applyEasing = (easing: AutoscrollEasing, time: number) =>
  easing === 'linear'
    ? time
    : SINE_WEIGHT * (0.5 - Math.cos(Math.PI * time) / 2) + (1 - SINE_WEIGHT) * time;

const invertEasing = (easing: AutoscrollEasing, ratio: number) => {
  if (easing === 'linear') return ratio;
  let low = 0;
  let high = 1;
  for (let step = 0; step < INVERSION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (applyEasing(easing, middle) < ratio) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const buildAutoscrollTimeline = (plan: AutoscrollPlan): AutoscrollTimeline => {
  const stopTimes = plan.stops
    .filter((stop) => stop.pauseMs > 0 && plan.totalScroll > 0)
    .map((stop) => ({
      time: invertEasing(plan.easing, clamp01(stop.top / plan.totalScroll)),
      pauseMs: stop.pauseMs,
    }))
    .sort((first, second) => first.time - second.time);

  const segments: AutoscrollSegment[] = [];
  let clockMs = 0;
  let movedTime = 0;
  const addMove = (toTime: number) => {
    const spanMs = (toTime - movedTime) * plan.durationMs;
    if (spanMs <= 0) return;
    segments.push({
      kind: 'move',
      startMs: clockMs,
      endMs: clockMs + spanMs,
      fromTime: movedTime,
      toTime,
    });
    clockMs += spanMs;
    movedTime = toTime;
  };
  for (const stop of stopTimes) {
    addMove(stop.time);
    segments.push({
      kind: 'pause',
      startMs: clockMs,
      endMs: clockMs + stop.pauseMs,
      time: movedTime,
    });
    clockMs += stop.pauseMs;
  }
  addMove(1);
  return { plan, segments, totalMs: clockMs, rate: 1 };
};

export const sampleAutoscroll = (
  timeline: AutoscrollTimeline,
  elapsedMs: number,
): AutoscrollSample => {
  const { plan, totalMs } = timeline;
  const finished = { scrollTop: plan.totalScroll, isPaused: false, isComplete: true };
  if (elapsedMs >= totalMs) return finished;
  const segment = timeline.segments.find((item) => elapsedMs < item.endMs);
  if (!segment) return finished;
  if (segment.kind === 'pause') {
    return {
      scrollTop: applyEasing(plan.easing, segment.time) * plan.totalScroll,
      isPaused: true,
      isComplete: false,
    };
  }
  const local = (elapsedMs - segment.startMs) / (segment.endMs - segment.startMs);
  const time = segment.fromTime + (segment.toTime - segment.fromTime) * clamp01(local);
  return {
    scrollTop: applyEasing(plan.easing, time) * plan.totalScroll,
    isPaused: false,
    isComplete: false,
  };
};

export const sumPauseMs = (stops: readonly { pauseMs: number }[]) =>
  stops.reduce((total, stop) => total + Math.max(0, stop.pauseMs), 0);

const timeAt = (segment: Extract<AutoscrollSegment, { kind: 'move' }>, elapsedMs: number) =>
  segment.fromTime +
  ((segment.toTime - segment.fromTime) * (elapsedMs - segment.startMs)) /
    (segment.endMs - segment.startMs);

const splitAt = (segments: AutoscrollSegment[], elapsedMs: number): AutoscrollSegment[] =>
  segments.flatMap((segment): AutoscrollSegment[] => {
    if (segment.kind !== 'move' || elapsedMs <= segment.startMs || elapsedMs >= segment.endMs)
      return [segment];
    const cutTime = timeAt(segment, elapsedMs);
    return [
      { ...segment, endMs: elapsedMs, toTime: cutTime },
      { ...segment, startMs: elapsedMs, fromTime: cutTime },
    ];
  });

export const retimeAutoscroll = (
  timeline: AutoscrollTimeline,
  elapsedMs: number,
  rate: number,
): AutoscrollTimeline => {
  const pieces = splitAt(timeline.segments, elapsedMs);
  const kept = pieces.filter((segment) => segment.endMs <= elapsedMs);
  const upcoming = pieces.filter((segment) => segment.endMs > elapsedMs);
  let clockMs = elapsedMs;
  const rebuilt = upcoming.map((segment): AutoscrollSegment => {
    const isRunningPause = segment.kind === 'pause' && segment.startMs < elapsedMs;
    const spanMs =
      segment.kind === 'move'
        ? ((segment.toTime - segment.fromTime) * timeline.plan.durationMs) / rate
        : segment.endMs - segment.startMs;
    const startMs = isRunningPause ? segment.startMs : clockMs;
    const retimed = {
      ...segment,
      startMs,
      endMs: isRunningPause ? segment.endMs : startMs + spanMs,
    };
    clockMs = retimed.endMs;
    return retimed;
  });
  return { ...timeline, segments: [...kept, ...rebuilt], totalMs: clockMs, rate };
};

export const measureAutoscrollRemaining = (
  timeline: AutoscrollTimeline,
  elapsedMs: number,
): AutoscrollRemaining => {
  const remaining = { moveBaseMs: 0, pauseLeftMs: 0 };
  for (const segment of timeline.segments) {
    if (segment.endMs <= elapsedMs) continue;
    if (segment.kind === 'pause') {
      remaining.pauseLeftMs += segment.endMs - Math.max(segment.startMs, elapsedMs);
      continue;
    }
    const fromTime = elapsedMs > segment.startMs ? timeAt(segment, elapsedMs) : segment.fromTime;
    remaining.moveBaseMs += (segment.toTime - fromTime) * timeline.plan.durationMs;
  }
  return remaining;
};

export const resolveAutoscrollFactor = (
  requested: number,
  remaining: AutoscrollRemaining,
  maxRemainingMs: number,
): { factor: number; isClamped: boolean } => {
  const movableMs = maxRemainingMs - remaining.pauseLeftMs;
  const feasible = movableMs > 0 ? remaining.moveBaseMs / movableMs : AUTOSCROLL_FACTOR_MAX;
  const floor = Math.max(AUTOSCROLL_FACTOR_MIN, feasible);
  const factor = Math.min(AUTOSCROLL_FACTOR_MAX, Math.max(floor, requested));
  return { factor, isClamped: factor !== requested };
};
