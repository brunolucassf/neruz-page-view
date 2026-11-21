import { gsap } from 'gsap';
import type { FornoCopy } from '../../i18n/types';
import { clamp, isWide, lerp, rampProgress } from '../env';
import { ensureFornoPrint, type PrintSectionId, paintPrintSection } from '../stage/printCanvas';
import { diagonalReveal, query, queryAll, setStyle } from './dom';
import { type TrackedScene, trackScene } from './trackScene';

const easeInOut = gsap.parseEase('power2.inOut');
const easeOut = gsap.parseEase('expo.out');
const cutEase = gsap.parseEase('power3.inOut');

const FIRST_URL_AT = 0.05;
const URL_STEP = 0.15;
const TYPING_SPAN = 0.07;
const RUN_SPAN = 0.13;
const DROP_SPAN = 0.05;
const REPORT_AT = 0.78;
const REPORT_SPAN = 0.12;
const LINES_AT = 0.89;
const LINE_STEP = 0.025;
const LINE_SPAN = 0.04;
const FRONT_TOP_RATIO = 0.28;

interface Point {
  x: number;
  y: number;
}

interface Geometry {
  start: Point;
  stop: Point;
  cardWidth: number;
  cardHeight: number;
  dropDistance: number;
  frontTop: number;
  reportHeight: number;
  isHorizontal: boolean;
}

function centerRelative(element: Element, origin: DOMRect): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - origin.left,
    y: rect.top + rect.height / 2 - origin.top,
  };
}

