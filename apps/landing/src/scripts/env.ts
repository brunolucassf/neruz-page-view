interface NetworkInformationLike {
  saveData?: boolean;
}

interface NavigatorWithHints extends Navigator {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
}

const root = document.documentElement;
const hintedNavigator = navigator as NavigatorWithHints;

export const isMotion = root.classList.contains('is-motion');
export const isStatic = !isMotion;
export const isSaveData = Boolean(hintedNavigator.connection?.saveData);
export const locale = root.dataset.locale ?? 'pt-BR';

export function isDesktopPointer(): boolean {
  return matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function isWide(minWidth: number): boolean {
  return window.innerWidth >= minWidth;
}

export function hasCapableGpu(): boolean {
  const memory = hintedNavigator.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return memory >= 4 && cores >= 4;
}

export function canUseWebGl(): boolean {
  if (!isMotion || isSaveData || !hasCapableGpu()) return false;
  if (!isWide(768)) return false;
  return isDesktopPointer() || isWide(1024);
}

const numberFormat = new Intl.NumberFormat(locale);

export function formatPx(value: number): string {
  return `${numberFormat.format(Math.round(value))} px`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function rampProgress(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start), 0, 1);
}
