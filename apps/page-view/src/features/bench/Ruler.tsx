import { animateTick } from '@neruz/ui';
import { useEffect, useMemo, useRef } from 'react';
import { formatInteger } from '../i18n';
import { pickRulerScale, type ScreenBox } from '../screens/layout';
import type { ResizeSession, Screen } from '../shell/studioStore';

const RULER_HEIGHT = 24;
const LABEL_CLEARANCE = 52;
const MIN_LABELED_WIDTH = 240;
const MIN_FLAG_WIDTH = 56;

type RulerProps = {
  screens: Screen[];
  boxes: ScreenBox[];
  zoom: number;
  width: number;
  activeScreenId: string;
  resize: ResizeSession | null;
};

export function Ruler({ screens, boxes, zoom, width, activeScreenId, resize }: RulerProps) {
  return (
    <div className="ruler" style={{ width }} aria-hidden="true">
      {screens.map((screen, index) => {
        const box = boxes[index];
        if (!box) return null;
        return (
          <RulerSegment
            key={screen.id}
            screenWidth={screen.width}
            box={box}
            zoom={zoom}
            isActive={screen.id === activeScreenId}
            snapCount={resize?.screenId === screen.id ? resize.snapCount : 0}
            isSnapped={resize?.screenId === screen.id && resize.snappedTo !== null}
          />
        );
      })}
    </div>
  );
}

type RulerSegmentProps = {
  screenWidth: number;
  box: ScreenBox;
  zoom: number;
  isActive: boolean;
  snapCount: number;
  isSnapped: boolean;
};

function tickHeight(value: number) {
  if (value % 100 === 0) return 12;
  if (value % 50 === 0) return 8;
  return 4;
}

function RulerSegment({
  screenWidth,
  box,
  zoom,
  isActive,
  snapCount,
  isSnapped,
}: RulerSegmentProps) {
  const flagRef = useRef<HTMLSpanElement>(null);
  const { tickStep, labelStep } = pickRulerScale(zoom);

  const tickPath = useMemo(() => {
    const commands: string[] = [];
    for (let value = 0; value <= screenWidth; value += tickStep) {
      const x = Math.round(value * zoom) + 0.5;
      commands.push(`M${x} ${RULER_HEIGHT}V${RULER_HEIGHT - tickHeight(value)}`);
    }
    return commands.join('');
  }, [screenWidth, tickStep, zoom]);

  const labels = useMemo(() => {
    const values: number[] = [];
    if (box.scaledWidth < MIN_LABELED_WIDTH) return values;
    for (let value = 0; value <= screenWidth; value += labelStep) {
      if ((screenWidth - value) * zoom >= LABEL_CLEARANCE) values.push(value);
    }
    return values;
  }, [screenWidth, labelStep, zoom, box.scaledWidth]);

  useEffect(() => {
    if (snapCount > 0 && flagRef.current) animateTick(flagRef.current);
  }, [snapCount]);

  return (
    <div className="ruler__segment" style={{ left: box.x, width: box.scaledWidth }}>
      <svg
        className="ruler__ticks"
        width={box.scaledWidth + 1}
        height={RULER_HEIGHT}
        aria-hidden="true"
        focusable="false"
      >
        <path d={tickPath} />
      </svg>
      {labels.map((value) => (
        <span key={value} className="ruler__label pv-tnum" style={{ left: value * zoom + 3 }}>
          {formatInteger(value)}
        </span>
      ))}
      {(isActive || box.scaledWidth >= MIN_FLAG_WIDTH) && (
        <span
          ref={flagRef}
          className="ruler__flag pv-cut pv-tnum"
          data-active={isActive || undefined}
          data-snapped={isSnapped || undefined}
        >
          {formatInteger(screenWidth)}
        </span>
      )}
    </div>
  );
}
