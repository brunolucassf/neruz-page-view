import type { Section } from '@neruz/core';
import { planScrollTops } from './stitch';

export type MomentPlan = { scrollTop: number; name: string };

const MIN_SPACING_VIEWPORT_RATIO = 0.2;
const MAX_NAME_LENGTH = 40;
const FALLBACK_NAME = 'secao';

const toSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-+$/g, '');

const buildMomentName = (position: number, section: Pick<Section, 'label' | 'selector'> | null) => {
  const slug = section ? toSlug(section.label ?? section.selector) : '';
  return `${String(position).padStart(2, '0')}-${slug || FALLBACK_NAME}`;
};

export const planMoments = (
  sections: readonly Pick<Section, 'top' | 'height' | 'label' | 'selector'>[],
  scrollHeight: number,
  viewportHeight: number,
): MomentPlan[] => {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  const minSpacing = viewportHeight * MIN_SPACING_VIEWPORT_RATIO;
  const plans: MomentPlan[] = [];
  let lastTop = Number.NEGATIVE_INFINITY;
  const ordered = sections.filter((section) => section.height > 0).sort((a, b) => a.top - b.top);
  for (const section of ordered) {
    const scrollTop = Math.min(Math.round(section.top), maxScroll);
    if (scrollTop - lastTop < minSpacing) continue;
    plans.push({ scrollTop, name: buildMomentName(plans.length + 1, section) });
    lastTop = scrollTop;
  }
  if (plans.length > 0) return plans;
  return planScrollTops(scrollHeight, viewportHeight).map((scrollTop, index) => ({
    scrollTop,
    name: buildMomentName(index + 1, null),
  }));
};
