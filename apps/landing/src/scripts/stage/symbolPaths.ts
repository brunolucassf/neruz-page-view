export function symbolWindowPath(cut: number): string {
  return `M${16 + cut} 20H${112 - cut}L112 ${20 + cut}V46H100V32H28V88H54V100H${16 + cut}L16 ${100 - cut}V${20 + cut}Z`;
}

export function symbolViewportPath(cut: number): string {
  return `M${64 + cut} 52H${112 - cut}L112 ${52 + cut}V${112 - cut}L${112 - cut} 112H${64 + cut}L64 ${112 - cut}V${52 + cut}ZM76 64V100H100V64Z`;
}

export const SYMBOL_WINDOW_BOX = { x: 16, y: 20, w: 96, h: 80 };
export const SYMBOL_VIEWPORT_BOX = { x: 64, y: 52, w: 48, h: 60 };
