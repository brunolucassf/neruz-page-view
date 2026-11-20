import type { ScrollAnchor } from '../types';

export type SectionGeometry = { top: number; height: number };

export const MIN_ANCHOR_HEIGHT_RATIO = 0.4;
const ANCHOR_TOP_TOLERANCE_PX = 1;

const clampRatio = (value: number) => Math.min(1, Math.max(0, value));

export const computePageRatio = (scrollY: number, maxScroll: number) =>
  maxScroll > 0 ? clampRatio(scrollY / maxScroll) : 0;

export const pickAnchorIndex = (
  sections: readonly SectionGeometry[],
  scrollY: number,
  viewportHeight: number,
): number => {
  const minHeight = viewportHeight * MIN_ANCHOR_HEIGHT_RATIO;
  let foundIndex = -1;
  let foundTop = Number.NEGATIVE_INFINITY;
  sections.forEach((section, index) => {
    if (section.height < minHeight || section.top > scrollY + ANCHOR_TOP_TOLERANCE_PX) return;
    if (section.top >= foundTop) {
      foundIndex = index;
      foundTop = section.top;
    }
  });
  return foundIndex;
};

export type BuildAnchorInput = {
  selector: string | null;
  section: SectionGeometry | null;
  scrollY: number;
  maxScroll: number;
};

export const buildAnchor = ({
  selector,
  section,
  scrollY,
  maxScroll,
}: BuildAnchorInput): ScrollAnchor => {
  const pageRatio = computePageRatio(scrollY, maxScroll);
  if (!selector || !section || section.height <= 0) {
    return { selector: null, offsetRatio: 0, pageRatio };
  }
  return {
    selector,
    offsetRatio: clampRatio((scrollY - section.top) / section.height),
    pageRatio,
  };
};

export type ResolvedScroll = { top: number; usedFallback: boolean };

export const resolveScrollTop = (
  anchor: ScrollAnchor,
  section: SectionGeometry | null,
  maxScroll: number,
): ResolvedScroll => {
  const clamp = (top: number) => Math.min(Math.max(0, maxScroll), Math.max(0, top));
  if (section && section.height > 0) {
    return { top: clamp(section.top + anchor.offsetRatio * section.height), usedFallback: false };
  }
  return { top: clamp(anchor.pageRatio * maxScroll), usedFallback: true };
};
