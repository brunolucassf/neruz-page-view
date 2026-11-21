import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { FornoCopy } from '../../i18n/types';
import { clamp, formatPx, isDesktopPointer, lerp, locale, rampProgress } from '../env';
import type { BenchState, GlStage, StripState } from '../gl/glStage';
import { createSpring, snapSpring, stepSpring } from '../spring';
import { createComparator } from './comparator';
import { drawHorizontalRuler } from './horizontalRuler';
import {
  drawFornoPrint,
  type FornoPrint,
  PRINT_HEIGHT_ESTIMATE,
  PRINT_WIDTH,
  paintPrintTargets,
} from './printCanvas';
import { type CrossReading, createScenes } from './scenes';
import {
  SYMBOL_VIEWPORT_BOX,
  SYMBOL_WINDOW_BOX,
  symbolViewportPath,
  symbolWindowPath,
} from './symbolPaths';

gsap.registerPlugin(ScrollTrigger, CustomEase);
const cutEase = CustomEase.create('cut', 'M0,0 C0.7,0 0.2,1 1,1');
const easeInOut = gsap.parseEase('power2.inOut');
const easeOut = gsap.parseEase('expo.out');

const MIN_WIDTH = 320;
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const MOBILE_MAX_WIDTH = 1280;
const BREAKPOINTS = [480, 720, 1024];
const IDLE_MS = 1200;
const BAR_HEIGHT = 32;
const BACKGROUND_STEPS = ['#1B2635', '#E8EEF4', '#C4532D'];
const STRIP_RADIUS = 26;
const SITE_VARIANT_WIDTHS = [320, 390, 480, 600, 720, 880, 1024, 1152, 1280];
const HANDLE_OFFSET = 22;
const HANDLE_HALF_HEIGHT = 32;
const HANDLE_WIDTH = 44;
const WIDE_VIEWPORT = 1024;
const TRACKS = {
  wide: { click: 210, dwell: 45, devices: 130, hold: 25, auto: 190 },
  compact: { click: 170, dwell: 40, devices: 120, hold: 20, auto: 170 },
};

interface SiteVariant {
  width: number;
  element: HTMLElement;
  flipTargets: HTMLElement[];
}

function currentTrack() {
  const track = window.innerWidth >= WIDE_VIEWPORT ? TRACKS.wide : TRACKS.compact;
  return { ...track, total: track.click + track.dwell + track.devices + track.hold + track.auto };
}

function buildSiteVariants(source: HTMLElement): SiteVariant[] {
  const parent = source.parentElement as HTMLElement;
  const variants = SITE_VARIANT_WIDTHS.map((width) => {
    const element = source.cloneNode(true) as HTMLElement;
    element.removeAttribute('data-window-site');
    element.style.width = `${width}px`;
    element.style.visibility = 'hidden';
    parent.append(element);
    return {
      width,
      element,
      flipTargets: [...element.querySelectorAll<HTMLElement>('[data-flip]')],
    };
  });
  source.remove();
  return variants;
}

function variantIndexFor(variants: SiteVariant[], virtualWidth: number): number {
  let index = 0;
  variants.forEach((variant, position) => {
    if (virtualWidth >= variant.width) index = position;
  });
  return index;
}

function sizeVariant(variant: SiteVariant, hostHeight: number, scale: number): void {
  setStyleIfChanged(variant.element, 'height', `${(hostHeight / scale).toFixed(1)}px`);
  setStyleIfChanged(variant.element, 'transform', `scale(${scale.toFixed(4)})`);
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  stageWidth: number;
  stageHeight: number;
  left: number;
  available: number;
  isTrueScale: boolean;
  maxWidth: number;
  rulerY: number;
  cotaY: number;
  windowTop: number;
  windowHeight: number;
  windowCut: number;
  phone: Rect;
  pageTarget: Rect;
  symbolSize: number;
  symbolX: number;
  symbolY: number;
  textBottom: number;
  track: ReturnType<typeof currentTrack>;
}

function lerpRect(from: Rect, to: Rect, amount: number): Rect {
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
    w: lerp(from.w, to.w, amount),
    h: lerp(from.h, to.h, amount),
  };
}

function relativeRect(element: Element, origin: DOMRect): Rect {
  const rect = element.getBoundingClientRect();
  return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
}

function fitAspect(slot: Rect, aspect: number): Rect {
  let height = slot.h;
  let width = height * aspect;
  if (width > slot.w) {
    width = slot.w;
    height = width / aspect;
  }
  return {
    x: slot.x + (slot.w - width) / 2,
    y: slot.y + (slot.h - height) / 2,
    w: width,
    h: height,
  };
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`stage: ${selector}`);
  return element;
}

function setStyleIfChanged(
  element: HTMLElement | SVGElement,
  property: string,
  value: string,
): void {
  if (element.style.getPropertyValue(property) !== value)
    element.style.setProperty(property, value);
}

function bucketOf(width: number): number {
  return BREAKPOINTS.filter((breakpoint) => width >= breakpoint).length;
}

function readFornoCopy(journey: HTMLElement): FornoCopy {
  return JSON.parse(journey.dataset.forno ?? '{}') as FornoCopy;
}

function markPressedSwatch(swatches: HTMLElement[], activeIndex: number): void {
  swatches.forEach((swatch, index) => {
    const pressed = index === activeIndex ? 'true' : 'false';
    if (swatch.getAttribute('aria-pressed') !== pressed)
      swatch.setAttribute('aria-pressed', pressed);
  });
}

function onSwatchChoice(swatches: HTMLElement[], choose: (index: number) => void): void {
  for (const swatch of swatches) {
    swatch.addEventListener('click', () => choose(Number(swatch.dataset.swatch)));
  }
}

export interface StageHandle {
  attachGl(gl: GlStage, canvas: HTMLCanvasElement): void;
  getSceneOffsets(): { id: string; top: number }[];
}

