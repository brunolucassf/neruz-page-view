import { Button, OctagonLoader } from '@neruz/ui';
import { useEffect } from 'react';
import { t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { RecordingBar } from './RecordingBar';
import { stopRecordingNow } from './recordingControls';
import { cancelRecording, describeRecordingStage, useRecording } from './recordingState';

const STATUS_GUTTER_PX = 32;

const useStopOnEscape = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (useRecording.getState().stage === 'recording') void stopRecordingNow();
      else if (useRecording.getState().stage !== 'finalizing') cancelRecording();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};

export function RecordingStageStatus() {
  useStopOnEscape();
  const stage = useRecording((state) => state.stage);
  const elapsedMs = useRecording((state) => state.elapsedMs);
  const gestureShortcut = useRecording((state) => state.gestureShortcut);
  const stageWidth = useStudio(
    (state) => state.screens.find((screen) => screen.id === state.captureStageScreenId)?.width ?? 0,
  );
  if (stage === 'recording') return <RecordingBar />;
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
