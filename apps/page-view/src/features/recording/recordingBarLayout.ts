export type BarBox = { x: number; y: number; width: number; height: number };
export type BarPoint = { x: number; y: number };
type Size = { width: number; height: number };

const BAR_GAP_PX = 16;

const isOverlapping = (first: BarBox, second: BarBox) =>
  first.x < second.x + second.width &&
  first.x + first.width > second.x &&
  first.y < second.y + second.height &&
  first.y + first.height > second.y;

const clampToViewport = (point: BarPoint, bar: Size, viewport: Size): BarPoint => ({
  x: Math.min(Math.max(0, point.x), Math.max(0, viewport.width - bar.width)),
  y: Math.min(Math.max(0, point.y), Math.max(0, viewport.height - bar.height)),
});

const fitsViewport = (point: BarPoint, bar: Size, viewport: Size) =>
  point.x >= 0 &&
  point.y >= 0 &&
  point.x + bar.width <= viewport.width &&
  point.y + bar.height <= viewport.height;

export const placeBarOutsideVideo = (
  wanted: BarPoint,
  bar: Size,
  video: BarBox,
  viewport: Size,
): BarPoint | null => {
  const clamped = clampToViewport(wanted, bar, viewport);
  if (!isOverlapping({ ...clamped, ...bar }, video)) return clamped;
  const candidates: BarPoint[] = [
    { x: video.x + video.width + BAR_GAP_PX, y: clamped.y },
    { x: clamped.x, y: video.y + video.height + BAR_GAP_PX },
    { x: video.x - bar.width - BAR_GAP_PX, y: clamped.y },
    { x: clamped.x, y: video.y - bar.height - BAR_GAP_PX },
  ]
    .map((point) => clampToViewport(point, bar, viewport))
    .filter(
      (point) => fitsViewport(point, bar, viewport) && !isOverlapping({ ...point, ...bar }, video),
    );
  const distance = (point: BarPoint) => Math.hypot(point.x - clamped.x, point.y - clamped.y);
  return candidates.sort((first, second) => distance(first) - distance(second))[0] ?? null;
};

export const pickInitialBarPoint = (bar: Size, video: BarBox, viewport: Size): BarPoint | null =>
  placeBarOutsideVideo(
    { x: video.x + video.width + BAR_GAP_PX, y: BAR_GAP_PX * 2 },
    bar,
    video,
    viewport,
  );
