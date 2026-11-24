import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp, formatPx, isDesktopPointer, isMotion } from './env';
import { query, queryAll } from './finale/dom';

gsap.registerPlugin(ScrollTrigger);

export interface FamilyHandle {
  getSceneOffsets(): { id: string; top: number }[];
}

interface WordGauge {
  render(progress: number): void;
}

interface BayState {
  bay: HTMLElement;
  lamp: HTMLElement;
  icon: HTMLElement | null;
  shadow: HTMLElement | null;
  socket: HTMLElement | null;
  moveLamp?: { x: (value: number) => void; y: (value: number) => void };
  tilt?: { x: (value: number) => void; y: (value: number) => void };
}

const cutEase = gsap.parseEase('power3.inOut');
const MAX_TILT_DEGREES = 6;
const LIFT_PIXELS = -6;
const DEFAULT_BAY_CUT = 14;
const BAY_STAGGER_SECONDS = 0.12;
const ENTRY_VIEWPORT_RATIO = 0.75;

function createWordGauge(section: HTMLElement): WordGauge {
  const measure = query<HTMLElement>(section, '[data-fam-measure]');
  const value = query<HTMLElement>(section, '[data-fam-value]');
  const end = query<HTMLElement>(section, '[data-fam-cota-end]');
  let width = measure.offsetWidth;
  let progress = 1;
  let lastText = '';

  const render = (nextProgress: number) => {
    progress = nextProgress;
    const text = formatPx(width * progress);
    if (text !== lastText) {
      value.textContent = text;
      lastText = text;
    }
    end.style.transform =
      progress >= 1 ? '' : `translate3d(${(-(1 - progress) * width).toFixed(1)}px, 0, 0)`;
  };

  const remeasure = () => {
    width = measure.offsetWidth;
    render(progress);
  };
  new ResizeObserver(remeasure).observe(measure);
  void document.fonts.ready.then(remeasure);
  render(1);
  return { render };
}

function setupWordScrub(section: HTMLElement, gauge: WordGauge): void {
  const fill = query<HTMLElement>(section, '[data-fam-fill]');
  const line = query<HTMLElement>(section, '[data-fam-cota-line]');
  const state = { progress: 0 };
  gsap
    .timeline({
      scrollTrigger: { trigger: section, start: 'top 80%', end: 'top 30%', scrub: 0.6 },
    })
    .fromTo(
      fill,
      { clipPath: 'inset(-10% 100% -10% 0%)' },
      { clipPath: 'inset(-10% -2% -10% 0%)', ease: 'none' },
      0,
    )
    .fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0)
    .fromTo(
      state,
      { progress: 0 },
      { progress: 1, ease: 'none', onUpdate: () => gauge.render(state.progress) },
      0,
    );
  gauge.render(0);
}

function buildOutlinePath(bay: HTMLElement, path: SVGPathElement): void {
  const width = bay.offsetWidth;
  const height = bay.offsetHeight;
  const measuredCut = Number.parseFloat(getComputedStyle(bay).getPropertyValue('--cut'));
  const cut = Number.isFinite(measuredCut) ? measuredCut : DEFAULT_BAY_CUT;
  const edge = 0.5;
  path.setAttribute(
    'd',
    `M${cut} ${edge}H${width - cut}L${width - edge} ${cut}V${height - cut}L${width - cut} ${height - edge}H${cut}L${edge} ${height - cut}V${cut}Z`,
  );
}

function playBayEntry(bay: HTMLElement, delay: number): void {
  const outline = query<SVGElement>(bay, '[data-fam-outline]');
  const outlinePath = query<SVGPathElement>(outline, '[data-fam-outline-path]');
  const icon = query<HTMLElement>(bay, '[data-fam-icon]');
  const flag = bay.querySelector<HTMLElement>('[data-fam-flag]');
  buildOutlinePath(bay, outlinePath);
  const timeline = gsap.timeline({
    delay,
    onComplete: () => {
      bay.classList.add('is-in');
      gsap.set([outlinePath, icon, flag], { clearProps: 'all' });
    },
  });
  timeline.fromTo(
    outlinePath,
    { strokeDashoffset: 1 },
    { strokeDashoffset: 0, duration: 0.7, ease: cutEase },
    0,
  );
  timeline.call(() => outline.classList.add('is-settled'), undefined, 0.7);
  timeline.fromTo(
    icon,
    { y: -24, scale: 0.95, opacity: 0 },
    { y: 0, scale: 1, opacity: 1, duration: 0.42, ease: 'expo.out' },
    0.55,
  );
  if (flag) {
    timeline
      .fromTo(
        flag,
        { y: -14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.26, ease: 'power3.out' },
        0.95,
      )
      .fromTo(flag, { y: -3 }, { y: 0, duration: 0.12, ease: 'power2.out' }, '>');
  }
}

