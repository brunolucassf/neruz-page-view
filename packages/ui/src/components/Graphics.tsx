import type { ReactNode, SVGProps } from 'react';
import { joinClasses } from '../joinClasses';

type GraphicProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

const SYMBOL_OPTICAL_PATH = 'M2 3H14V6H12V5H4V11H7V13H2Z M9 7H14V14H9Z M11 9V12H12V9Z';
const OCTAGON_PATH = 'M8 2.5H16L21.5 8V16L16 21.5H8L2.5 16V8Z';

export function BrandSymbol({ size = 20, className, ...props }: GraphicProps) {
  return (
    <svg
      {...props}
      className={joinClasses('pv-brand-symbol', className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d={SYMBOL_OPTICAL_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function StrokeIcon({
  size = 16,
  className,
  children,
  ...props
}: GraphicProps & { children: ReactNode }) {
  return (
    <svg
      {...props}
      className={joinClasses('pv-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinejoin="miter"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function MirrorIcon(props: GraphicProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 5H9V19H3V7Z" />
      <path d="M19 5H15V19H21V7Z" />
      <path d="M12 3V5M12 9V11M12 15V17M12 21V21" />
    </StrokeIcon>
  );
}

export function RotateIcon(props: GraphicProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M11 8H17L19 10V21H11Z" />
      <path d="M4 16V8L7 5H12" />
      <path d="M10 3L12 5L10 7" />
    </StrokeIcon>
  );
}

export type CutMarksProps = { className?: string };

export function CutMarks({ className }: CutMarksProps) {
  const corners = ['tl', 'tr', 'br', 'bl'] as const;
  return (
    <span className={joinClasses('pv-cut-marks', className)} aria-hidden="true">
      {corners.map((corner) => (
        <svg
          key={corner}
          className={`pv-cut-mark pv-cut-mark--${corner}`}
          viewBox="0 0 10 10"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0.75 10V0.75H10" />
        </svg>
      ))}
    </span>
  );
}

export type OctagonLoaderProps = { label: string; size?: number; className?: string };

export function OctagonLoader({ label, size = 24, className }: OctagonLoaderProps) {
  return (
    <span className={joinClasses('pv-loader', className)} role="status">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="pv-loader__track" d={OCTAGON_PATH} pathLength={100} />
        <path className="pv-loader__segment" d={OCTAGON_PATH} pathLength={100} />
      </svg>
      <span className="pv-loader__label">{label}</span>
    </span>
  );
}
