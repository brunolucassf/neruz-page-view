const SVG_NS = 'http://www.w3.org/2000/svg';
const WIRE_OFFSET = 5;
const HOVER_CUT = 12;

function chamferPoints(width: number, height: number, cut: number): string {
  const points = [
    [cut, 0],
    [width - cut, 0],
    [width, cut],
    [width, height - cut],
    [width - cut, height],
    [cut, height],
    [0, height - cut],
    [0, cut],
  ];
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function attachWire(button: HTMLElement): void {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'btn__wire');
  svg.setAttribute('aria-hidden', 'true');
  const polygon = document.createElementNS(SVG_NS, 'polygon');
  polygon.setAttribute('pathLength', '1');
  svg.append(polygon);
  button.append(svg);

  const resize = () => {
    const width = button.offsetWidth + WIRE_OFFSET * 2;
    const height = button.offsetHeight + WIRE_OFFSET * 2;
    if (!width || !height) return;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    polygon.setAttribute('points', chamferPoints(width - 1, height - 1, HOVER_CUT + 2));
    polygon.setAttribute('transform', 'translate(0.5 0.5)');
  };
  new ResizeObserver(resize).observe(button);
}

export function initWireButtons(): void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  for (const button of document.querySelectorAll<HTMLElement>('[data-wire]')) attachWire(button);
}
