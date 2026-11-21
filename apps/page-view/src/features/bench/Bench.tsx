import { type PointerEvent, useEffect, useMemo, useRef } from 'react';
import { EmptyState } from '../empty/EmptyState';
import { formatInteger } from '../i18n';
import { useLibrary } from '../library/libraryStore';
import { layoutScreens } from '../screens/layout';
import { ScreenView } from '../screens/ScreenView';
import { useStudio } from '../shell/studioStore';
import { BenchBar } from './BenchBar';
import { GhostSlot } from './GhostSlot';
import { PermissionCard } from './PermissionCard';
import { Ruler } from './Ruler';
import './bench.css';

function usePanOnBackground(scrollerRef: React.RefObject<HTMLDivElement | null>) {
  const pan = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    left: number;
    top: number;
  } | null>(null);

  const isBackground = (event: PointerEvent<HTMLDivElement>) =>
    event.target === event.currentTarget ||
    (event.target instanceof HTMLElement && event.target.classList.contains('bench__content'));

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const scroller = scrollerRef.current;
      if (!scroller || event.button !== 0 || !isBackground(event)) return;
      pan.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
      };
      scroller.setPointerCapture(event.pointerId);
      scroller.dataset.panning = '';
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const scroller = scrollerRef.current;
      const current = pan.current;
      if (!scroller || !current || current.pointerId !== event.pointerId) return;
      scroller.scrollLeft = current.left - (event.clientX - current.startX);
      scroller.scrollTop = current.top - (event.clientY - current.startY);
    },
    onPointerEnd: (event: PointerEvent<HTMLDivElement>) => {
      const scroller = scrollerRef.current;
      if (!scroller || pan.current?.pointerId !== event.pointerId) return;
      pan.current = null;
      delete scroller.dataset.panning;
      scroller.releasePointerCapture(event.pointerId);
    },
  };
}

const PERMISSION_STATES = new Set(['missing', 'requesting', 'denied']);

export function Bench() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const screens = useStudio((state) => state.screens);
  const zoom = useStudio((state) => state.zoom);
  const bench = useStudio((state) => state.bench);
  const pageUrl = useStudio((state) => state.pageUrl);
  const access = useStudio((state) => state.access);
  const resize = useStudio((state) => state.resize);
  const activeScreenId = useStudio((state) => state.activeScreenId);

  const panHandlers = usePanOnBackground(scrollerRef);
  const layout = useMemo(() => layoutScreens(screens, zoom, bench), [screens, zoom, bench]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(() =>
      useStudio.getState().setBench({ width: scroller.clientWidth, height: scroller.clientHeight }),
    );
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const activateFocusedFrame = () =>
      setTimeout(() => {
        const focused = document.activeElement;
        if (!(focused instanceof HTMLIFrameElement)) return;
        const screenId = focused.closest<HTMLElement>('[data-screen-id]')?.dataset.screenId;
        const screen = useStudio.getState().screens.find((item) => item.id === screenId);
        if (screen) useStudio.getState().activateScreen(screen.id);
      });
    window.addEventListener('blur', activateFocusedFrame);
    return () => window.removeEventListener('blur', activateFocusedFrame);
  }, []);

  const resizingIndex = resize ? screens.findIndex((screen) => screen.id === resize.screenId) : -1;
  const resizingScreen = screens[resizingIndex];
  const resizingBox = layout.boxes[resizingIndex];
  const contentTop = contentRef.current?.getBoundingClientRect().top ?? 0;
  const isWelcomeOpen = useLibrary((state) => state.isWelcomeOpen);
  const showsPermission = pageUrl !== null && PERMISSION_STATES.has(access) && !isWelcomeOpen;

  return (
    <main
      className="bench"
      data-resizing={resize ? '' : undefined}
      data-empty={!pageUrl || undefined}
    >
      {pageUrl && <BenchBar />}
      <div
        ref={scrollerRef}
        className="bench__scroller"
        onPointerDown={panHandlers.onPointerDown}
        onPointerMove={panHandlers.onPointerMove}
        onPointerUp={panHandlers.onPointerEnd}
        onPointerCancel={panHandlers.onPointerEnd}
      >
        <div
          ref={contentRef}
          className="bench__content"
          style={{ width: layout.contentWidth, height: layout.contentHeight }}
        >
          {pageUrl && (
            <Ruler
              screens={screens}
              boxes={layout.boxes}
              zoom={zoom}
              width={layout.contentWidth}
              activeScreenId={activeScreenId}
              resize={resize}
            />
          )}
          {pageUrl &&
            screens.map((screen, index) => {
              const box = layout.boxes[index];
              return box ? (
                <ScreenView key={screen.id} screen={screen} index={index} box={box} zoom={zoom} />
              ) : null;
            })}
          {pageUrl && <GhostSlot slot={layout.slot} isEmpty={screens.length === 0} />}
          {resizingScreen && resizingBox && resize && (
            <div
              className="bench__guide"
              style={{ left: resizingBox.x + resizingBox.scaledWidth }}
              aria-hidden="true"
            >
              <span
                className="bench__guide-cota pv-cut pv-tnum"
                data-snapped={resize.snappedTo !== null || undefined}
                style={{ top: Math.max(32, (resize.pointerClientY ?? 0) - contentTop - 12) }}
              >
                {formatInteger(resizingScreen.width)} px
              </span>
            </div>
          )}
        </div>
      </div>
      <BenchCorners />
      {!pageUrl && <EmptyState />}
      {showsPermission && <PermissionCard />}
    </main>
  );
}

function BenchCorners() {
  const corners = ['tl', 'tr', 'br', 'bl'] as const;
  return (
    <div className="bench__corners" aria-hidden="true">
      {corners.map((corner) => (
        <svg
          key={corner}
          className={`bench__corner bench__corner--${corner}`}
          viewBox="0 0 96 96"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0 64L64 0M0 96L96 0M0 32L32 0" />
        </svg>
      ))}
    </div>
  );
}
