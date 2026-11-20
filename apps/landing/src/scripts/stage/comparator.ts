import { clamp } from '../env';

export interface Comparator {
  setSplit(percent: number): void;
  setLive(isLive: boolean): void;
}

export function createComparator(root: HTMLElement): Comparator {
  const range = root.querySelector<HTMLInputElement>('[data-compare-range]');
  let isLive = true;
  let isDragging = false;

  const setSplit = (percent: number) => {
    const value = clamp(percent, 0, 100);
    root.style.setProperty('--split', `${value}%`);
    if (range) range.value = String(Math.round(value));
  };

  const splitFromPointer = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    setSplit(((event.clientX - rect.left) / rect.width) * 100);
  };

  root.addEventListener('pointermove', (event) => {
    if (!isLive) return;
    if (event.pointerType === 'mouse' || isDragging) splitFromPointer(event);
  });
  root.addEventListener('pointerdown', (event) => {
    if (!isLive) return;
    isDragging = true;
    splitFromPointer(event);
  });
  const stopDragging = () => {
    isDragging = false;
  };
  root.addEventListener('pointerup', stopDragging);
  root.addEventListener('pointercancel', stopDragging);
  range?.addEventListener('input', () => {
    setSplit(Number(range.value));
  });

  return {
    setSplit,
    setLive(nextIsLive) {
      isLive = nextIsLive;
      if (range) range.tabIndex = nextIsLive ? 0 : -1;
    },
  };
}