export function initFold(section: HTMLElement): TrackedScene {
  const track = query<HTMLElement>(section, '[data-track]');
  const visual = query<HTMLElement>(section, '[data-fold-visual]');
  const text = query<HTMLElement>(section, '[data-fold-text]');
  const urls = queryAll<HTMLElement>(section, '[data-fold-url]');
  const pages = queryAll<HTMLElement>(section, '[data-fold-page]');
  const list = query<HTMLElement>(section, '[data-fold-list]');
  const lane = query<HTMLElement>(section, '[data-fold-lane]');
  const slot = query<HTMLElement>(section, '[data-folder-slot]');
  const folder = query<HTMLElement>(section, '[data-fold-folder]');
  const report = query<HTMLElement>(section, '[data-fold-report]');
  const reportLines = queryAll<HTMLElement>(section, '[data-fold-line]');
  const counter = query<HTMLElement>(section, '[data-fold-counter]');
  const progressBar = query<HTMLElement>(section, '[data-fold-progress]');
  const exampleTag = query<HTMLElement>(section, '.fold__tag').textContent ?? '';
  const counterTemplate = section.dataset.counter ?? '{n}/{total}';
  const total = pages.length;
  const typedLengths = urls.map(() => -1);
  let counterValue = 0;
  let geometry: Geometry = {
    start: { x: 0, y: 0 },
    stop: { x: 0, y: 0 },
    cardWidth: 0,
    cardHeight: 0,
    dropDistance: 0,
    frontTop: 0,
    reportHeight: 0,
    isHorizontal: true,
  };

  void ensureFornoPrint(JSON.parse(section.dataset.forno ?? '{}') as FornoCopy).then((print) => {
    for (const page of pages) {
      const thumb = query<HTMLCanvasElement>(page, '[data-fold-thumb]');
      paintPrintSection(print, thumb, thumb.dataset.foldThumb as PrintSectionId);
    }
  });

  function measure(): void {
    const origin = visual.getBoundingClientRect();
    const first = pages[0];
    const stopCenter = centerRelative(slot, origin);
    const listRect = list.getBoundingClientRect();
    const cardWidth = first.offsetWidth;
    const cardHeight = first.offsetHeight;
    const isHorizontal = isWide(1024);
    const listCenter = centerRelative(list, origin);
    const start = isHorizontal
      ? { x: listRect.right - origin.left + cardWidth * 0.7, y: listCenter.y }
      : { x: listCenter.x, y: listRect.bottom - origin.top + cardHeight * 0.62 };
    lane.classList.toggle('is-vertical', !isHorizontal);
    if (isHorizontal) {
      setStyle(lane, 'left', `${(start.x - cardWidth * 0.7).toFixed(1)}px`);
      setStyle(lane, 'top', `${(start.y + cardHeight * 0.5 + 6).toFixed(1)}px`);
      setStyle(lane, 'width', `${(stopCenter.x - start.x + cardWidth * 0.7).toFixed(1)}px`);
      setStyle(lane, 'height', 'auto');
    } else {
      setStyle(lane, 'left', `${(start.x + cardWidth * 0.5 + 10).toFixed(1)}px`);
      setStyle(lane, 'top', `${(start.y - cardHeight * 0.5).toFixed(1)}px`);
      setStyle(lane, 'width', 'auto');
      setStyle(lane, 'height', `${(stopCenter.y - start.y).toFixed(1)}px`);
      const laneLeft = start.x + cardWidth * 0.5 + 10;
      const laneTop = start.y - cardHeight * 0.5;
      const folderRect = folder.getBoundingClientRect();
      setStyle(lane, '--status-left', `${(origin.width / 2 - laneLeft).toFixed(1)}px`);
      setStyle(
        lane,
        '--status-top',
        `${(folderRect.bottom - origin.top + 18 - laneTop).toFixed(1)}px`,
      );
    }
    geometry = {
      start,
      stop: { x: stopCenter.x, y: stopCenter.y - cardHeight * 0.3 },
      cardWidth,
      cardHeight,
      dropDistance: cardHeight * 0.72,
      frontTop: folder.offsetHeight * FRONT_TOP_RATIO,
      reportHeight: report.offsetHeight,
      isHorizontal,
    };
  }

  function renderUrls(progress: number): void {
    urls.forEach((item, index) => {
      const full = item.dataset.text ?? '';
      const typed = clamp((progress - (FIRST_URL_AT + index * URL_STEP)) / TYPING_SPAN, 0, 1);
      const length = Math.round(typed * full.length);
      item.classList.toggle('is-typing', typed > 0 && typed < 1);
      if (length === typedLengths[index]) return;
      typedLengths[index] = length;
      const label = item.firstElementChild;
      if (label) label.textContent = full.slice(0, length);
    });
  }

  function renderPages(progress: number): number {
    let completed = 0;
    let started = 0;
    pages.forEach((page, index) => {
      const runStart = FIRST_URL_AT + index * URL_STEP + TYPING_SPAN;
      const run = rampProgress(progress, runStart, runStart + RUN_SPAN);
      const drop = rampProgress(progress, runStart + RUN_SPAN, runStart + RUN_SPAN + DROP_SPAN);
      if (progress >= runStart) started += 1;
      completed += run * 0.8 + drop * 0.2;
      const travel = easeInOut(run);
      const dropped = easeInOut(drop);
      const enter = rampProgress(run, 0, 0.2);
      const x = lerp(geometry.start.x, geometry.stop.x, travel);
      const settle = geometry.isHorizontal ? easeInOut(rampProgress(run, 0.5, 1)) : travel;
      const y = lerp(geometry.start.y, geometry.stop.y, settle) + dropped * geometry.dropDistance;
      const scale = (0.95 + enter * 0.05) * lerp(1, 0.6, dropped);
      const opacity = progress < runStart ? 0 : enter * (1 - rampProgress(drop, 0.75, 1));
      setStyle(page, 'opacity', opacity.toFixed(3));
      setStyle(
        page,
        'transform',
        `translate3d(${(x - geometry.cardWidth / 2).toFixed(1)}px, ${(y - geometry.cardHeight / 2).toFixed(1)}px, 0) scale(${scale.toFixed(4)})`,
      );
    });
    const progressRatio = completed / total;
    setStyle(progressBar, 'transform', `scaleX(${clamp(progressRatio, 0, 1).toFixed(4)})`);
    return clamp(started, 1, total);
  }

  function renderCounter(current: number): void {
    if (current === counterValue) return;
    counterValue = current;
    counter.textContent = `${counterTemplate
      .replace('{n}', String(current))
      .replace('{total}', String(total))} · ${exampleTag}`;
  }

  function renderReport(progress: number): void {
    const rise = easeOut(rampProgress(progress, REPORT_AT, REPORT_AT + REPORT_SPAN));
    const hiddenY = geometry.frontTop + 8;
    const shownY = geometry.frontTop + 26 - geometry.reportHeight;
    setStyle(report, 'transform', `translate3d(0, ${lerp(hiddenY, shownY, rise).toFixed(1)}px, 0)`);
    setStyle(report, 'opacity', rise > 0 ? '1' : '0');
    reportLines.forEach((line, index) => {
      const start = LINES_AT + index * LINE_STEP;
      const amount = rampProgress(progress, start, start + LINE_SPAN);
      setStyle(line, 'opacity', amount.toFixed(3));
      setStyle(line, 'transform', `translate3d(${((1 - amount) * -8).toFixed(1)}px, 0, 0)`);
    });
  }

  function render(progress: number): void {
    diagonalReveal(text, cutEase(rampProgress(progress, 0, 0.07)));
    renderUrls(progress);
    renderCounter(renderPages(progress));
    renderReport(progress);
  }

  return trackScene({ section, track, stickyQuery: '(min-width: 0px)', measure, render });
}
