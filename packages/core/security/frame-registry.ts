import type { FrameInfo } from '../types';

export type HelloOutcome =
  | { accepted: true; frames: FrameInfo[] }
  | { accepted: false; reason: 'screen-taken' };

export const registerHello = (frames: readonly FrameInfo[], candidate: FrameInfo): HelloOutcome => {
  const withoutSameFrame = frames.filter((frame) => frame.frameId !== candidate.frameId);
  const isScreenTaken = withoutSameFrame.some((frame) => frame.screenId === candidate.screenId);
  if (isScreenTaken) return { accepted: false, reason: 'screen-taken' };
  return { accepted: true, frames: [...withoutSameFrame, candidate] };
};

export const releaseFrame = (frames: readonly FrameInfo[], frameId: number): FrameInfo[] =>
  frames.filter((frame) => frame.frameId !== frameId);
