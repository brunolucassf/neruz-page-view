import { gsap } from 'gsap';
import { formatPx, lerp, rampProgress } from '../env';
import { query, setStyle } from './dom';
import { type TrackedScene, trackScene } from './trackScene';

const cutEase = gsap.parseEase('power3.inOut');
const OPEN_RANGE = [0.05, 0.7];
const MIN_WIDTH = 320;

export function initFinal(section: HTMLElement): TrackedScene {
  const track = query<HTMLElement>(section, '[data-track]');
  const rig = query<HTMLElement>(section, '[data-fin-rig]');
  const windowEl = query<HTMLElement>(section, '[data-fin-window]');
  const body = query<HTMLElement>(section, '[data-fin-body]');
  const cota = query<HTMLElement>(section, '[data-fin-cota]');
  const value = query<HTMLElement>(section, '[data-fin-value]');
  let maxWidth = 0;
  let lastValue = -1;

  function measure(): void {
    maxWidth = rig.getBoundingClientRect().width;
    setStyle(body, '--fin-body-width', `${maxWidth.toFixed(0)}px`);
  }

  function render(progress: number): void {
    const openAmount = cutEase(rampProgress(progress, OPEN_RANGE[0], OPEN_RANGE[1]));
    const startWidth = Math.min(MIN_WIDTH, maxWidth * 0.8);
    const width = lerp(startWidth, maxWidth, openAmount);
    const rounded = Math.round(width);
    const centering = ((maxWidth - width) / 2).toFixed(1);
    setStyle(windowEl, 'width', `${width.toFixed(1)}px`);
    setStyle(windowEl, 'transform', `translate3d(${centering}px, 0, 0)`);
    setStyle(cota, 'width', `${width.toFixed(1)}px`);
    setStyle(cota, 'transform', `translate3d(${centering}px, 0, 0)`);
    setStyle(body, 'translate', `${(-Number(centering)).toFixed(1)}px 0`);
    if (rounded !== lastValue) {
      lastValue = rounded;
      value.textContent = formatPx(rounded);
    }
    const contentAmount = rampProgress(openAmount, 0.12, 0.6);
    setStyle(body, 'opacity', contentAmount.toFixed(3));
    setStyle(body, 'pointer-events', contentAmount > 0.6 ? 'auto' : 'none');
  }

  return trackScene({ section, track, stickyQuery: '(min-width: 0px)', measure, render });
}
