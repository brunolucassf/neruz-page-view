import { Button, OctagonLoader } from '@neruz/ui';
import { t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { cancelRecording, describeRecordingStage, useRecording } from './recordingState';

const STATUS_GUTTER_PX = 32;
const STATUS_WIDTH_PX = 320;

export function RecordingStageStatus() {
  const stage = useRecording((state) => state.stage);
  const elapsedMs = useRecording((state) => state.elapsedMs);
  const gestureShortcut = useRecording((state) => state.gestureShortcut);
  const stageWidth = useStudio(
    (state) => state.screens.find((screen) => screen.id === state.captureStageScreenId)?.width ?? 0,
  );
  const hasRoomBesideScreen = stageWidth + STATUS_GUTTER_PX + STATUS_WIDTH_PX <= window.innerWidth;
  const isHiddenToStayOutOfVideo = stage === 'recording' && !hasRoomBesideScreen;
  if (isHiddenToStayOutOfVideo) return null;
  const message = describeRecordingStage(stage, elapsedMs, gestureShortcut);

  return (
    <div
      className="capture-stage-status rec-stage-status"
      style={{ left: stageWidth + STATUS_GUTTER_PX }}
      role="status"
    >
      {stage === 'awaiting-gesture' ? (
        <p className="rec-stage-status__message">{message}</p>
      ) : (
        <OctagonLoader label={message} />
      )}
      <Button variant="secondary" onPress={cancelRecording}>
        {t('queue.cancel')}
      </Button>
    </div>
  );
}
