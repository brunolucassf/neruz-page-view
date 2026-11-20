const TICK_COLOR = 'rgba(166, 181, 197, 0.55)';
const MAJOR_COLOR = 'rgba(244, 248, 252, 0.7)';
const LABEL_COLOR = 'rgba(166, 181, 197, 0.9)';
const END_COLOR = 'rgba(244, 248, 252, 0.95)';
const LABEL_GAP = 6;

export interface RulerView {
  widthPx: number;
  scale: number;
}

function pickSteps(scale: number): { minorStep: number; labelStep: number } {
  if (scale >= 0.6) return { minorStep: 10, labelStep: 100 };
  if (scale >= 0.3) return { minorStep: 50, labelStep: 500 };
  return { minorStep: 50, labelStep: 1000 };
}

export function drawHorizontalRuler(
  canvas: HTMLCanvasElement,
  view: RulerView,
  locale: string,
): void {
  const density = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(view.widthPx));
  const height = 24;
  if (canvas.width !== width * density || canvas.height !== height * density) {
    canvas.width = width * density;
    canvas.height = height * density;
  }
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, width, height);
  context.font = '500 11px "Inter", system-ui, sans-serif';
  context.textBaseline = 'top';

  const { minorStep, labelStep } = pickSteps(view.scale);
  const maxVirtual = Math.round(width / view.scale);
  const format = new Intl.NumberFormat(locale);
  const endLabel = format.format(maxVirtual);
  const endLabelStart = width - 1 - LABEL_GAP - context.measureText(endLabel).width;

  for (let virtual = 0; virtual < maxVirtual; virtual += minorStep) {
    const x = Math.round(virtual * view.scale) + 0.5;
    if (x > width - 2) break;
    const isLabel = virtual % labelStep === 0;
    const isMid = virtual % 50 === 0;
    const tickHeight = isLabel ? 12 : isMid ? 8 : 4;
    context.fillStyle = isLabel ? MAJOR_COLOR : TICK_COLOR;
    context.fillRect(x - 0.5, height - tickHeight, 1, tickHeight);
    if (!isLabel || virtual === 0) continue;
    const label = format.format(virtual);
    const labelEnd = x + 3 + context.measureText(label).width;
    if (labelEnd > endLabelStart - LABEL_GAP) continue;
    context.fillStyle = LABEL_COLOR;
    context.fillText(label, x + 3, 2);
  }

  context.fillStyle = TICK_COLOR;
  context.fillRect(0, height - 1, width, 1);
  context.fillStyle = END_COLOR;
  context.fillRect(width - 1, 0, 1, height);
  context.fillText(endLabel, endLabelStart, 2);
}
