import { formatPx } from './env';

export interface SceneOffset {
  id: string;
  top: number;
}

export function initScrollRuler(
  getOffsets: () => SceneOffset[],
  scrollToY: (y: number) => void,
): (scrollY: number) => void {
  const ruler = document.querySelector<HTMLElement>('[data-scroll-ruler]');
  const track = ruler?.querySelector<HTMLElement>('[data-ruler-track]');
  const ticks = ruler?.querySelector<HTMLElement>('[data-ruler-ticks]');
  const readout = ruler?.querySelector<HTMLElement>('[data-ruler-readout]');
  const flags = [...(ruler?.querySelectorAll<HTMLButtonElement>('[data-ruler-flag]') ?? [])];
  if (!ruler || !track || !ticks || !readout) return () => {};

  let trackHeight = 1;
  let maxScroll = 1;
  let offsets: SceneOffset[] = [];
  let lastText = '';

  const measure = () => {
    trackHeight = track.clientHeight || 1;
    const pageHeight = document.documentElement.scrollHeight;
    maxScroll = Math.max(1, pageHeight - window.innerHeight);
    ticks.style.setProperty('--major-step', `${((trackHeight * 1000) / pageHeight).toFixed(2)}px`);
    ticks.style.setProperty('--minor-step', `${((trackHeight * 100) / pageHeight).toFixed(2)}px`);
    offsets = getOffsets();
    for (const flag of flags) {
      const offset = offsets.find((item) => item.id === flag.dataset.rulerFlag);
      if (!offset) continue;
      const y = (Math.min(offset.top, maxScroll) / maxScroll) * trackHeight;
      flag.style.setProperty('--flag-y', `${y.toFixed(1)}px`);
    }
  };

  for (const flag of flags) {
    flag.addEventListener('click', () => {
      const offset = offsets.find((item) => item.id === flag.dataset.rulerFlag);
      if (offset) scrollToY(offset.top);
    });
  }

  new ResizeObserver(measure).observe(document.body);
  measure();

  return (scrollY: number) => {
    const y = (Math.min(scrollY, maxScroll) / maxScroll) * (trackHeight - 64);
    readout.style.setProperty('--readout-y', `${y.toFixed(1)}px`);
    const text = formatPx(scrollY);
    if (text !== lastText) {
      readout.textContent = text;
      lastText = text;
    }
    const probe = scrollY + window.innerHeight * 0.4;
    let currentId = '';
    for (const offset of offsets) if (offset.top <= probe) currentId = offset.id;
    for (const flag of flags)
      flag.classList.toggle('is-current', flag.dataset.rulerFlag === currentId);
  };
}