function setupStackEntry(stack: HTMLElement): void {
  const bays = queryAll<HTMLElement>(stack, '[data-fam-bay]');
  let hasPlayed = false;
  ScrollTrigger.create({
    trigger: stack,
    start: 'top 70%',
    onEnter: () => {
      if (hasPlayed) return;
      if (stack.getBoundingClientRect().top > window.innerHeight * ENTRY_VIEWPORT_RATIO) return;
      hasPlayed = true;
      for (const [index, bay] of bays.entries()) playBayEntry(bay, index * BAY_STAGGER_SECONDS);
    },
  });
}

function createBayState(bay: HTMLElement): BayState {
  const icon = bay.querySelector<HTMLElement>('[data-fam-icon]');
  return {
    bay,
    lamp: query<HTMLElement>(bay, '[data-fam-lamp]'),
    icon,
    shadow: bay.querySelector<HTMLElement>('[data-fam-shadow]'),
    socket: icon?.parentElement ?? null,
  };
}

function prepareBay(state: BayState): void {
  if (state.moveLamp) return;
  state.moveLamp = {
    x: gsap.quickTo(state.lamp, 'x', { duration: 0.25, ease: 'power3.out' }),
    y: gsap.quickTo(state.lamp, 'y', { duration: 0.25, ease: 'power3.out' }),
  };
  if (!state.icon) return;
  state.tilt = {
    x: gsap.quickTo(state.icon, 'rotationX', { duration: 0.4, ease: 'power3.out' }),
    y: gsap.quickTo(state.icon, 'rotationY', { duration: 0.4, ease: 'power3.out' }),
  };
}

function liftTool(state: BayState, isLifted: boolean): void {
  const duration = isLifted ? 0.25 : 0.18;
  if (state.icon) {
    gsap.to(state.icon, {
      y: isLifted ? LIFT_PIXELS : 0,
      duration,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }
  if (state.shadow) {
    gsap.to(state.shadow, {
      y: isLifted ? 8 : 0,
      scaleY: isLifted ? 1.3 : 1,
      opacity: isLifted ? 0.6 : 0.8,
      duration,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }
}

function setupPointerLight(section: HTMLElement, stack: HTMLElement): void {
  const states = new Map<Element, BayState>(
    queryAll<HTMLElement>(stack, '[data-fam-bay]').map((bay) => [bay, createBayState(bay)]),
  );
  const crossCursor = document.querySelector<HTMLElement>('[data-cross-cursor]');
  let active: BayState | null = null;
  let lastEvent: PointerEvent | null = null;
  let frame = 0;

  const activate = (next: BayState | null) => {
    if (active) {
      active.bay.classList.remove('is-lit');
      active.tilt?.x(0);
      active.tilt?.y(0);
      liftTool(active, false);
    }
    active = next;
    if (!next) return;
    prepareBay(next);
    next.bay.classList.add('is-lit');
    liftTool(next, true);
    crossCursor?.classList.remove('is-active');
  };

  const track = (state: BayState, event: PointerEvent) => {
    const bayRect = state.bay.getBoundingClientRect();
    state.moveLamp?.x(event.clientX - (bayRect.left + bayRect.width / 2));
    state.moveLamp?.y(event.clientY - (bayRect.top + bayRect.height / 2));
    if (!state.socket || !state.tilt) return;
    const socketRect = state.socket.getBoundingClientRect();
    const offsetX =
      (event.clientX - (socketRect.left + socketRect.width / 2)) / (bayRect.width / 2);
    const offsetY =
      (event.clientY - (socketRect.top + socketRect.height / 2)) / (bayRect.height / 2);
    state.tilt.y(clamp(offsetX, -1, 1) * MAX_TILT_DEGREES);
    state.tilt.x(-clamp(offsetY, -1, 1) * MAX_TILT_DEGREES);
  };

  const flush = () => {
    frame = 0;
    if (!lastEvent) return;
    const bay = (lastEvent.target as Element).closest('[data-fam-bay]');
    const next = bay ? (states.get(bay) ?? null) : null;
    if (next !== active) activate(next);
    if (active) track(active, lastEvent);
  };

  stack.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(flush);
    },
    { passive: true },
  );
  stack.addEventListener('pointerleave', () => {
    lastEvent = null;
    activate(null);
  });
  section.addEventListener('pointerenter', () => crossCursor?.classList.remove('is-active'));
}

export function initFamily(): FamilyHandle {
  const section = document.querySelector<HTMLElement>('[data-family]');
  if (!section) return { getSceneOffsets: () => [] };
  const stack = query<HTMLElement>(section, '[data-fam-stack]');
  const gauge = createWordGauge(section);
  if (isMotion) {
    section.classList.add('is-armed');
    setupWordScrub(section, gauge);
    setupStackEntry(stack);
    if (isDesktopPointer()) setupPointerLight(section, stack);
  }
  return {
    getSceneOffsets: () => [
      {
        id: section.dataset.sceneId ?? section.id,
        top: section.getBoundingClientRect().top + window.scrollY,
      },
    ],
  };
}
