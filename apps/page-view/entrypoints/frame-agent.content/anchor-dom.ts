import {
  buildAnchor,
  MAX_SELECTOR_LENGTH,
  pickAnchorIndex,
  resolveScrollTop,
  type ScrollAnchor,
  type SectionGeometry,
} from '@neruz/core';
import { isOutOfFlow } from './page-overrides';
import { maxScrollTop } from './timing';

const ANCHOR_CANDIDATES = 'main > *, body > section, section, article, footer';
const MAX_CANDIDATES = 300;
const MAX_SELECTOR_DEPTH = 5;

const buildSelector = (element: Element): string => {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && parts.length < MAX_SELECTOR_DEPTH) {
    const tag = current.tagName.toLowerCase();
    const siblings = current.parentElement
      ? [...current.parentElement.children].filter((child) => child.tagName === current?.tagName)
      : [];
    parts.unshift(
      siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(current) + 1})` : tag,
    );
    current = current.parentElement;
  }
  return `body > ${parts.join(' > ')}`.slice(0, MAX_SELECTOR_LENGTH);
};

const geometryOf = (element: Element): SectionGeometry => {
  const rect = element.getBoundingClientRect();
  return { top: rect.top + window.scrollY, height: rect.height };
};

export const readCurrentAnchor = (): ScrollAnchor => {
  const elements = [...document.querySelectorAll(ANCHOR_CANDIDATES)]
    .slice(0, MAX_CANDIDATES)
    .filter((element) => !isOutOfFlow(element));
  const geometries = elements.map(geometryOf);
  const index = pickAnchorIndex(geometries, window.scrollY, window.innerHeight);
  const element = elements[index];
  return buildAnchor({
    selector: element ? buildSelector(element) : null,
    section: geometries[index] ?? null,
    scrollY: window.scrollY,
    maxScroll: maxScrollTop(),
  });
};

const findAnchorElement = (selector: string | null): Element | null => {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
};

export const resolveAnchorScrollTop = (anchor: ScrollAnchor) => {
  const element = findAnchorElement(anchor.selector);
  return resolveScrollTop(anchor, element ? geometryOf(element) : null, maxScrollTop());
};
