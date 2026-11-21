import type { CaptureResult } from '@neruz/capture';
import type { CapturedShot } from '../../export/exportService';
import { selectFramedBackground, useFramed } from '../framedStore';
import { FRAME_KINDS, type FrameKind, toFrameKind } from '../frames';
import { type ComposeOutput, composeFramedImage, type FramedStyle } from './composeFramed';

const LOSSLESS_OUTPUT: ComposeOutput = { type: 'image/png', quality: 1 };
const PREVIEW_SOURCE_WIDTH = 720;
const PREVIEW_MAX_SIDE = 640;
const LARGE_PREVIEW_MAX_SIDE = 1400;

export function resolveFrameKind(shot: Pick<CapturedShot, 'kind'>): FrameKind {
  const chosen = useFramed.getState().frameDeviceId;
  return FRAME_KINDS.find((kind) => kind === chosen) ?? toFrameKind(shot.kind);
}

export function buildFramedStyle(
  shot: Pick<CapturedShot, 'kind' | 'isDark' | 'isLandscape'>,
): FramedStyle {
  const state = useFramed.getState();
  return {
    frameKind: resolveFrameKind(shot),
    isDark: shot.isDark,
    isScreenLandscape: shot.isLandscape,
    background: selectFramedBackground(state),
    scope: state.scope,
  };
}

async function frameResult(shot: CapturedShot): Promise<CaptureResult> {
  const style = buildFramedStyle(shot);
  const { result } = shot;
  const groups = result.mode === 'moments' ? result.parts.map((part) => [part]) : [result.parts];
  const images = await Promise.all(
    groups.map((parts) => composeFramedImage(parts, style, LOSSLESS_OUTPUT)),
  );
  const first = images[0];
  return {
    ...result,
    width: first?.width ?? result.width,
    height: first?.height ?? result.height,
    parts: images.map((image) => image.blob),
  };
}

export async function applyFrame(shot: CapturedShot): Promise<CapturedShot> {
  const state = useFramed.getState();
  const isTransparent = state.background === 'transparent';
  return { ...shot, isFramed: true, hasAlpha: isTransparent, result: await frameResult(shot) };
}

export async function createPreviewSource(part: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(part);
    const ratio = Math.min(1, PREVIEW_SOURCE_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await canvas.convertToBlob({ type: 'image/png' });
  } catch {
    return null;
  }
}

export async function composePreview(
  source: Blob,
  shot: Pick<CapturedShot, 'kind' | 'isDark' | 'isLandscape'>,
  isLarge: boolean,
): Promise<Blob> {
  const style: FramedStyle = { ...buildFramedStyle(shot), scope: 'fold' };
  const image = await composeFramedImage(
    [source],
    style,
    LOSSLESS_OUTPUT,
    isLarge ? LARGE_PREVIEW_MAX_SIDE : PREVIEW_MAX_SIDE,
  );
  return image.blob;
}
