import type { FornoCopy } from '../../i18n/types';

export const PRINT_WIDTH = 390;
export const PRINT_SCREEN_HEIGHT = 844;
export const PRINT_HEIGHT_ESTIMATE = 1860;
const PRINT_HEIGHT_LIMIT = 2400;
const PRINT_DENSITY = 2;
const PAD = 20;
const CONTACT_CARD_HEIGHT = 104;
const FOOTER_HEIGHT = 132;

export type PrintSectionId = 'home' | 'menu' | 'about' | 'contact';

export interface FornoPrint {
  canvas: HTMLCanvasElement;
  height: number;
  tops: Record<PrintSectionId, number>;
}

let cachedPrint: { forno: FornoCopy; print: FornoPrint } | null = null;

const COLORS = {
  cream: '#F3E9DA',
  ink: '#221A15',
  terracotta: '#C4532D',
  plate: '#EAD9C2',
  plateShade: '#E1CCB0',
  card: '#EFE2CF',
  line: 'rgba(34, 26, 21, 0.1)',
  softInk: 'rgba(34, 26, 21, 0.75)',
};

const DISPLAY_FONT = '"Sora", system-ui, sans-serif';
const UI_FONT = '"Inter", system-ui, sans-serif';

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawParagraph(
  context: CanvasRenderingContext2D,
  text: string,
  top: number,
  maxWidth: number,
  lineHeight: number,
  left = PAD,
): number {
  const lines = wrapLines(context, text, maxWidth);
  lines.forEach((line, index) => {
    context.fillText(line, left, top + index * lineHeight);
  });
  return top + lines.length * lineHeight;
}

