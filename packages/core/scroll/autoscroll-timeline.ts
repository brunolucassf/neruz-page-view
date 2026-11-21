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
};

export type AutoscrollSample = { scrollTop: number; isPaused: boolean; isComplete: boolean };

const applyEasing = (easing: AutoscrollEasing, time: number) =>
  easing === 'linear' ? time : 0.5 - Math.cos(Math.PI * time) / 2;

const invertEasing = (easing: AutoscrollEasing, ratio: number) =>
  easing === 'linear' ? ratio : Math.acos(1 - 2 * ratio) / Math.PI;

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
  return { plan, segments, totalMs: clockMs };
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
