import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isMotion } from '../env';

gsap.registerPlugin(ScrollTrigger);

export const WIDE_QUERY = '(min-width: 1024px)';

interface TrackOptions {
  section: HTMLElement;
  track?: HTMLElement;
  stickyQuery: string;
  entryStart?: string;
  entryEnd?: string;
  measure: () => void;
  render: (progress: number) => void;
}

export interface TrackedScene {
  id: string;
  getTop(): number;
}

export function trackScene(options: TrackOptions): TrackedScene {
  const { section, stickyQuery, measure, render } = options;
  const track = options.track ?? section;
  const entryStart = options.entryStart ?? 'top 85%';
  const entryEnd = options.entryEnd ?? 'top 15%';
  const id = section.dataset.sceneId ?? section.id;
  const state = { progress: isMotion ? 0 : 1 };
  let drawnProgress = -1;
  let isDirty = true;
  let isVisible = !isMotion;
  let tween: gsap.core.Tween | null = null;

  const redraw = () => {
    measure();
    drawnProgress = -1;
    isDirty = true;
    if (!isMotion) render(1);
  };

  const tick = () => {
    if (!isVisible) return;
    if (!isDirty && Math.abs(state.progress - drawnProgress) < 0.0002) return;
    isDirty = false;
    drawnProgress = state.progress;
    render(state.progress);
  };

  const buildTrigger = () => {
    tween?.scrollTrigger?.kill();
    tween?.kill();
    const isSticky = matchMedia(stickyQuery).matches;
    tween = gsap.fromTo(
      state,
      { progress: 0 },
      {
        progress: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: isSticky ? 'top top' : entryStart,
          end: isSticky ? 'bottom bottom' : entryEnd,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      },
    );
    redraw();
  };

  const watchResize = () => {
    let frame = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(redraw);
    }).observe(track);
  };

  measure();
  render(state.progress);
  watchResize();
  void document.fonts.ready.then(redraw);

  if (isMotion) {
    new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) isDirty = true;
      },
      { rootMargin: '120px 0px' },
    ).observe(section);
    matchMedia(stickyQuery).addEventListener('change', buildTrigger);
    buildTrigger();
    gsap.ticker.add(tick);
  }

  return {
    id,
    getTop: () => section.getBoundingClientRect().top + window.scrollY,
  };
}
