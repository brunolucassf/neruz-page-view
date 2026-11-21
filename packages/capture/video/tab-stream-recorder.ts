import type { RecResult, RecStartPayload } from '@neruz/core';
import { createTrackFrameSource } from './frame-source';
import { encodeRecording, type RecordingProgress } from './record-pipeline';

type TabStreamRecordingInput = {
  payload: RecStartPayload;
  onProgress: (progress: RecordingProgress) => void;
  stopSignal: AbortSignal;
};

const MAX_CAPTURE_WIDTH = 3840;
const MAX_CAPTURE_HEIGHT = 2160;
const MAX_CAPTURE_FRAME_RATE = 60;

const openTabStream = (streamId: string) =>
  navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: MAX_CAPTURE_WIDTH,
        maxHeight: MAX_CAPTURE_HEIGHT,
        maxFrameRate: MAX_CAPTURE_FRAME_RATE,
      },
    } as unknown as MediaTrackConstraints,
    audio: false,
  });

export const recordTabStream = async ({
  payload,
  onProgress,
  stopSignal,
}: TabStreamRecordingInput): Promise<RecResult> => {
  const { streamId, ...config } = payload;
  onProgress({ phase: 'starting', elapsedMs: 0, receivedFrames: 0, encodedFrames: 0 });
  const stream = await openTabStream(streamId);
  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error('tab stream has no video track');
  const { blob, result } = await encodeRecording({
    source: createTrackFrameSource(track),
    config,
    onProgress,
    stopSignal,
  });
  return { blobUrl: URL.createObjectURL(blob), ...result };
};
