import { NpvException, type RecConfig, type RecResult } from '@neruz/core';
import { createVideoElementFrameSource } from './frame-source';
import { encodeRecording, type RecordingProgress } from './record-pipeline';

type DisplayMediaRecordingInput = {
  config: RecConfig;
  onProgress: (progress: RecordingProgress) => void;
  onStarted: () => void;
  stopSignal: AbortSignal;
};

const localBlobUrls = new Set<string>();

export const isLocalBlobUrl = (blobUrl: string) => localBlobUrls.has(blobUrl);

export const revokeLocalBlobUrl = (blobUrl: string) => {
  localBlobUrls.delete(blobUrl);
  URL.revokeObjectURL(blobUrl);
};

const requestDisplayStream = async (frameRate: number) => {
  const constraints = { video: { frameRate }, audio: false, preferCurrentTab: true };
  try {
    return await navigator.mediaDevices.getDisplayMedia(constraints as DisplayMediaStreamOptions);
  } catch (cause) {
    throw new NpvException('NPV-REC-FAILED', 'display capture was refused', {
      reason: cause instanceof Error ? cause.name : 'unknown',
    });
  }
};

const attachToVideo = async (stream: MediaStream) => {
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = stream;
  await video.play();
  if (video.videoWidth === 0) {
    await new Promise<void>((resolve) =>
      video.addEventListener('loadedmetadata', () => resolve(), { once: true }),
    );
  }
  return video;
};

export const recordWithDisplayMedia = async ({
  config,
  onProgress,
  onStarted,
  stopSignal,
}: DisplayMediaRecordingInput): Promise<RecResult> => {
  const stream = await requestDisplayStream(config.fps);
  const track = stream.getVideoTracks()[0];
  if (!track) throw new NpvException('NPV-REC-FAILED', 'display stream has no video track');
  const surface = track.getSettings().displaySurface;
  if (surface !== undefined && surface !== 'browser') {
    track.stop();
    throw new NpvException('NPV-REC-FAILED', 'the chosen surface is not a browser tab', {
      reason: 'wrong-surface',
    });
  }
  const video = await attachToVideo(stream);
  const source = createVideoElementFrameSource(video, track);
  const measuredConfig = {
    ...config,
    viewport: { width: video.videoWidth, height: video.videoHeight },
  };
  onStarted();
  const { blob, result } = await encodeRecording({
    source,
    config: measuredConfig,
    onProgress,
    stopSignal,
  });
  const blobUrl = URL.createObjectURL(blob);
  localBlobUrls.add(blobUrl);
  return { blobUrl, ...result };
};
