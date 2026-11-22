import type { CSSProperties } from 'react';
import { useFramed } from './framedStore';
import { canRotateFrame, FRAME_KINDS, getFrameAsset, getFrameSpec, toFrameKind } from './frames';
import { rotateScreenClockwise } from './framing/layout';
import './framed.css';
import type { ScreenKind } from '../screens/presets';

type FramePreviewProps = {
  screenKind: ScreenKind;
  isDark: boolean;
  isLandscape: boolean;
  viewportWidth: number;
};

type FrameKindInput = { screenKind: ScreenKind; chosen: string | null };

const resolveKind = ({ screenKind, chosen }: FrameKindInput) =>
  FRAME_KINDS.find((item) => item === chosen) ?? toFrameKind(screenKind);

export function measureFramePreview(
  { screenKind, isLandscape, viewportWidth }: Omit<FramePreviewProps, 'isDark'>,
  chosen: string | null,
) {
  const kind = resolveKind({ screenKind, chosen });
  const spec = getFrameSpec(kind);
  const isRotated = canRotateFrame(kind) && isLandscape !== spec.width > spec.height;
  const screenRect = isRotated ? rotateScreenClockwise(spec) : spec.screen;
  const scale = viewportWidth / screenRect.width;
  return {
    kind,
    spec,
    isRotated,
    scale,
    left: -screenRect.x * scale,
    top: -screenRect.y * scale,
    width: (isRotated ? spec.height : spec.width) * scale,
    height: (isRotated ? spec.width : spec.height) * scale,
  };
}

export function FramePreview({ isDark, ...props }: FramePreviewProps) {
  const chosen = useFramed((state) => state.frameDeviceId);
  const { kind, spec, isRotated, scale, left, top, width, height } = measureFramePreview(
    props,
    chosen,
  );
  const imageStyle: CSSProperties = {
    width: spec.width * scale,
    height: spec.height * scale,
    transform: isRotated ? `translateX(${width}px) rotate(90deg)` : undefined,
  };

  return (
    <div className="frame-preview" style={{ left, top, width, height }} aria-hidden="true">
      <img
        className="frame-preview__image"
        src={getFrameAsset(kind, isDark).url}
        alt=""
        style={imageStyle}
      />
    </div>
  );
}
