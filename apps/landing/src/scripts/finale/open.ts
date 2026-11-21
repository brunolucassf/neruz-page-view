import { gsap } from 'gsap';
import { isMotion, isWide, rampProgress } from '../env';
import { diagonalReveal, query, queryAll, setStyle, wipeFromRight } from './dom';
import { SYMBOL_COMMANDS, SYMBOL_PATHS } from './symbolCode';
import { type TrackedScene, trackScene, WIDE_QUERY } from './trackScene';

const cutEase = gsap.parseEase('power3.inOut');

const PHASES = {
  wide: {
    wipe: [0, 0.22],
    text: [0.15, 0.32],
    typing: [0.32, 0.8],
    fill: [0.78, 0.92],
    word: [0.55, 0.9],
  },
  compact: {
    wipe: [0, 0.05],
    text: [0.02, 0.07],
    typing: [0.3, 0.5],
    fill: [0.48, 0.56],
    word: [0.2, 0.4],
  },
};

interface CommandEnd {
  pathIndex: number;
  commandCount: number;
  charEnd: number;
}

function strip(value: string): string {
  return value.replace(/\s+/g, '');
}

function locateCommandEnds(chars: HTMLElement[]): CommandEnd[] {
  const flat = chars.map((char) => char.textContent ?? '');
  const solidIndexes = flat.flatMap((text, index) => (strip(text) ? [index] : []));
  const stripped = solidIndexes.map((index) => strip(flat[index])).join('');
  const ends: CommandEnd[] = [];
  let cursor = 0;
  SYMBOL_COMMANDS.forEach((commands, pathIndex) => {
    commands.forEach((command, commandIndex) => {
      const token = strip(command);
      const found = stripped.indexOf(token, cursor);
      if (found < 0) return;
      cursor = found + token.length;
      ends.push({
        pathIndex,
        commandCount: commandIndex + 1,
        charEnd: solidIndexes[cursor - 1] + 1,
      });
    });
  });
  return ends;
}

export function initOpen(section: HTMLElement): TrackedScene {
  const track = query<HTMLElement>(section, '[data-track]');
  const stage = query<HTMLElement>(section, '[data-opn-stage]');
  const dark = query<HTMLElement>(section, '[data-opn-dark]');
  const text = query<HTMLElement>(section, '[data-opn-text]');
  const lines = queryAll<HTMLElement>(section, '[data-opn-line]');
  const logoPaths = queryAll<SVGPathElement>(section, '[data-opn-path]');
  const word = query<HTMLElement>(section, '[data-opn-outline]');
  let isWideLayout = isWide(1024);
  let stageSize = { width: 0, height: 0 };
  let chars: HTMLElement[] = [];
  let commandEnds: CommandEnd[] = [];
  let shownChars = -1;
  let lastCounts = [-1, -1];

  function restoreLogo(): void {
    logoPaths.forEach((path, index) => {
      path.setAttribute('d', SYMBOL_PATHS[index]);
      setStyle(path, 'fill-opacity', '1');
      setStyle(path, 'stroke-opacity', '0');
    });
  }

  if (isMotion) {
    void import('gsap/SplitText')
      .then(({ SplitText }) => {
        gsap.registerPlugin(SplitText);
        const split = lines.map((line) =>
          SplitText.create(line, {
            type: 'chars',
            charsClass: 'opn__char',
            reduceWhiteSpace: false,
            aria: 'none',
          }),
        );
        chars = split.flatMap((item) => item.chars as HTMLElement[]);
        for (const char of chars) char.style.opacity = '0';
        for (const line of lines) line.classList.add('is-ready');
        commandEnds = locateCommandEnds(chars);
        shownChars = -1;
      })
      .catch(() => {
        for (const line of lines) line.classList.add('is-ready');
        restoreLogo();
      });
    for (const path of logoPaths) path.setAttribute('d', '');
  }

  function measure(): void {
    isWideLayout = isWide(1024);
    const rect = stage.getBoundingClientRect();
    stageSize = {
      width: rect.width,
      height: isWideLayout ? rect.height : Math.min(rect.height, window.innerHeight),
    };
  }

  function renderTyping(amount: number): number {
    if (chars.length === 0) return amount;
    const target = Math.round(amount * chars.length);
    if (target !== shownChars) {
      const from = Math.max(0, Math.min(shownChars, target));
      const to = Math.max(shownChars, target);
      for (let index = from; index < to; index += 1) {
        chars[index].style.opacity = index < target ? '1' : '0';
      }
      shownChars = target;
    }
    return target;
  }

  function renderLogo(typedChars: number, fill: number): void {
    if (chars.length === 0) return;
    const counts = [0, 0];
    for (const end of commandEnds) {
      if (end.charEnd <= typedChars) counts[end.pathIndex] = end.commandCount;
    }
    logoPaths.forEach((path, index) => {
      if (counts[index] !== lastCounts[index]) {
        path.setAttribute('d', SYMBOL_COMMANDS[index].slice(0, counts[index]).join(''));
      }
      setStyle(path, 'fill-opacity', fill.toFixed(3));
      setStyle(path, 'stroke-opacity', (1 - fill).toFixed(3));
    });
    lastCounts = counts;
  }

  function render(progress: number): void {
    const phases = isWideLayout ? PHASES.wide : PHASES.compact;
    wipeFromRight(
      dark,
      cutEase(rampProgress(progress, phases.wipe[0], phases.wipe[1])),
      stageSize.width,
      stageSize.height,
    );
    diagonalReveal(text, cutEase(rampProgress(progress, phases.text[0], phases.text[1])));
    const typingAmount = rampProgress(progress, phases.typing[0], phases.typing[1]);
    const typed = renderTyping(typingAmount);
    renderLogo(typed, rampProgress(progress, phases.fill[0], phases.fill[1]));
    const wordAmount = rampProgress(progress, phases.word[0], phases.word[1]);
    setStyle(word, 'opacity', wordAmount.toFixed(3));
    setStyle(word, 'transform', `translate3d(-50%, ${((1 - wordAmount) * 40).toFixed(1)}px, 0)`);
  }

  return trackScene({
    section,
    track,
    stickyQuery: WIDE_QUERY,
    entryStart: 'top 85%',
    entryEnd: 'bottom 55%',
    measure,
    render,
  });
}
