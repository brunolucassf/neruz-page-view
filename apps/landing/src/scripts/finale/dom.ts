export function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`finale: ${selector}`);
  return element;
}

export function queryAll<T extends Element>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

export function setStyle(element: HTMLElement | SVGElement, property: string, value: string): void {
  if (element.style.getPropertyValue(property) !== value)
    element.style.setProperty(property, value);
}

export function diagonalReveal(element: HTMLElement, amount: number): void {
  if (amount >= 1) {
    setStyle(element, 'clip-path', 'none');
    return;
  }
  const edge = amount * 140;
  setStyle(
    element,
    'clip-path',
    `polygon(0 0, ${edge.toFixed(1)}% 0, ${(edge - 40).toFixed(1)}% 100%, 0 100%)`,
  );
}

export function wipeFromLeft(
  element: HTMLElement,
  amount: number,
  width: number,
  height: number,
): void {
  if (amount >= 1) {
    setStyle(element, 'clip-path', 'none');
    setStyle(element, 'visibility', 'visible');
    return;
  }
  if (amount <= 0) {
    setStyle(element, 'visibility', 'hidden');
    return;
  }
  const travel = (width + height) * amount;
  setStyle(element, 'visibility', 'visible');
  setStyle(
    element,
    'clip-path',
    `polygon(0 0, ${travel.toFixed(1)}px 0, ${(travel - height).toFixed(1)}px ${height.toFixed(1)}px, 0 ${height.toFixed(1)}px)`,
  );
}

export function wipeFromRight(
  element: HTMLElement,
  amount: number,
  width: number,
  height: number,
): void {
  if (amount >= 1) {
    setStyle(element, 'clip-path', 'none');
    setStyle(element, 'visibility', 'visible');
    return;
  }
  if (amount <= 0) {
    setStyle(element, 'visibility', 'hidden');
    return;
  }
  const travel = (width + height) * amount;
  const edge = width - travel;
  setStyle(element, 'visibility', 'visible');
  setStyle(
    element,
    'clip-path',
    `polygon(${width.toFixed(1)}px 0, ${edge.toFixed(1)}px 0, ${(edge + height).toFixed(1)}px ${height.toFixed(1)}px, ${width.toFixed(1)}px ${height.toFixed(1)}px)`,
  );
}

export function riseIn(element: HTMLElement, amount: number, distance = 16): void {
  const eased = 1 - (1 - amount) ** 3;
  setStyle(element, 'opacity', eased.toFixed(3));
  setStyle(
    element,
    'transform',
    `translate3d(0, ${((1 - eased) * distance).toFixed(1)}px, 0) scale(${(0.95 + eased * 0.05).toFixed(4)})`,
  );
}
