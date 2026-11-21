import { MAX_SECTIONS, type Section } from '@neruz/core';

export type SectionCandidate = {
  selector: string;
  top: number;
  height: number;
  label?: string;
};

export type DetectedSections = {
  sections: Section[];
  truncated: boolean;
};

export const MIN_SECTION_HEIGHT_PX = 120;
const MAX_LABEL_LENGTH = 80;

const normalizeLabel = (label: string | undefined) => {
  const trimmed = label?.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);
  return trimmed ? trimmed : undefined;
};

export const detectSections = (
  candidates: readonly SectionCandidate[],
  minHeight = MIN_SECTION_HEIGHT_PX,
): DetectedSections => {
  const unique = new Map<string, Section>();
  for (const candidate of candidates) {
    if (candidate.height < minHeight || unique.has(candidate.selector)) continue;
    const label = normalizeLabel(candidate.label);
    unique.set(candidate.selector, {
      selector: candidate.selector,
      top: Math.max(0, Math.round(candidate.top)),
      height: Math.round(candidate.height),
      ...(label ? { label } : {}),
    });
  }
  const ordered = [...unique.values()].sort((first, second) => first.top - second.top);
  const withoutNested = ordered.filter(
    (section) =>
      !ordered.some((other) => other.top === section.top && other.height < section.height),
  );
  return {
    sections: withoutNested.slice(0, MAX_SECTIONS),
    truncated: withoutNested.length > MAX_SECTIONS,
  };
};
