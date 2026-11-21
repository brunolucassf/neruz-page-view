import { Flag, GripVertical, Pause, Play, Square } from 'lucide-react';
import { type KeyboardEvent, type PointerEvent, useLayoutEffect, useRef, useState } from 'react';
import { Button, Radio, RadioGroup } from 'react-aria-components';
import { t } from '../i18n';
import {
  type BarBox,
  type BarPoint,
  pickInitialBarPoint,
  placeBarOutsideVideo,
} from './recordingBarLayout';
import {
  markPauseHere,
  setScrollSpeed,
  stopRecordingNow,
  toggleScrollPause,
} from './recordingControls';
import { formatClock, SPEED_FACTORS } from './recordingPlan';
import { useRecording } from './recordingState';

const STOP_HINT_ID = 'rec-bar-stop-hint';
const KEY_STEP_PX = 16;
const KEY_STEP_FAST_PX = 64;

const readVideoBox = (): BarBox | null => {
  const frame = document.querySelector<HTMLElement>('.screen[data-capture-target] iframe');
  if (!frame) return null;
  const box = frame.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
};

const measureBar = (bar: HTMLElement | null, scale: number) => {
  const video = readVideoBox();
  if (!bar || !video) return null;
  const size = { width: bar.offsetWidth * scale, height: bar.offsetHeight * scale };
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  return { size, video, viewport };
};

const formatFactor = (factor: number) => `${String(factor).replace('.', ',')}×`;

const KEY_DIRECTIONS: Record<string, BarPoint> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export function RecordingBar() {
  const elapsedMs = useRecording((state) => state.elapsedMs);
  const isPaused = useRecording((state) => state.isManuallyPaused);
  const scrollFactor = useRecording((state) => state.scrollFactor);
  const isSpeedClamped = useRecording((state) => state.isSpeedClamped);
  const scale = 1 / useRecording((state) => state.stageZoom);
  const barRef = useRef<HTMLFieldSetElement>(null);
  const dragOffset = useRef<BarPoint | null>(null);
  const [point, setPoint] = useState<BarPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = measureBar(barRef.current, scale);
      if (!context) return;
      const initial = pickInitialBarPoint(context.size, context.video, context.viewport);
      setIsHidden(initial === null);
      if (initial) setPoint(initial);
    });
    return () => cancelAnimationFrame(frame);
  }, [scale]);

  const moveTo = (wanted: BarPoint) => {
    const context = measureBar(barRef.current, scale);
    if (!context) return;
    const placed = placeBarOutsideVideo(wanted, context.size, context.video, context.viewport);
    if (placed) setPoint(placed);
  };

  const handleDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = { x: event.clientX - point.x, y: event.clientY - point.y };
    setIsDragging(true);
  };

  const handleDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    const offset = dragOffset.current;
    if (offset) moveTo({ x: event.clientX - offset.x, y: event.clientY - offset.y });
  };

  const handleDragEnd = () => {
    dragOffset.current = null;
    setIsDragging(false);
  };

  const handleHandleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction || !point) return;
    event.preventDefault();
    const step = event.shiftKey ? KEY_STEP_FAST_PX : KEY_STEP_PX;
    moveTo({ x: point.x + direction.x * step, y: point.y + direction.y * step });
  };

  const clock = formatClock(elapsedMs);
  const statusKey = isPaused ? 'studio.recbar.paused' : 'studio.recbar.recording';

  return (
    <>
      <p className="rec-bar__announce" role="status">
        {t('studio.recbar.a11y.started')}
      </p>
      <p id={STOP_HINT_ID} className="rec-bar__announce">
        {t('studio.recbar.stopHint')}
      </p>
      <fieldset
        ref={barRef}
        aria-label={t('studio.recbar.recording', { time: clock })}
        className="rec-bar"
        data-dragging={isDragging || undefined}
        data-paused={isPaused || undefined}
        hidden={isHidden}
        style={{
          transform: `translate3d(${point?.x ?? 0}px, ${point?.y ?? 0}px, 0) scale(${scale})`,
          opacity: point ? 1 : 0,
        }}
      >
        <Button
          className="rec-bar__handle"
          aria-label={t('studio.recbar.drag')}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onKeyDown={handleHandleKey}
        >
          <GripVertical size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <span className="rec-bar__status pv-tnum" aria-live="off">
          <span className="rec-bar__dot" aria-hidden="true" />
          {t(statusKey, { time: clock })}
        </span>
        <Button
          className="rec-bar__button"
          aria-label={t(isPaused ? 'studio.recbar.resume' : 'studio.recbar.pause')}
          onPress={() => void toggleScrollPause()}
        >
          {isPaused ? (
            <Play size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Pause size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </Button>
        <Button
          className="rec-bar__button"
          aria-label={t('studio.recbar.mark')}
          isDisabled={isPaused}
          onPress={() => void markPauseHere()}
        >
          <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <RadioGroup
          className="rec-bar__speed"
          orientation="horizontal"
          aria-label={t('studio.recbar.speed.label')}
          value={String(scrollFactor)}
          onChange={(value) => void setScrollSpeed(Number(value))}
        >
          {SPEED_FACTORS.map((factor) => (
            <Radio key={factor} value={String(factor)} className="rec-bar__speed-option pv-tnum">
              {formatFactor(factor)}
            </Radio>
          ))}
        </RadioGroup>
        <Button
          className="rec-bar__button rec-bar__button--stop"
          aria-label={t('studio.recbar.stop')}
          aria-describedby={STOP_HINT_ID}
          onPress={() => void stopRecordingNow()}
        >
          <Square size={14} strokeWidth={1.75} aria-hidden="true" />
          {t('studio.recbar.stop')}
        </Button>
        {isSpeedClamped && (
          <p className="rec-bar__notice" role="status">
            {t('studio.recbar.speed.clamped')}
          </p>
        )}
      </fieldset>
    </>
  );
}
