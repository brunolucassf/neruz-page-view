import { initFold } from './fold';
import { initLocal } from './local';
import { initOpen } from './open';
import type { TrackedScene } from './trackScene';

export interface FinaleHandle {
  getSceneOffsets(): { id: string; top: number }[];
}

const SCENES: { selector: string; init: (section: HTMLElement) => TrackedScene }[] = [
  { selector: '[data-fold]', init: initFold },
  { selector: '[data-local]', init: initLocal },
  { selector: '[data-open]', init: initOpen },
];

export function initFinale(): FinaleHandle {
  const tracked = SCENES.flatMap(({ selector, init }) => {
    const section = document.querySelector<HTMLElement>(selector);
    return section ? [init(section)] : [];
  });
  return {
    getSceneOffsets: () => tracked.map((scene) => ({ id: scene.id, top: scene.getTop() })),
  };
}
