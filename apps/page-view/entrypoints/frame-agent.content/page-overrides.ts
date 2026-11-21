const FIXED_CLASS = 'npv-hide-fixed';
const FIXED_ATTRIBUTE = 'data-npv-fixed';
const OVERRIDE_STYLE_ATTRIBUTE = 'data-npv-overrides';

const FIXED_CSS = `html.${FIXED_CLASS} [${FIXED_ATTRIBUTE}]{visibility:hidden!important}`;
const SCROLLBAR_THIN_CSS = 'html{scrollbar-width:thin;scrollbar-color:#304256 transparent}';
const SCROLLBAR_CSS =
  'html{scrollbar-width:none!important}html::-webkit-scrollbar{display:none!important}';

const ensureStyle = (name: string, css: string) => {
  const existing = document.querySelector(`style[${OVERRIDE_STYLE_ATTRIBUTE}="${name}"]`);
  if (existing) return;
  const style = document.createElement('style');
  style.setAttribute(OVERRIDE_STYLE_ATTRIBUTE, name);
  style.textContent = css;
  document.documentElement.append(style);
};

const removeStyle = (name: string) =>
  document.querySelector(`style[${OVERRIDE_STYLE_ATTRIBUTE}="${name}"]`)?.remove();

export const isOutOfFlow = (element: Element) => {
  const position = getComputedStyle(element).position;
  return position === 'fixed' || position === 'sticky';
};

export const hideFixedElements = (): number => {
  ensureStyle('fixed', FIXED_CSS);
  document.documentElement.classList.add(FIXED_CLASS);
  for (const element of document.querySelectorAll('*')) {
    if (isOutOfFlow(element)) element.setAttribute(FIXED_ATTRIBUTE, '');
  }
  return document.querySelectorAll(`[${FIXED_ATTRIBUTE}]`).length;
};

export const restoreFixedElements = (): number => {
  const marked = document.querySelectorAll(`[${FIXED_ATTRIBUTE}]`);
  for (const element of marked) element.removeAttribute(FIXED_ATTRIBUTE);
  document.documentElement.classList.remove(FIXED_CLASS);
  removeStyle('fixed');
  return marked.length;
};

export const showThinScrollbar = () => ensureStyle('scrollbar-thin', SCROLLBAR_THIN_CSS);

export const setScrollbarHidden = (hidden: boolean) => {
  if (hidden) {
    removeStyle('scrollbar-thin');
    ensureStyle('scrollbar', SCROLLBAR_CSS);
    return;
  }
  removeStyle('scrollbar');
  showThinScrollbar();
};