interface StageElements {
  journey: HTMLElement;
  stage: HTMLElement;
  windowEl: HTMLElement;
  windowSite: HTMLElement;
  windowBar: HTMLElement;
  windowScan: HTMLElement;
  handle: HTMLElement;
  detached: HTMLElement;
  detachedSite: HTMLElement;
  cota: HTMLElement;
  cotaValue: HTMLElement;
  ruler: HTMLElement;
  rulerCanvas: HTMLCanvasElement;
  flags: HTMLElement[];
  phoneSlot: HTMLElement;
  studio: HTMLElement;
  media: HTMLElement;
  compare: HTMLElement;
  compareBg: HTMLElement;
  compareFrame: HTMLElement;
  pageCanvas: HTMLCanvasElement;
  beforeCanvas: HTMLCanvasElement;
  clickText: HTMLElement;
  strip2d: HTMLCanvasElement;
  swatches: HTMLElement[];
  crossCursor: HTMLElement | null;
  crossLabel: HTMLElement | null;
}

function collectElements(journey: HTMLElement): StageElements {
  const stage = query<HTMLElement>(journey, '[data-stage]');
  return {
    journey,
    stage,
    windowEl: query(stage, '[data-window]'),
    windowSite: query(stage, '[data-window-site]'),
    windowBar: query(stage, '[data-window-bar]'),
    windowScan: query(stage, '[data-window-scan]'),
    handle: query(stage, '[data-window-handle]'),
    detached: query(stage, '[data-detached]'),
    detachedSite: query(stage, '[data-detached-site]'),
    cota: query(stage, '[data-cota]'),
    cotaValue: query(stage, '[data-cota-value]'),
    ruler: query(stage, '[data-hruler]'),
    rulerCanvas: query(stage, '[data-hruler-canvas]'),
    flags: [...stage.querySelectorAll<HTMLElement>('[data-bp]')],
    phoneSlot: query(stage, '[data-phone-slot]'),
    studio: query(stage, '[data-studio]'),
    media: query(stage, '[data-media]'),
    compare: query(stage, '[data-compare]'),
    compareBg: query(stage, '[data-compare-bg]'),
    compareFrame: query(stage, '[data-compare-frame]'),
    pageCanvas: query(stage, '[data-print-after]'),
    beforeCanvas: query(stage, '[data-print-before]'),
    clickText: query(stage, '[data-click-text]'),
    strip2d: query(stage, '[data-strip2d]'),
    swatches: [...stage.querySelectorAll<HTMLButtonElement>('[data-swatch]')],
    crossCursor: document.querySelector<HTMLElement>('[data-cross-cursor]'),
    crossLabel: document.querySelector<HTMLElement>('[data-cross-label]'),
  };
}

async function preparePrint(elements: StageElements, forno: FornoCopy): Promise<FornoPrint> {
  await Promise.allSettled([
    document.fonts.load('600 36px "Sora"'),
    document.fonts.load('700 19px "Sora"'),
    document.fonts.load('400 15px "Inter"'),
    document.fonts.load('600 15px "Inter"'),
  ]);
  const print = drawFornoPrint(forno);
  paintPrintTargets(print, elements.beforeCanvas, elements.pageCanvas);
  return print;
}

function applyFlip(targets: HTMLElement[], before: DOMRect[], scale: number): void {
  targets.forEach((target, index) => {
    const after = target.getBoundingClientRect();
    const deltaX = (before[index].left - after.left) / scale;
    const deltaY = (before[index].top - after.top) / scale;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    gsap.fromTo(
      target,
      { x: deltaX, y: deltaY },
      { x: 0, y: 0, duration: 0.36, ease: 'power2.inOut', overwrite: true },
    );
  });
}

function sizeSite(
  site: HTMLElement,
  virtualWidth: number,
  hostHeight: number,
  scale: number,
): void {
  setStyleIfChanged(site, 'width', `${virtualWidth.toFixed(1)}px`);
  setStyleIfChanged(site, 'height', `${(hostHeight / scale).toFixed(1)}px`);
  setStyleIfChanged(site, 'transform', `scale(${scale.toFixed(4)})`);
}

