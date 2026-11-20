export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const STAGGER_MS = 40;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateEnter(element: Element, delayMs = 0, durationMs = 200): Animation {
  const keyframes: Keyframe[] = prefersReducedMotion()
    ? [{ opacity: 0 }, { opacity: 1 }]
    : [
        { opacity: 0, transform: 'scale(0.95)' },
        { opacity: 1, transform: 'scale(1)' },
      ];
  return element.animate(keyframes, {
    duration: durationMs,
    delay: delayMs,
    easing: EASE_OUT,
    fill: 'backwards',
  });
}

export function animateExit(element: Element, durationMs = 120): Animation {
  const keyframes: Keyframe[] = prefersReducedMotion()
    ? [{ opacity: 1 }, { opacity: 0 }]
    : [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(4px) scale(0.97)' },
      ];
  return element.animate(keyframes, { duration: durationMs, easing: EASE_OUT, fill: 'forwards' });
}

export function animateTick(element: Element): Animation {
  const keyframes: Keyframe[] = prefersReducedMotion()
    ? [{ opacity: 0.6 }, { opacity: 1 }]
    : [{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }];
  return element.animate(keyframes, { duration: 120, easing: EASE_OUT });
}
