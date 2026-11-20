import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { canUseWebGl, isMotion } from './env';
import { initLanguageMenus } from './languageMenu';
import { initScrollRuler } from './scrollRuler';
import { initMotionStage, initStaticStage, type StageHandle } from './stage/stage';
import { initStoreCta } from './storeCta';
import { initWireButtons } from './wireButtons';

gsap.registerPlugin(ScrollTrigger);

function preserveScrollOnLanguageSwitch(): void {
  const key = 'pv-scroll-ratio';
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      sessionStorage.removeItem(key);
      const ratio = Number(stored);
      requestAnimationFrame(() => {
        window.scrollTo(0, ratio * (document.documentElement.scrollHeight - window.innerHeight));
      });
    }
  } catch {}
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]')) {
    link.addEventListener('click', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      try {
        sessionStorage.setItem(key, String(maxScroll > 0 ? window.scrollY / maxScroll : 0));
      } catch {}
    });
  }
}

function loadGlAfterFirstPaint(stage: StageHandle): void {
  if (!canUseWebGl()) return;
  const canvas = document.querySelector<HTMLCanvasElement>('[data-gl]');
  if (!canvas) return;
  const start = async () => {
    const { createGlStage } = await import('./gl/glStage');
    document.documentElement.classList.add('has-gl');
    const gl = createGlStage(canvas);
    if (!gl) {
      document.documentElement.classList.remove('has-gl');
      return;
    }
    stage.attachGl(gl, canvas);
    requestAnimationFrame(() => document.documentElement.classList.add('gl-ready'));
  };
  const schedule = () => {
    if ('requestIdleCallback' in window)
      window.requestIdleCallback(() => void start(), { timeout: 1500 });
    else setTimeout(() => void start(), 300);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}

function initMotion(journey: HTMLElement): void {
  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  const stage = initMotionStage(journey);
  const updateRuler = initScrollRuler(stage.getSceneOffsets, (y) => lenis.scrollTo(y));
  lenis.on('scroll', () => {
    ScrollTrigger.update();
    updateRuler(lenis.scroll);
  });
  updateRuler(window.scrollY);
  loadGlAfterFirstPaint(stage);
}

function boot(): void {
  initStoreCta();
  initWireButtons();
  initLanguageMenus();
  preserveScrollOnLanguageSwitch();
  const journey = document.querySelector<HTMLElement>('[data-journey]');
  if (!journey) return;
  if (isMotion) initMotion(journey);
  else initStaticStage(journey);
}

boot();