export function initMotionStage(journey: HTMLElement): StageHandle {
  const elements = collectElements(journey);
  const { stage } = elements;
  const root = document.documentElement;
  const forno = readFornoCopy(journey);
  const comparator = createComparator(elements.compare);
  comparator.setLive(false);
  const siteTemplate = elements.detachedSite.firstElementChild as HTMLElement;
  const variants = buildSiteVariants(elements.windowSite);
  const scenes = createScenes(journey, siteTemplate);
  const studioCursor = elements.studio.querySelector<SVGGElement>('[data-studio-cursor]');
  const studioPanel = elements.studio.querySelector<SVGGElement>('[data-studio-panel]');
  const studioIconHover = elements.studio.querySelector<SVGRectElement>('[data-studio-icon-hover]');
  const studioCapture = elements.studio.querySelector<SVGGElement>('[data-studio-capture]');
  const studioCaptureFill = elements.studio.querySelector<SVGPathElement>(
    '[data-studio-capture-fill]',
  );
  const introRoot = stage.querySelector<HTMLElement>('[data-intro]');
  const introStrokes = [
    stage.querySelector<SVGPathElement>('[data-intro-stroke-window]'),
    stage.querySelector<SVGPathElement>('[data-intro-stroke-viewport]'),
  ];
  const introFills = [
    stage.querySelector<SVGPathElement>('[data-intro-fill-window]'),
    stage.querySelector<SVGPathElement>('[data-intro-fill-viewport]'),
  ];
  const skipButton = stage.querySelector<HTMLButtonElement>('[data-intro-skip]');

  let layout = measure();
  const widthSpring = createSpring(layout.isTrueScale ? layout.maxWidth * 0.78 : MIN_WIDTH);
  const tiltSpring = createSpring(0);
  const cursorX = createSpring(0);
  const cursorY = createSpring(0);
  const detach = { value: 0, target: 0 };
  const intro = { stroke: 0, cut: 0, fill: 0, mix: 1, isRunning: false };
  const journeyState = { progress: 0 };
  const pointer = { x: -1, y: -1, lastMove: performance.now(), isInside: false };
  let isDragging = false;
  let hasUserDragged = false;
  let isStageVisible = true;
  let activeVariant = variantIndexFor(variants, widthSpring.value);
  variants[activeVariant].element.style.visibility = 'visible';
  let previousRulerKey = '';
  let previousCotaValue = -1;
  let previousActiveFlag = -1;
  let gl: GlStage | null = null;
  let glCanvas: HTMLCanvasElement | null = null;
  let pageLength = PRINT_HEIGHT_ESTIMATE;
  let printReady = false;
  let isCompareLive = false;
  let hasStripCanvas = false;
  let printCanvasForGl: HTMLCanvasElement | null = null;
  let chosenBackground: number | null = null;
  onSwatchChoice(elements.swatches, (index) => {
    chosenBackground = index;
  });

  function measure(): Layout {
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const rem = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
    const gutter = clamp(window.innerWidth * 0.05, 20, 80);
    const available = Math.min(stageWidth - gutter * 2, 80 * rem);
    const left = (stageWidth - available) / 2;
    const isTrueScale = available >= 1024;
    const isCompact = stageWidth < 768;
    const rulerY = isCompact ? 16 : 28;
    const cotaY = rulerY + 30;
    const windowTop = cotaY + 30;
    const windowHeight = stageHeight - windowTop - (isCompact ? 96 : 56);
    const windowCut = clamp(window.innerWidth * 0.02, 16, 32);
    const origin = stage.getBoundingClientRect();
    const phone = fitAspect(relativeRect(elements.phoneSlot, origin), PHONE_WIDTH / PHONE_HEIGHT);
    const pageTarget = relativeRect(elements.pageCanvas, origin);
    const textRect = relativeRect(elements.clickText, origin);
    const symbolSize = isCompact ? 112 : clamp(windowHeight * 0.36, 140, 260);
    return {
      stageWidth,
      stageHeight,
      left,
      available,
      isTrueScale,
      maxWidth: isTrueScale ? available : Math.max(MOBILE_MAX_WIDTH, available),
      rulerY,
      cotaY,
      windowTop,
      windowHeight,
      windowCut,
      phone,
      pageTarget,
      symbolSize,
      symbolX: isCompact ? left + (available - symbolSize) / 2 : left + available * 0.58,
      symbolY: windowTop + (isCompact ? 8 : 24),
      textBottom: stageWidth >= 1024 ? 0 : textRect.y + textRect.h,
      track: currentTrack(),
    };
  }

  function displayWidthFor(virtualWidth: number): number {
    if (layout.isTrueScale) return virtualWidth;
    const amount = (virtualWidth - MIN_WIDTH) / (layout.maxWidth - MIN_WIDTH);
    return lerp(layout.available * 0.55, layout.available, clamp(amount, 0, 1));
  }

  function virtualWidthFromEdge(edgeX: number): number {
    const display = edgeX - layout.left;
    if (layout.isTrueScale) return clamp(display, MIN_WIDTH, layout.maxWidth);
    const minDisplay = layout.available * 0.55;
    const amount = clamp((display - minDisplay) / (layout.available - minDisplay), 0, 1);
    return lerp(MIN_WIDTH, layout.maxWidth, amount);
  }

  function heroRect(virtualWidth: number): Rect {
    return {
      x: layout.left,
      y: layout.windowTop,
      w: displayWidthFor(virtualWidth),
      h: layout.windowHeight,
    };
  }

  function detachedRect(windowRect: Rect): Rect {
    const height = windowRect.h * 0.62;
    const width = (height * PHONE_WIDTH) / PHONE_HEIGHT;
    const x = Math.min(
      windowRect.x + windowRect.w - width * 0.55,
      layout.left + layout.available - width,
    );
    return { x, y: windowRect.y + windowRect.h - height * 0.9, w: width, h: height };
  }

  function symbolRect(box: { x: number; y: number; w: number; h: number }): Rect {
    const unit = layout.symbolSize / 128;
    return {
      x: layout.symbolX + box.x * unit,
      y: layout.symbolY + box.y * unit,
      w: box.w * unit,
      h: box.h * unit,
    };
  }

  function stageClientLeft(): number {
    return stage.getBoundingClientRect().left;
  }

  function renderIntroSymbol(): void {
    if (!introRoot) return;
    const scale = layout.symbolSize / 128;
    setStyleIfChanged(
      introRoot,
      'transform',
      `translate3d(${layout.symbolX.toFixed(1)}px, ${layout.symbolY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`,
    );
    const cut = intro.cut * 8;
    const windowPath = symbolWindowPath(cut);
    const viewportPath = symbolViewportPath(cut);
    introStrokes[0]?.setAttribute('d', windowPath);
    introStrokes[1]?.setAttribute('d', viewportPath);
    introFills[0]?.setAttribute('d', windowPath);
    introFills[1]?.setAttribute('d', viewportPath);
    introStrokes.forEach((stroke, index) => {
      const delayed = clamp(intro.stroke * 1.15 - index * 0.15, 0, 1);
      if (stroke) setStyleIfChanged(stroke, 'stroke-dashoffset', (1 - delayed).toFixed(3));
    });
    for (const fill of introFills) {
      if (fill) setStyleIfChanged(fill, 'fill-opacity', intro.fill.toFixed(3));
    }
    const symbolOpacity = 1 - rampProgress(intro.mix, 0.12, 0.32);
    setStyleIfChanged(introRoot, 'opacity', symbolOpacity.toFixed(3));
  }

  function renderStrip(progress: number, phoneRect: Rect): StripState {
    const emerge = easeOut(rampProgress(progress, 0.42, 0.52));
    const fly = easeInOut(rampProgress(progress, 0.5, 0.68));
    const unroll = easeOut(rampProgress(progress, 0.6, 0.76));
    const hasLanded = progress >= 0.76;
    const screenX = phoneRect.x + 1;
    const screenY = phoneRect.y + 1;
    const screenWidth = phoneRect.w - 2;
    const screenHeight = phoneRect.h - 2;
    const startScale = screenWidth / PRINT_WIDTH;
    const target = layout.pageTarget;
    const endScale = target.w / PRINT_WIDTH;
    const maxRise = Math.max(
      0,
      Math.min(screenHeight * 0.5, screenY - Math.max(24, layout.textBottom + 12)),
    );
    const rise = emerge * maxRise;
    const rolledAtExit = Math.max(0, pageLength - (maxRise + screenHeight) / startScale);
    const rolledWhileEmerging = Math.max(0, pageLength - (rise + screenHeight) / startScale);
    const rolled = fly > 0 ? lerp(rolledAtExit, 0, unroll) : rolledWhileEmerging;
    const arc = Math.sin(fly * Math.PI);
    return {
      isVisible: emerge > 0 && !hasLanded,
      x: lerp(screenX, target.x, fly),
      y: lerp(screenY - (fly > 0 ? maxRise : rise), target.y, fly),
      scale: lerp(startScale, endScale, fly),
      rolled,
      radius: STRIP_RADIUS,
      rotateX: arc * 0.38,
      rotateY: -arc * 0.14,
      lift: arc * 40,
      clipBottom: fly > 0 ? 1e6 : screenY + screenHeight,
      opacity: 1,
    };
  }

  function renderStrip2d(strip: StripState): void {
    const element = elements.strip2d;
    if (!hasStripCanvas) return;
    setStyleIfChanged(element, 'opacity', strip.isVisible ? '1' : '0');
    if (!strip.isVisible) return;
    setStyleIfChanged(
      element,
      'transform',
      `translate3d(${strip.x.toFixed(1)}px, ${strip.y.toFixed(1)}px, 0) scale(${strip.scale.toFixed(4)})`,
    );
    const hiddenBottom = Math.max(0, strip.rolled);
    setStyleIfChanged(element, 'clip-path', `inset(0 0 ${hiddenBottom.toFixed(1)}px 0)`);
  }

  function renderStudio(progress: number): void {
    const studioOpacity =
      rampProgress(progress, 0.2, 0.22) * (1 - rampProgress(progress, 0.37, 0.385));
    setStyleIfChanged(elements.studio, 'opacity', studioOpacity.toFixed(3));
    setStyleIfChanged(elements.studio, 'visibility', studioOpacity > 0 ? 'visible' : 'hidden');
    if (studioOpacity <= 0) return;
    if (studioPanel) setStyleIfChanged(studioPanel, 'opacity', progress >= 0.27 ? '1' : '0');
    const iconPress = progress >= 0.25 && progress < 0.28;
    if (studioIconHover) setStyleIfChanged(studioIconHover, 'opacity', iconPress ? '1' : '0');
    const toIcon = easeInOut(rampProgress(progress, 0.2, 0.25));
    const toCapture = easeInOut(rampProgress(progress, 0.28, 0.33));
    const cursorPositionX = lerp(lerp(250, 332, toIcon), 200, toCapture);
    const cursorPositionY = lerp(lerp(310, 18, toIcon), 292, toCapture);
    studioCursor?.setAttribute(
      'transform',
      `translate(${cursorPositionX.toFixed(1)} ${cursorPositionY.toFixed(1)})`,
    );
    const capturePressed = progress >= 0.34 && progress < 0.36;
    if (studioCapture)
      setStyleIfChanged(studioCapture, 'transform', capturePressed ? 'scale(0.97)' : 'scale(1)');
    studioCaptureFill?.setAttribute('fill', progress >= 0.33 ? '#5CEEFF' : '#00E5FF');
  }

  function renderCompare(progress: number, exit: number): void {
    const mediaVisible = progress >= 0.48 && exit < 1;
    setStyleIfChanged(elements.media, 'opacity', mediaVisible ? (1 - exit).toFixed(3) : '0');
    setStyleIfChanged(elements.media, 'visibility', mediaVisible ? 'visible' : 'hidden');
    const hasLanded = progress >= 0.76;
    elements.compareFrame.style.setProperty(
      '--frame-line',
      rampProgress(progress, 0.5, 0.6).toFixed(3),
    );
    elements.compareFrame.style.setProperty('--frame-fill', hasLanded ? '1' : '0');
    setStyleIfChanged(elements.pageCanvas, 'opacity', hasLanded && printReady ? '1' : '0');
    const background = rampProgress(progress, 0.76, 0.88);
    setStyleIfChanged(elements.compareBg, 'opacity', background > 0 ? '1' : '0');
    const autoIndex = Math.min(
      BACKGROUND_STEPS.length - 1,
      Math.floor(background * BACKGROUND_STEPS.length),
    );
    const stepIndex = chosenBackground ?? autoIndex;
    setStyleIfChanged(elements.compareBg, 'background-color', BACKGROUND_STEPS[stepIndex]);
    markPressedSwatch(elements.swatches, stepIndex);
    const swatchesParent = elements.swatches[0]?.parentElement;
    if (swatchesParent) {
      setStyleIfChanged(swatchesParent, 'opacity', background > 0 ? '1' : '0');
      setStyleIfChanged(swatchesParent, 'pointer-events', background > 0 ? 'auto' : 'none');
      setStyleIfChanged(swatchesParent, 'visibility', background > 0 ? 'visible' : 'hidden');
    }
    const reveal = rampProgress(progress, 0.88, 0.97);
    for (const selector of ['.compare__before', '.compare__line', '.compare__label']) {
      for (const element of elements.compare.querySelectorAll<HTMLElement>(selector)) {
        setStyleIfChanged(element, 'opacity', reveal.toFixed(3));
      }
    }
    const shouldBeLive = progress >= 0.97 && exit === 0;
    if (!shouldBeLive) comparator.setSplit(lerp(100, 50, easeInOut(reveal)));
    if (shouldBeLive !== isCompareLive) {
      isCompareLive = shouldBeLive;
      comparator.setLive(shouldBeLive);
      root.classList.toggle('is-compare-live', shouldBeLive);
    }
  }

  function renderClickText(progress: number, exit: number): void {
    if (exit > 0) {
      const exitEdge = exit * 140;
      setStyleIfChanged(
        elements.clickText,
        'clip-path',
        `polygon(${exitEdge.toFixed(1)}% 0, 100% 0, 100% 100%, ${(exitEdge - 40).toFixed(1)}% 100%)`,
      );
      return;
    }
    const reveal = cutEase(rampProgress(progress, 0.12, 0.26));
    const edge = reveal * 140;
    setStyleIfChanged(
      elements.clickText,
      'clip-path',
      reveal >= 1
        ? 'none'
        : `polygon(0 0, ${edge.toFixed(1)}% 0, ${(edge - 40).toFixed(1)}% 100%, 0 100%)`,
    );
  }

  function renderRulerAndCota(
    rect: Rect,
    virtualWidth: number,
    scale: number,
    opacity: number,
  ): void {
    const cotaOpacity = opacity.toFixed(3);
    setStyleIfChanged(elements.cota, 'opacity', cotaOpacity);
    setStyleIfChanged(elements.ruler, 'opacity', cotaOpacity);
    if (opacity <= 0) return;
    setStyleIfChanged(
      elements.cota,
      'transform',
      `translate3d(${rect.x.toFixed(1)}px, ${layout.cotaY}px, 0)`,
    );
    setStyleIfChanged(elements.cota, 'width', `${rect.w.toFixed(1)}px`);
    const roundedWidth = Math.round(virtualWidth);
    if (roundedWidth !== previousCotaValue) {
      previousCotaValue = roundedWidth;
      elements.cotaValue.textContent = formatPx(roundedWidth);
      elements.handle.setAttribute('aria-valuenow', String(roundedWidth));
      elements.handle.setAttribute('aria-valuetext', formatPx(roundedWidth));
    }
    const reachableWidth = layout.maxWidth * scale;
    const rulerWidth = Math.max(
      0,
      Math.min(layout.left + layout.available - rect.x, reachableWidth),
    );
    setStyleIfChanged(
      elements.ruler,
      'transform',
      `translate3d(${rect.x.toFixed(1)}px, ${layout.rulerY}px, 0)`,
    );
    setStyleIfChanged(elements.ruler, 'width', `${rulerWidth.toFixed(0)}px`);
    const rulerKey = `${rulerWidth.toFixed(0)}:${scale.toFixed(3)}`;
    if (rulerKey !== previousRulerKey) {
      previousRulerKey = rulerKey;
      drawHorizontalRuler(elements.rulerCanvas, { widthPx: rulerWidth, scale }, locale);
      elements.flags.forEach((flag) => {
        const breakpoint = Number(flag.dataset.bp);
        const x = breakpoint * scale;
        flag.style.setProperty('--flag-x', `translateX(${x.toFixed(1)}px)`);
        flag.style.transform = `translateX(${x.toFixed(1)}px)`;
        flag.style.visibility = x < rulerWidth - 30 ? 'visible' : 'hidden';
      });
    }
    const activeIndex = bucketOf(virtualWidth) - 1;
    if (activeIndex !== previousActiveFlag) {
      elements.flags.forEach((flag, index) => {
        flag.classList.toggle('is-active', index === activeIndex);
        flag.classList.remove('is-tick');
      });
      const activeFlag = elements.flags[activeIndex];
      if (activeFlag && previousActiveFlag !== -1) {
        void activeFlag.offsetWidth;
        activeFlag.classList.add('is-tick');
      }
      previousActiveFlag = activeIndex;
    }
  }

  function renderCrossCursor(
    rect: Rect,
    scale: number,
    compress: number,
    deltaSeconds: number,
    deviceReading: CrossReading | null,
    isHeroPhase: boolean,
  ): void {
    const { crossCursor, crossLabel } = elements;
    if (!crossCursor || !crossLabel || !isDesktopPointer()) return;
    const isActive =
      pointer.isInside &&
      !isDragging &&
      (deviceReading !== null || (isHeroPhase && compress < 0.08));
    crossCursor.classList.toggle('is-active', isActive);
    if (!isActive) return;
    cursorX.target = pointer.x;
    cursorY.target = pointer.y;
    stepSpring(cursorX, deltaSeconds);
    stepSpring(cursorY, deltaSeconds);
    setStyleIfChanged(
      crossCursor,
      'transform',
      `translate3d(${cursorX.value.toFixed(1)}px, ${cursorY.value.toFixed(1)}px, 0)`,
    );
    const measured = Math.round((pointer.x - stageClientLeft() - rect.x) / scale);
    crossLabel.textContent = deviceReading ? deviceReading.label : `x ${measured}`;
  }

  function render(_time: number, deltaMs: number): void {
    if (!isStageVisible) return;
    const deltaSeconds = deltaMs / 1000;
    const units = journeyState.progress * layout.track.total;
    const { click, dwell, devices, hold, auto } = layout.track;
    const progress = clamp(units / click, 0, 1);
    const devicesProgress = clamp((units - click - dwell) / devices, 0, 1);
    const autoProgress = clamp((units - click - dwell - devices - hold) / auto, 0, 1);
    const mediaExit = rampProgress(devicesProgress, 0, 0.12);
    const textExit = cutEase(rampProgress(devicesProgress, 0, 0.1));
    const compress = easeInOut(rampProgress(progress, 0, 0.2));

    if (!layout.isTrueScale && !hasUserDragged && !isDragging) {
      const widenRange = journey.offsetTop + window.innerHeight * 0.4;
      const widen = clamp(window.scrollY / Math.max(widenRange, 1), 0, 1);
      widthSpring.target = lerp(MIN_WIDTH, layout.maxWidth, easeInOut(widen));
    }
    stepSpring(widthSpring, deltaSeconds);
    stepSpring(tiltSpring, deltaSeconds);

    const heroWidth = widthSpring.value;
    const virtualWidth = lerp(heroWidth, PHONE_WIDTH, compress);
    let windowRect = lerpRect(heroRect(heroWidth), layout.phone, compress);
    if (intro.mix < 1) windowRect = lerpRect(symbolRect(SYMBOL_WINDOW_BOX), windowRect, intro.mix);

    const barHeight = BAR_HEIGHT * (1 - compress);
    const innerWidth = Math.max(windowRect.w - 2, 1);
    const scale = innerWidth / virtualWidth;
    const hostHeight = Math.max(windowRect.h - 2 - barHeight, 1);

    const nextVariant = variantIndexFor(variants, virtualWidth);
    const hasVariantChanged = nextVariant !== activeVariant;
    const shouldFlip = hasVariantChanged && compress < 0.5 && intro.mix >= 1;
    const flipBefore = shouldFlip
      ? variants[activeVariant].flipTargets.map((target) => target.getBoundingClientRect())
      : [];
    const previousVariant = activeVariant;
    activeVariant = nextVariant;

    const { windowEl } = elements;
    setStyleIfChanged(windowEl, 'width', `${windowRect.w.toFixed(1)}px`);
    setStyleIfChanged(windowEl, 'height', `${windowRect.h.toFixed(1)}px`);
    const tilt = tiltSpring.value * (1 - compress);
    setStyleIfChanged(
      windowEl,
      'transform',
      `translate3d(${windowRect.x.toFixed(1)}px, ${windowRect.y.toFixed(1)}px, 0) perspective(1800px) rotateX(${tilt.toFixed(3)}deg)`,
    );
    windowEl.style.setProperty('--cut', `${lerp(layout.windowCut, 16, compress).toFixed(1)}px`);
    windowEl.style.setProperty('--cut-br', `${(compress * 16).toFixed(1)}px`);
    windowEl.style.setProperty('--bar-h', `${barHeight.toFixed(1)}px`);
    const phoneFade = rampProgress(progress, 0.52, 0.66);
    const introOpacity = intro.mix < 1 ? rampProgress(intro.mix, 0, 0.22) : 1;
    const isPhoneBesideMedia = layout.stageWidth >= 768;
    windowEl.style.setProperty(
      '--phone-dim',
      (isPhoneBesideMedia ? phoneFade * 0.62 : 0).toFixed(3),
    );
    const windowOpacity = introOpacity * (isPhoneBesideMedia ? 1 : 1 - phoneFade) * (1 - mediaExit);
    setStyleIfChanged(windowEl, 'opacity', windowOpacity.toFixed(3));
    const siteVariant = variants[activeVariant];
    const contentScale = innerWidth / siteVariant.width;
    if (hasVariantChanged) {
      variants[previousVariant].element.style.visibility = 'hidden';
      siteVariant.element.style.visibility = 'visible';
    }
    sizeVariant(siteVariant, hostHeight, contentScale);
    if (shouldFlip) applyFlip(siteVariant.flipTargets, flipBefore, contentScale);
    setStyleIfChanged(elements.handle, 'visibility', compress > 0.05 ? 'hidden' : 'visible');
    setStyleIfChanged(
      elements.handle,
      'transform',
      `translate3d(${Math.min(windowRect.x + windowRect.w - HANDLE_OFFSET, layout.stageWidth - HANDLE_WIDTH).toFixed(1)}px, ${(windowRect.y + windowRect.h / 2 - HANDLE_HALF_HEIGHT).toFixed(1)}px, 0)`,
    );

    const scan = rampProgress(progress, 0.36, 0.42);
    setStyleIfChanged(elements.windowScan, 'opacity', scan > 0 && scan < 1 ? '1' : '0');
    setStyleIfChanged(
      elements.windowScan,
      'transform',
      `translateY(${(barHeight + scan * hostHeight).toFixed(1)}px)`,
    );

    const rulerOpacity =
      (1 - clamp(compress * 4, 0, 1)) * (intro.mix < 1 ? rampProgress(intro.mix, 0.7, 1) : 1);
    renderRulerAndCota(windowRect, virtualWidth, scale, rulerOpacity);

    const idleFor = performance.now() - pointer.lastMove;
    detach.target = layout.isTrueScale && compress <= 0 && idleFor > IDLE_MS && !isDragging ? 1 : 0;
    if (detach.target === 1 && detach.value < 1 && !gsap.isTweening(detach)) {
      gsap.to(detach, { value: 1, duration: 0.6, ease: 'expo.out' });
    } else if (detach.target === 0 && detach.value > 0 && !gsap.isTweening(detach)) {
      gsap.to(detach, { value: 0, duration: 0.2, ease: 'power2.out' });
    }
    const restingRect = detachedRect(windowRect);
    const hiddenRect = { ...restingRect, x: restingRect.x - restingRect.w * 0.5 };
    let viewportRect = lerpRect(hiddenRect, restingRect, detach.value);
    let viewportOpacity = detach.value * (1 - compress);
    let viewportScale = lerp(0.95, 1, detach.value);
    if (intro.mix < 1) {
      viewportRect = lerpRect(symbolRect(SYMBOL_VIEWPORT_BOX), restingRect, intro.mix);
      viewportOpacity = rampProgress(intro.mix, 0, 0.22);
      viewportScale = 1;
    }
    const { detached } = elements;
    setStyleIfChanged(detached, 'visibility', viewportOpacity > 0.001 ? 'visible' : 'hidden');
    setStyleIfChanged(detached, 'opacity', viewportOpacity.toFixed(3));
    if (viewportOpacity > 0.001) {
      setStyleIfChanged(detached, 'width', `${viewportRect.w.toFixed(1)}px`);
      setStyleIfChanged(detached, 'height', `${viewportRect.h.toFixed(1)}px`);
      setStyleIfChanged(
        detached,
        'transform',
        `translate3d(${viewportRect.x.toFixed(1)}px, ${viewportRect.y.toFixed(1)}px, 0) scale(${viewportScale.toFixed(3)})`,
      );
      const viewportScaleFactor = (viewportRect.w - 2) / PHONE_WIDTH;
      sizeSite(elements.detachedSite, PHONE_WIDTH, viewportRect.h - 2, viewportScaleFactor);
    }

    if (intro.isRunning) renderIntroSymbol();
    const isScenePhase = devicesProgress > 0.3 && autoProgress < 0.02 && isDesktopPointer();
    scenes.setEchoEnabled(isScenePhase);
    const deviceReading =
      isScenePhase && pointer.isInside ? scenes.readCross(pointer.x, pointer.y) : null;
    renderCrossCursor(
      windowRect,
      scale,
      compress,
      deltaSeconds,
      deviceReading,
      devicesProgress === 0,
    );
    renderClickText(progress, textExit);
    renderStudio(progress);
    const strip = renderStrip(progress, windowRect);
    renderCompare(progress, mediaExit);
    scenes.renderDevices(devicesProgress, autoProgress);
    scenes.renderAuto(autoProgress);
    const benchDim = compress * 0.55;
    stage.style.setProperty('--bench-dim', benchDim.toFixed(3));

    if (gl && glCanvas) {
      const bench: BenchState = {
        horizon: layout.windowTop - 150 + tiltSpring.value * 14,
        base: windowRect.y + windowRect.h,
        centerX: layout.stageWidth / 2,
        edgeLeft: windowRect.x,
        edgeRight: windowRect.x + windowRect.w,
        guide: (1 - compress * 0.6) * introOpacity,
        dim: benchDim,
        lamp: (1 - compress) * (intro.mix < 1 ? rampProgress(intro.mix, 0.6, 1) : 1),
      };
      gl.render(bench, strip);
    } else {
      renderStrip2d(strip);
    }
  }

  function startIntro(): void {
    if (!root.classList.contains('is-intro')) {
      intro.mix = 1;
      return;
    }
    try {
      sessionStorage.setItem('pv-intro', '1');
    } catch {}
    intro.isRunning = true;
    intro.mix = 0;
    pointer.lastMove = performance.now();
    const timeline = gsap.timeline({
      onComplete: finishIntro,
    });
    timeline
      .to(intro, { stroke: 1, duration: 0.55, ease: 'power2.out' }, 0)
      .to(intro, { cut: 1, duration: 0.3, ease: cutEase }, 0.45)
      .to(intro, { fill: 1, duration: 0.2, ease: 'power2.out' }, 0.7)
      .to(intro, { mix: 1, duration: 0.65, ease: cutEase }, 0.95);

    const skip = () => {
      if (timeline.isActive()) timeline.progress(1);
    };
    skipButton?.addEventListener('click', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('wheel', skip, { once: true, passive: true });
    window.addEventListener('touchstart', skip, { once: true, passive: true });
    stage.addEventListener('pointerdown', skip, { once: true });

    function finishIntro() {
      intro.isRunning = false;
      intro.mix = 1;
      root.classList.remove('is-intro');
      if (layout.isTrueScale) {
        detach.value = 1;
        pointer.lastMove = performance.now() - IDLE_MS - 1;
      }
    }
  }

  function setupPointer(): void {
    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType !== 'mouse') return;
        const movedEnough =
          Math.abs(event.clientX - pointer.x) + Math.abs(event.clientY - pointer.y) > 2;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        const stageRect = stage.getBoundingClientRect();
        pointer.isInside =
          event.clientY >= stageRect.top &&
          event.clientY <= stageRect.bottom &&
          event.clientX >= stageRect.left &&
          event.clientX <= stageRect.right;
        if (!movedEnough) return;
        pointer.lastMove = performance.now();
        if (!layout.isTrueScale || isDragging || journeyState.progress > 0.01) return;
        widthSpring.target = virtualWidthFromEdge(event.clientX - stageRect.left);
        tiltSpring.target = clamp((event.clientY / window.innerHeight - 0.5) * 8, -4, 4);
      },
      { passive: true },
    );
    document.addEventListener('pointerleave', () => {
      pointer.isInside = false;
    });
  }

  function setupHandle(): void {
    const { handle } = elements;
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture(event.pointerId);
      isDragging = true;
      hasUserDragged = true;
      handle.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (event) => {
      if (!isDragging) return;
      widthSpring.target = virtualWidthFromEdge(event.clientX - stageClientLeft());
      pointer.lastMove = performance.now();
    });
    const release = () => {
      isDragging = false;
      handle.classList.remove('is-dragging');
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    handle.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 100 : 10;
      const keyTargets: Record<string, number> = {
        ArrowLeft: widthSpring.target - step,
        ArrowDown: widthSpring.target - step,
        ArrowRight: widthSpring.target + step,
        ArrowUp: widthSpring.target + step,
        Home: MIN_WIDTH,
        End: layout.maxWidth,
      };
      const next = keyTargets[event.key];
      if (next === undefined) return;
      event.preventDefault();
      hasUserDragged = true;
      snapSpring(widthSpring, clamp(next, MIN_WIDTH, layout.maxWidth));
      pointer.lastMove = performance.now();
    });
  }

  function setupScroll(): void {
    gsap.to(journeyState, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: journey,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    new IntersectionObserver(([entry]) => {
      isStageVisible = entry.isIntersecting;
    }).observe(stage);
  }

  function setupResize(): void {
    let frame = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        layout = measure();
        widthSpring.target = clamp(widthSpring.target, MIN_WIDTH, layout.maxWidth);
        widthSpring.value = clamp(widthSpring.value, MIN_WIDTH, layout.maxWidth);
        previousRulerKey = '';
        handleAria();
        scenes.measure(layout.pageTarget);
        if (gl && glCanvas) gl.resize(layout.stageWidth, layout.stageHeight);
      });
    }).observe(stage);
  }

  function handleAria(): void {
    elements.handle.setAttribute('aria-valuemax', String(Math.round(layout.maxWidth)));
  }

  handleAria();
  scenes.measure(layout.pageTarget);
  void document.fonts.ready.then(() => {
    layout = measure();
    scenes.measure(layout.pageTarget);
  });
  setupPointer();
  setupHandle();
  setupScroll();
  setupResize();
  startIntro();
  gsap.ticker.add(render);

  void preparePrint(elements, forno).then((print) => {
    pageLength = print.height;
    printReady = true;
    const stripContext = elements.strip2d.getContext('2d');
    elements.strip2d.width = print.canvas.width;
    elements.strip2d.height = print.canvas.height;
    elements.strip2d.style.width = `${PRINT_WIDTH}px`;
    elements.strip2d.style.height = `${pageLength}px`;
    stripContext?.drawImage(print.canvas, 0, 0);
    hasStripCanvas = true;
    layout = measure();
    scenes.measure(layout.pageTarget);
    gl?.setPrint(print.canvas, pageLength);
    printCanvasForGl = print.canvas;
  });

  return {
    attachGl(nextGl, canvas) {
      gl = nextGl;
      glCanvas = canvas;
      gl.resize(layout.stageWidth, layout.stageHeight);
      if (printCanvasForGl) gl.setPrint(printCanvasForGl, pageLength);
      setStyleIfChanged(elements.strip2d, 'opacity', '0');
    },
    getSceneOffsets() {
      const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
      const trackPx = journey.offsetHeight - window.innerHeight;
      const { click, dwell, devices, hold, auto, total } = layout.track;
      const unit = trackPx / total;
      return [
        { id: 'inicio', top: 0 },
        { id: 'um-clique', top: journeyTop + unit * click * 0.24 },
        { id: 'role-uma-tela', top: journeyTop + unit * (click + dwell + devices * 0.45) },
        {
          id: 'pagina-rola-sozinha',
          top: journeyTop + unit * (click + dwell + devices + hold + auto * 0.3),
        },
      ];
    },
  };
}

