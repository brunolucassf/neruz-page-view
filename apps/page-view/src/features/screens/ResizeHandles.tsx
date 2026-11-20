import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { formatInteger, t } from '../i18n';
import { type Screen, useStudio } from '../shell/studioStore';
import { snapWidth } from './layout';
import { MAX_SCREEN_SIZE, MIN_SCREEN_SIZE, SNAP_DISTANCE_PX } from './presets';

type DragAxis = 'width' | 'both';

type DragSession = {
  axis: DragAxis;
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  frame: number | null;
  lastEvent: { clientX: number; clientY: number };
};

const KEY_STEP = { normal: 1, large: 10 };

export function ResizeHandles({ screen, label }: { screen: Screen; label: string }) {
  const dragRef = useRef<DragSession | null>(null);

  const applyDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.frame = null;
    const { zoom, resize, resizeScreen, setResize } = useStudio.getState();
    const rawWidth = drag.startWidth + (drag.lastEvent.clientX - drag.startX) / zoom;
    const snap = snapWidth(rawWidth, Math.max(SNAP_DISTANCE_PX, SNAP_DISTANCE_PX / zoom));
    const nextHeight =
      drag.axis === 'both'
        ? drag.startHeight + (drag.lastEvent.clientY - drag.startY) / zoom
        : undefined;
    resizeScreen(screen.id, { width: snap.width, height: nextHeight });
    const isNewSnap = snap.snappedTo !== null && snap.snappedTo !== resize?.snappedTo;
    setResize({
      screenId: screen.id,
      snappedTo: snap.snappedTo,
      snapCount: (resize?.snapCount ?? 0) + (isNewSnap ? 1 : 0),
      pointerClientY: drag.lastEvent.clientY,
    });
  };

  const startDrag = (axis: DragAxis) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      axis,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: screen.width,
      startHeight: screen.height,
      frame: null,
      lastEvent: { clientX: event.clientX, clientY: event.clientY },
    };
    useStudio.getState().setResize({
      screenId: screen.id,
      snappedTo: null,
      snapCount: 0,
      pointerClientY: event.clientY,
    });
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.lastEvent = { clientX: event.clientX, clientY: event.clientY };
    drag.frame ??= requestAnimationFrame(applyDrag);
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.frame !== null) cancelAnimationFrame(drag.frame);
    dragRef.current = null;
    useStudio.getState().setResize(null);
  };

  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? KEY_STEP.large : KEY_STEP.normal;
    const deltas: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
    };
    const { resizeScreen } = useStudio.getState();
    if (event.key in deltas) {
      event.preventDefault();
      resizeScreen(screen.id, { width: screen.width + (deltas[event.key] ?? 0) });
    } else if (event.key === 'Home') {
      event.preventDefault();
      resizeScreen(screen.id, { width: MIN_SCREEN_SIZE });
    } else if (event.key === 'End') {
      event.preventDefault();
      resizeScreen(screen.id, { width: MAX_SCREEN_SIZE });
    }
  };

  const pointerHandlers = {
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  };

  return (
    <>
      <div
        className="screen__handle screen__handle--edge"
        role="slider"
        tabIndex={0}
        aria-label={`${label}: ${t('studio.library.custom.width')}`}
        aria-orientation="horizontal"
        aria-valuemin={MIN_SCREEN_SIZE}
        aria-valuemax={MAX_SCREEN_SIZE}
        aria-valuenow={screen.width}
        aria-valuetext={`${formatInteger(screen.width)} px`}
        onKeyDown={handleKey}
        onPointerDown={startDrag('width')}
        {...pointerHandlers}
      >
        <span className="screen__grip" />
      </div>
      <div
        className="screen__handle screen__handle--corner"
        aria-hidden="true"
        onPointerDown={startDrag('both')}
        {...pointerHandlers}
      />
    </>
  );
}
