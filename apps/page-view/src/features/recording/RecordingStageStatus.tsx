import { Button, OctagonLoader } from '@neruz/ui';
import { ArrowUpRight } from 'lucide-react';
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

  if (stage === 'awaiting-gesture') {
    return (
      <div className="capture-stage-status rec-gesture" role="status">
        <ArrowUpRight className="rec-gesture__arrow" size={28} aria-hidden="true" />
        <p className="rec-gesture__title">{t('studio.video.gesture.title')}</p>
        <p className="rec-gesture__message">{message}</p>
        <p className="rec-gesture__hint">{t('studio.video.gesture.pinHint')}</p>
        <Button variant="secondary" onPress={cancelRecording}>
          {t('queue.cancel')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="capture-stage-status rec-stage-status"
      style={{ left: stageWidth + STATUS_GUTTER_PX }}
      role="status"
    >
      <OctagonLoader label={message} />
      <Button variant="secondary" onPress={cancelRecording}>
        {t('queue.cancel')}
      </Button>
    </div>
  );
}
