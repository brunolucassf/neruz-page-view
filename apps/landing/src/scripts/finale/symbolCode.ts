import { symbolViewportPath, symbolWindowPath } from '../stage/symbolPaths';

const SYMBOL_CUT = 8;
const COMMANDS_PER_LINE = 3;
const INDENT = '  ';

export interface CodeLine {
  text: string;
  pathIndex: number;
  commands: number;
}

function splitCommands(path: string): string[] {
  return path.match(/[MHVLZ][^MHVLZ]*/g) ?? [];
}

function pathLines(commands: string[], pathIndex: number): CodeLine[] {
  const lines: CodeLine[] = [];
  for (let start = 0; start < commands.length; start += COMMANDS_PER_LINE) {
    const group = commands.slice(start, start + COMMANDS_PER_LINE);
    lines.push({
      text: `${INDENT}${INDENT}${group.join(' ')}`,
      pathIndex,
      commands: group.length,
    });
  }
  return lines;
}

export const SYMBOL_PATHS = [symbolWindowPath(SYMBOL_CUT), symbolViewportPath(SYMBOL_CUT)];

export const SYMBOL_COMMANDS = SYMBOL_PATHS.map(splitCommands);

export function buildCodeLines(): CodeLine[] {
  const plain = (text: string): CodeLine => ({ text, pathIndex: -1, commands: 0 });
  return [
    plain('<svg viewBox="0 0 128 128">'),
    plain(`${INDENT}<path d="`),
    ...pathLines(SYMBOL_COMMANDS[0], 0),
    plain(`${INDENT}"/>`),
    plain(`${INDENT}<path fill-rule="evenodd" d="`),
    ...pathLines(SYMBOL_COMMANDS[1], 1),
    plain(`${INDENT}"/>`),
    plain('</svg>'),
  ];
}
