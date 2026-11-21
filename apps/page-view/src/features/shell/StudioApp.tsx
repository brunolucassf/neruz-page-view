import { OctagonLoader } from '@neruz/ui';
import { useEffect } from 'react';
import { StudioBar } from '../bar/StudioBar';
import { initBatchStorage, removeSessionOnPageHide } from '../batch/batchStorage';
import { Bench } from '../bench/Bench';
import { CapturePanel } from '../capture/CapturePanel';
import { useCapture } from '../capture/captureStore';
import { t, useLocale } from '../i18n';
import { Library } from '../library/Library';
import { RecordingStageStatus } from '../recording/RecordingStageStatus';
import { isRecordingBusy, useRecording } from '../recording/recordingState';
import { SettingsDrawer } from '../settings/SettingsDrawer';
import { ToastRegion } from '../toasts/ToastRegion';
import { ShortcutsDialog, WelcomeDialog } from './Dialogs';
import { useStudio } from './studioStore';
import { useShortcuts } from './useShortcuts';
import './studio.css';

export function StudioApp() {
  const captureStageScreenId = useStudio((state) => state.captureStageScreenId);
  const liveMessage = useStudio((state) => state.liveMessage);
  const isRecording = useRecording((state) => isRecordingBusy(state.stage));
  useLocale((state) => state.locale);
  useShortcuts();

  useEffect(() => {
    void initBatchStorage();
    window.addEventListener('pagehide', removeSessionOnPageHide);
    return () => window.removeEventListener('pagehide', removeSessionOnPageHide);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (captureStageScreenId) root.dataset.captureStage = captureStageScreenId;
    else delete root.dataset.captureStage;
  }, [captureStageScreenId]);

  return (
    <div className="studio">
      <StudioBar />
      <div className="studio__body">
        <Library />
        <Bench />
        <CapturePanel />
      </div>
      <ToastRegion />
      <WelcomeDialog />
      <ShortcutsDialog />
      <SettingsDrawer />
      <div className="live-region" aria-live="polite" role="status">
        {liveMessage}
      </div>
      {captureStageScreenId && (isRecording ? <RecordingStageStatus /> : <CaptureStageStatus />)}
    </div>
  );
}

function CaptureStageStatus() {
  const ratio = useCapture((state) => state.ratio);
  const stepKey = useCapture((state) => state.stepKey);
  const stageWidth = useStudio(
    (state) => state.screens.find((screen) => screen.id === state.captureStageScreenId)?.width ?? 0,
  );
  return (
    <div className="capture-stage-status" style={{ left: stageWidth + 32 }}>
      <OctagonLoader
        label={`${t(stepKey)} · ${t('queue.progress', { percent: Math.round(ratio * 100) })}`}
      />
    </div>
  );
}
