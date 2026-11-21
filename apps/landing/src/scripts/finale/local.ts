import { gsap } from 'gsap';
import type { FornoCopy } from '../../i18n/types';
import { isDesktopPointer, isWide, lerp, rampProgress } from '../env';
import {
  ensureFornoPrint,
  type PrintSectionId,
  paintPrintFull,
  paintPrintSection,
} from '../stage/printCanvas';
import { diagonalReveal, query, queryAll, riseIn, setStyle, wipeFromLeft } from './dom';
import { type TrackedScene, trackScene, WIDE_QUERY } from './trackScene';

const cutEase = gsap.parseEase('power3.inOut');
const easeOut = gsap.parseEase('expo.out');
const CHAMFER = 14;
const BASE_HEIGHT_RATIO = 0.07;

const PHASES = {
  wide: {
    wipe: [0, 0.28],
    text: [0.2, 0.38],
    contour: [0.28, 0.58],
    cards: [0.45, 0.85],
  },
  compact: {
    wipe: [0, 0.06],
    text: [0.02, 0.07],
    contour: [0.1, 0.24],
    cards: [0, 0],
  },
};

function laptopPaths(width: number, height: number): Record<string, string> {
  const screenLeft = width * 0.06;
  const screenRight = width * 0.94;
  const screenBottom = height * (1 - BASE_HEIGHT_RATIO);
  const middle = width / 2;
  const cut = CHAMFER;
  const baseInset = height * BASE_HEIGHT_RATIO;
  return {
    left: `M${middle} ${screenBottom}H${screenLeft + cut}L${screenLeft} ${screenBottom - cut}V${cut}L${screenLeft + cut} 0H${middle}`,
    right: `M${middle} ${screenBottom}H${screenRight - cut}L${screenRight} ${screenBottom - cut}V${cut}L${screenRight - cut} 0H${middle}`,
    base: `M0 ${screenBottom}H${width}L${width - baseInset} ${height}H${baseInset}Z`,
  };
}

export function initLocal(section: HTMLElement): TrackedScene {
  const track = query<HTMLElement>(section, '[data-track]');
  const stage = query<HTMLElement>(section, '[data-loc-stage]');
  const light = query<HTMLElement>(section, '[data-loc-light]');
  const text = query<HTMLElement>(section, '[data-loc-text]');
  const laptop = query<HTMLElement>(section, '[data-loc-laptop]');
  const outline = query<SVGSVGElement>(section, '[data-loc-outline]');
  const lines = queryAll<SVGPathElement>(outline, '[data-loc-line]');
  const objectsBox = query<HTMLElement>(section, '[data-loc-objects]');
  const objects = queryAll<HTMLElement>(section, '[data-loc-object]');
  const cards = queryAll<HTMLElement>(section, '[data-loc-card]');
  const note = query<HTMLElement>(section, '.loc__card-note');
  const toggles = queryAll<HTMLButtonElement>(section, '[data-loc-toggle]');
  let isWideLayout = isWide(1024);
  let stageSize = { width: 0, height: 0 };
  let laptopSize = { width: 0, height: 0 };

  void ensureFornoPrint(JSON.parse(section.dataset.forno ?? '{}') as FornoCopy).then((print) => {
    for (const canvas of queryAll<HTMLCanvasElement>(section, '[data-loc-canvas]')) {
      const kind = canvas.dataset.locCanvas;
      if (kind === 'strip') paintPrintFull(print, canvas);
      else paintPrintSection(print, canvas, 'home' as PrintSectionId);
    }
  });

  function syncExpanded(): void {
    const isAlwaysOpen = !isWideLayout || !isDesktopPointer();
    toggles.forEach((toggle, index) => {
      const isOpen = isAlwaysOpen || cards[index].classList.contains('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  for (const toggle of toggles) {
    toggle.addEventListener('click', () => {
      const card = toggle.closest<HTMLElement>('[data-loc-card]');
      card?.classList.toggle('is-open');
      syncExpanded();
    });
  }

  function measure(): void {
    isWideLayout = isWide(1024);
    const stageRect = stage.getBoundingClientRect();
    stageSize = {
      width: stageRect.width,
      height: isWideLayout ? stageRect.height : Math.min(stageRect.height, window.innerHeight),
    };
    laptopSize = { width: laptop.offsetWidth, height: laptop.offsetHeight };
    const paths = laptopPaths(laptopSize.width, laptopSize.height);
    for (const line of lines) line.setAttribute('d', paths[line.dataset.locLine ?? 'base']);
    syncExpanded();
  }

  function renderLaptop(contour: number): void {
    const halves = easeOut(contour);
    const baseAmount = rampProgress(contour, 0.55, 1);
    for (const line of lines) {
      const amount = line.dataset.locLine === 'base' ? baseAmount : halves;
      setStyle(line, 'stroke-dashoffset', (1 - amount).toFixed(4));
    }
    const pullBack = easeOut(rampProgress(contour, 0, 0.85));
    setStyle(objectsBox, 'transform', `scale(${lerp(1.35, 1, pullBack).toFixed(4)})`);
    objects.forEach((object, index) => {
      riseIn(object, rampProgress(contour, 0.15 + index * 0.1, 0.6 + index * 0.1), 24);
    });
  }

  function renderCards(range: number[], progress: number): void {
    const [start, end] = range;
    cards.forEach((card, index) => {
      if (end === start) {
        setStyle(card, 'opacity', '1');
        setStyle(card, 'transform', 'none');
        return;
      }
      const from = start + ((end - start) * index) / (cards.length + 2);
      const to = from + (end - start) * 0.35;
      riseIn(card, rampProgress(progress, from, to), 20);
    });
    if (end === start) return;
    riseIn(note, rampProgress(progress, end - 0.1, end), 12);
  }

  function render(progress: number): void {
    const phases = isWideLayout ? PHASES.wide : PHASES.compact;
    const wipe = cutEase(rampProgress(progress, phases.wipe[0], phases.wipe[1]));
    wipeFromLeft(light, wipe, stageSize.width, stageSize.height);
    diagonalReveal(text, cutEase(rampProgress(progress, phases.text[0], phases.text[1])));
    renderLaptop(rampProgress(progress, phases.contour[0], phases.contour[1]));
    renderCards(phases.cards, progress);
  }

  return trackScene({
    section,
    track,
    stickyQuery: WIDE_QUERY,
    entryStart: 'top 85%',
    entryEnd: 'bottom 50%',
    measure,
    render,
  });
}
