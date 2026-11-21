import {
  DEFAULT_FRAMED_BACKGROUND_COLOR,
  type FramedCapture,
  type FramedCaptureV1,
} from './schemas';

export const migrateFramedCaptureV1ToV2 = (old: FramedCaptureV1): FramedCapture => ({
  isEnabled: old.isEnabled,
  frameDeviceId: old.frameDeviceId,
  background: old.background,
  backgroundColor: DEFAULT_FRAMED_BACKGROUND_COLOR,
  scope: 'fold',
});