export function initStaticStage(journey: HTMLElement): void {
  const elements = collectElements(journey);
  const forno = readFornoCopy(journey);
  createComparator(elements.compare).setSplit(50);
  const studioPanel = elements.studio.querySelector<SVGGElement>('[data-studio-panel]');
  if (studioPanel) studioPanel.style.opacity = '1';
  elements.studio
    .querySelector<SVGGElement>('[data-studio-cursor]')
    ?.setAttribute('transform', 'translate(200 292)');
  const scenes = createScenes(journey, elements.detachedSite.firstElementChild as HTMLElement);
  const placeScenes = () => {
    scenes.measure({ x: 0, y: 0, w: 0, h: 0 });
    scenes.renderDevices(1, 0);
    scenes.renderAuto(0.5);
    scenes.setEchoEnabled(true);
  };
  onSwatchChoice(elements.swatches, (index) => {
    elements.compareBg.style.backgroundColor = BACKGROUND_STEPS[index];
    markPressedSwatch(elements.swatches, index);
  });

  let virtualWidth = 0;
  let isDragging = false;

  const frameWidth = () =>
    elements.windowEl.parentElement?.clientWidth ?? elements.windowEl.clientWidth;
  const isTrueScale = () => frameWidth() >= 1024;
  const maxWidth = () => (isTrueScale() ? frameWidth() : MOBILE_MAX_WIDTH);

  const apply = () => {
    const available = frameWidth();
    const windowWidth = isTrueScale() ? virtualWidth : available;
    elements.windowEl.style.width = `${windowWidth}px`;
    const scale = (windowWidth - 2) / virtualWidth;
    const hostHeight = elements.windowEl.clientHeight - 2 - BAR_HEIGHT;
    sizeSite(elements.windowSite, virtualWidth, hostHeight, scale);
    elements.cota.style.width = `${windowWidth}px`;
    elements.cotaValue.textContent = formatPx(virtualWidth);
    elements.handle.setAttribute('aria-valuenow', String(Math.round(virtualWidth)));
    elements.handle.setAttribute('aria-valuetext', formatPx(virtualWidth));
    elements.handle.setAttribute('aria-valuemax', String(Math.round(maxWidth())));
    const rulerWidth = Math.min(available, maxWidth() * scale);
    drawHorizontalRuler(elements.rulerCanvas, { widthPx: rulerWidth, scale }, locale);
    elements.flags.forEach((flag, index) => {
      const x = Number(flag.dataset.bp) * scale;
      flag.style.transform = `translateX(${x.toFixed(1)}px)`;
      flag.style.visibility = x < rulerWidth - 30 ? 'visible' : 'hidden';
      flag.classList.toggle('is-active', index === bucketOf(virtualWidth) - 1);
    });
    const handleX = Math.min(
      elements.windowEl.offsetLeft + windowWidth - HANDLE_OFFSET,
      elements.stage.clientWidth - HANDLE_WIDTH,
    );
    const handleY =
      elements.windowEl.offsetTop + elements.windowEl.offsetHeight / 2 - HANDLE_HALF_HEIGHT;
    elements.handle.style.transform = `translate3d(${handleX}px, ${handleY}px, 0)`;
    const detachedWidth = elements.detached.clientWidth;
    if (detachedWidth > 0) {
      sizeSite(
        elements.detachedSite,
        PHONE_WIDTH,
        elements.detached.clientHeight - 2,
        (detachedWidth - 2) / PHONE_WIDTH,
      );
    }
  };

  const setFromPointer = (clientX: number) => {
    const rect = elements.windowEl.getBoundingClientRect();
    const available = frameWidth();
    if (isTrueScale()) {
      virtualWidth = clamp(clientX - rect.left, MIN_WIDTH, available);
    } else {
      const amount = clamp((clientX - rect.left) / available, 0, 1);
      virtualWidth = lerp(MIN_WIDTH, MOBILE_MAX_WIDTH, amount);
    }
    apply();
  };

  elements.handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    elements.handle.setPointerCapture(event.pointerId);
    isDragging = true;
    elements.handle.classList.add('is-dragging');
  });
  elements.handle.addEventListener('pointermove', (event) => {
    if (isDragging) setFromPointer(event.clientX);
  });
  const release = () => {
    isDragging = false;
    elements.handle.classList.remove('is-dragging');
  };
  elements.handle.addEventListener('pointerup', release);
  elements.handle.addEventListener('pointercancel', release);
  elements.handle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 100 : 10;
    const keyTargets: Record<string, number> = {
      ArrowLeft: virtualWidth - step,
      ArrowDown: virtualWidth - step,
      ArrowRight: virtualWidth + step,
      ArrowUp: virtualWidth + step,
      Home: MIN_WIDTH,
      End: maxWidth(),
    };
    const next = keyTargets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    virtualWidth = clamp(next, MIN_WIDTH, maxWidth());
    apply();
  });

  new ResizeObserver(() => {
    virtualWidth = virtualWidth ? clamp(virtualWidth, MIN_WIDTH, maxWidth()) : maxWidth();
    apply();
    placeScenes();
  }).observe(elements.stage);

  void document.fonts.ready.then(placeScenes);
  void preparePrint(elements, forno);
}