function drawLoaf(context: CanvasRenderingContext2D, top: number): void {
  const width = PRINT_WIDTH - PAD * 2;
  const height = 200;
  context.save();
  context.beginPath();
  context.roundRect(PAD, top, width, height, 16);
  context.clip();
  context.fillStyle = COLORS.plate;
  context.fillRect(PAD, top, width, height);
  context.fillStyle = COLORS.plateShade;
  context.fillRect(PAD, top + 150, width, 50);
  context.fillStyle = 'rgba(34, 26, 21, 0.12)';
  context.beginPath();
  context.ellipse(PAD + width / 2, top + 150, 120, 14, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.terracotta;
  context.beginPath();
  context.moveTo(PAD + 50, top + 140);
  context.bezierCurveTo(PAD + 50, top + 88, PAD + 98, top + 58, PAD + width / 2, top + 58);
  context.bezierCurveTo(
    PAD + width - 98,
    top + 58,
    PAD + width - 50,
    top + 88,
    PAD + width - 50,
    top + 140,
  );
  context.lineTo(PAD + 50, top + 150);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgba(243, 233, 218, 0.85)';
  context.lineWidth = 6;
  context.lineCap = 'round';
  for (const offset of [-56, 0, 56]) {
    context.beginPath();
    context.moveTo(PAD + width / 2 + offset - 28, top + 98);
    context.quadraticCurveTo(
      PAD + width / 2 + offset,
      top + 80,
      PAD + width / 2 + offset + 26,
      top + 84,
    );
    context.stroke();
  }
  context.restore();
}

function drawContact(context: CanvasRenderingContext2D, forno: FornoCopy, top: number): number {
  context.fillStyle = COLORS.line;
  context.fillRect(PAD, top, PRINT_WIDTH - PAD * 2, 1);
  context.fillStyle = COLORS.ink;
  context.font = `600 22px ${DISPLAY_FONT}`;
  context.fillText(forno.nav.contact, PAD, top + 58);
  context.fillStyle = COLORS.softInk;
  context.font = `400 15px ${UI_FONT}`;
  let cursor = drawParagraph(context, forno.contact.line, top + 90, 300, 22) + 6;
  const cardTitles = [forno.nav.home, forno.nav.menu, forno.nav.about];
  forno.contact.cards.forEach((card, index) => {
    context.fillStyle = COLORS.card;
    context.fillRect(PAD, cursor, PRINT_WIDTH - PAD * 2, CONTACT_CARD_HEIGHT);
    context.fillStyle = COLORS.ink;
    context.font = `600 14px ${DISPLAY_FONT}`;
    context.fillText(cardTitles[index], PAD * 2, cursor + 42);
    context.fillStyle = COLORS.softInk;
    context.font = `400 14px ${UI_FONT}`;
    drawParagraph(context, card, cursor + 64, PRINT_WIDTH - PAD * 4, 20, PAD * 2);
    cursor += CONTACT_CARD_HEIGHT + 12;
  });
  return cursor - 12 + 44;
}

function drawFornoPage(forno: FornoCopy): FornoPrint {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH * PRINT_DENSITY;
  canvas.height = PRINT_HEIGHT_LIMIT * PRINT_DENSITY;
  const tops = { home: 0, menu: 0, about: 0, contact: 0 };
  const context = canvas.getContext('2d');
  if (!context) return { canvas, height: PRINT_HEIGHT_ESTIMATE, tops };
  const height = PRINT_HEIGHT_LIMIT;
  context.scale(PRINT_DENSITY, PRINT_DENSITY);
  context.textBaseline = 'alphabetic';

  context.fillStyle = COLORS.cream;
  context.fillRect(0, 0, PRINT_WIDTH, height);

  context.fillStyle = COLORS.ink;
  context.font = `700 19px ${DISPLAY_FONT}`;
  context.fillText(forno.brand, PAD, 37);
  for (const offset of [0, 6, 12]) context.fillRect(PRINT_WIDTH - PAD - 22, 24 + offset, 22, 2);
  context.fillStyle = COLORS.line;
  context.fillRect(0, 60, PRINT_WIDTH, 1);

  context.fillStyle = COLORS.ink;
  context.font = `600 36px ${DISPLAY_FONT}`;
  let cursor = drawParagraph(context, forno.hero.title, 122, 290, 38);
  context.fillStyle = COLORS.softInk;
  context.font = `400 15px ${UI_FONT}`;
  cursor = drawParagraph(context, forno.hero.subtitle, cursor + 8, 300, 22);

  context.font = `600 14px ${UI_FONT}`;
  const ctaWidth = context.measureText(forno.hero.cta).width + 40;
  context.fillStyle = COLORS.terracotta;
  context.beginPath();
  context.roundRect(PAD, cursor + 8, ctaWidth, 44, 22);
  context.fill();
  context.fillStyle = '#FFF8EF';
  context.fillText(forno.hero.cta, PAD + 20, cursor + 35);
  cursor += 80;

  drawLoaf(context, cursor);
  cursor += 248;

  tops.menu = cursor - 40;
  context.fillStyle = COLORS.ink;
  context.font = `600 22px ${DISPLAY_FONT}`;
  context.fillText(forno.menu.title, PAD, cursor);
  context.fillStyle = COLORS.terracotta;
  context.font = `600 14px ${UI_FONT}`;
  context.textAlign = 'right';
  context.fillText(forno.menu.more, PRINT_WIDTH - PAD, cursor);
  context.textAlign = 'left';
  cursor += 18;

  for (const item of forno.menu.items) {
    context.fillStyle = COLORS.line;
    context.fillRect(PAD, cursor, PRINT_WIDTH - PAD * 2, 1);
    context.fillStyle = COLORS.plate;
    context.beginPath();
    context.roundRect(PAD, cursor + 14, 52, 52, 14);
    context.fill();
    context.fillStyle = COLORS.terracotta;
    context.beginPath();
    context.ellipse(PAD + 26, cursor + 43, 17, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = COLORS.ink;
    context.font = `600 15px ${UI_FONT}`;
    context.fillText(item.name, PAD + 66, cursor + 36, 220);
    context.fillStyle = COLORS.softInk;
    context.font = `400 13px ${UI_FONT}`;
    context.fillText(item.desc, PAD + 66, cursor + 55, 220);
    context.fillStyle = COLORS.ink;
    context.font = `600 14px ${UI_FONT}`;
    context.textAlign = 'right';
    context.fillText(item.price, PRINT_WIDTH - PAD, cursor + 36);
    context.textAlign = 'left';
    cursor += 80;
  }

  cursor += 28;
  tops.about = cursor - 24;
  context.fillStyle = COLORS.line;
  context.fillRect(PAD, cursor - 24, PRINT_WIDTH - PAD * 2, 1);
  context.fillStyle = COLORS.ink;
  context.font = `600 22px ${DISPLAY_FONT}`;
  context.fillText(forno.about.title, PAD, cursor + 8);
  context.fillStyle = COLORS.softInk;
  context.font = `400 15px ${UI_FONT}`;
  const aboutEnd = drawParagraph(context, forno.about.body, cursor + 40, PRINT_WIDTH - PAD * 2, 23);

  tops.contact = aboutEnd + 8;
  const footerTop = drawContact(context, forno, tops.contact);
  const footerHeight = FOOTER_HEIGHT;
  context.fillStyle = COLORS.ink;
  context.fillRect(0, footerTop, PRINT_WIDTH, footerHeight);
  context.fillStyle = COLORS.cream;
  context.font = `700 17px ${DISPLAY_FONT}`;
  context.fillText(forno.brand, PAD, footerTop + 44);
  context.fillStyle = 'rgba(243, 233, 218, 0.8)';
  context.font = `400 13px ${UI_FONT}`;
  drawParagraph(context, forno.footerNote, footerTop + 70, PRINT_WIDTH - PAD * 2, 19);

  const finalHeight = Math.ceil(footerTop + footerHeight);
  const trimmed = document.createElement('canvas');
  trimmed.width = canvas.width;
  trimmed.height = finalHeight * PRINT_DENSITY;
  trimmed.getContext('2d')?.drawImage(canvas, 0, 0);
  return { canvas: trimmed, height: finalHeight, tops };
}

export function drawFornoPrint(forno: FornoCopy): FornoPrint {
  if (cachedPrint?.forno === forno) return cachedPrint.print;
  const print = drawFornoPage(forno);
  cachedPrint = { forno, print };
  return print;
}

export function paintPrintTargets(
  print: FornoPrint,
  before: HTMLCanvasElement,
  after: HTMLCanvasElement,
): void {
  after.width = print.canvas.width;
  after.height = print.canvas.height;
  after.getContext('2d')?.drawImage(print.canvas, 0, 0);
  after.parentElement?.style.setProperty('--page-aspect', `${PRINT_WIDTH} / ${print.height}`);
  const cropHeight = PRINT_SCREEN_HEIGHT * PRINT_DENSITY;
  before.width = print.canvas.width;
  before.height = cropHeight;
  before
    .getContext('2d')
    ?.drawImage(
      print.canvas,
      0,
      0,
      print.canvas.width,
      cropHeight,
      0,
      0,
      print.canvas.width,
      cropHeight,
    );
}

export function paintPrintSection(
  print: FornoPrint,
  target: HTMLCanvasElement,
  section: PrintSectionId,
): void {
  const sliceHeight = Math.round((target.height / target.width) * PRINT_WIDTH);
  const top = Math.min(print.tops[section], print.height - sliceHeight);
  target
    .getContext('2d')
    ?.drawImage(
      print.canvas,
      0,
      top * PRINT_DENSITY,
      print.canvas.width,
      sliceHeight * PRINT_DENSITY,
      0,
      0,
      target.width,
      target.height,
    );
}

export async function ensureFornoPrint(forno: FornoCopy): Promise<FornoPrint> {
  await Promise.allSettled([
    document.fonts.load('600 36px "Sora"'),
    document.fonts.load('700 19px "Sora"'),
    document.fonts.load('400 15px "Inter"'),
    document.fonts.load('600 15px "Inter"'),
  ]);
  return drawFornoPrint(forno);
}

export function paintPrintFull(print: FornoPrint, target: HTMLCanvasElement): void {
  target
    .getContext('2d')
    ?.drawImage(
      print.canvas,
      0,
      0,
      print.canvas.width,
      print.canvas.height,
      0,
      0,
      target.width,
      target.height,
    );
}
