import type { OverflowReport, Section } from '@neruz/core';
import { buildSelector } from './anchor-dom';
import { isOutOfFlow } from './page-overrides';
import { detectSections, type SectionCandidate } from './section-detection';

const SECTION_CANDIDATES =
  'main > *, body > *, section, article, header, footer, [role="banner"], [role="main"], [role="contentinfo"], [role="region"]';
const MAX_CANDIDATES = 400;
const MAX_OFFENDERS = 20;
const MAX_OFFENDER_SCAN = 2000;
const OVERFLOW_TOLERANCE_PX = 1;

const labelOf = (element: Element): string | undefined => {
  const aria = element.getAttribute('aria-label');
  if (aria) return aria;
  const labelledBy = element.getAttribute('aria-labelledby');
  const labelElement = labelledBy ? document.getElementById(labelledBy.split(' ')[0] ?? '') : null;
  const heading = labelElement ?? element.querySelector('h1, h2, h3');
  return heading?.textContent ?? undefined;
};

const toCandidate = (element: Element): SectionCandidate => {
  const rect = element.getBoundingClientRect();
  return {
    selector: buildSelector(element),
    top: rect.top + window.scrollY,
    height: rect.height,
    label: labelOf(element),
  };
};

const readSections = (): { sections: Section[]; truncated: boolean } => {
  const elements = [...document.querySelectorAll(SECTION_CANDIDATES)]
    .slice(0, MAX_CANDIDATES)
    .filter((element) => !isOutOfFlow(element));
  return detectSections(elements.map(toCandidate));
};

const readOverflow = (): OverflowReport => {
  const overflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
  if (overflowPx <= OVERFLOW_TOLERANCE_PX)
    return { overflowPx: 0, offenders: [], truncated: false };
  const scanned = [...document.body.querySelectorAll('*')].slice(0, MAX_OFFENDER_SCAN);
  const offenders = scanned
    .map((element) => ({ element, right: element.getBoundingClientRect().right }))
    .filter(({ right }) => right > window.innerWidth + OVERFLOW_TOLERANCE_PX)
    .sort((first, second) => second.right - first.right);
  return {
    overflowPx,
    offenders: offenders.slice(0, MAX_OFFENDERS).map(({ element, right }) => ({
      selector: buildSelector(element),
      rightPx: Math.round(right),
    })),
    truncated: offenders.length > MAX_OFFENDERS,
  };
};

export const measurePage = () => {
  const { sections, truncated } = readSections();
  return { sections, overflow: readOverflow(), truncated };
};
