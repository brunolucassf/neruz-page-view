import { describe, expect, it } from 'vitest';
import { detectSections } from './section-detection';

const candidate = (selector: string, top: number, height: number, label?: string) => ({
  selector,
  top,
  height,
  ...(label ? { label } : {}),
});

describe('detectSections', () => {
  it('orders by top and drops short elements', () => {
    const { sections } = detectSections([
      candidate('#b', 900, 600),
      candidate('#tiny', 500, 40),
      candidate('#a', 0, 900),
    ]);
    expect(sections.map((section) => section.selector)).toEqual(['#a', '#b']);
  });

  it('removes duplicated selectors and trims labels', () => {
    const { sections } = detectSections([
      candidate('#a', 0, 500, '  Hero   principal '),
      candidate('#a', 0, 500),
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.label).toBe('Hero principal');
  });

  it('caps the list at 30 and flags truncation', () => {
    const many = Array.from({ length: 35 }, (_, index) =>
      candidate(`#s${index}`, index * 200, 200),
    );
    const result = detectSections(many);
    expect(result.sections).toHaveLength(30);
    expect(result.truncated).toBe(true);
  });

  it('drops a wrapper that starts at the same top as a smaller child', () => {
    const { sections } = detectSections([
      candidate('main', 0, 3000),
      candidate('main > section', 0, 800),
      candidate('main > section:nth-of-type(2)', 800, 800),
    ]);
    expect(sections.map((section) => section.selector)).toEqual([
      'main > section',
      'main > section:nth-of-type(2)',
    ]);
  });
});
