import { Button as UiButton } from '@neruz/ui';
import { Download, Film } from 'lucide-react';
import { Label, Radio, RadioGroup, Switch } from 'react-aria-components';
import { ProgressBlock } from '../capture/CaptureButton';
import { type MessageKey, t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { downloadVideo, makeGif, runRecording } from './recordingActions';
import type { ScrollSpeed, VideoPreset } from './recordingPlan';
import {
  cancelGif,
  cancelRecording,
  computeRecordingRatio,
  describeRecordingStage,
  isRecordingBusy,
  selectRecordScreen,
  useRecording,
} from './recordingState';
import './recording.css';

const PRESET_OPTIONS: { value: VideoPreset; label: MessageKey }[] = [
  { value: 'vertical', label: 'studio.video.preset.vertical' },
  { value: 'square', label: 'studio.video.preset.square' },
  { value: 'horizontal', label: 'studio.video.preset.horizontal' },
  { value: 'screen', label: 'studio.video.preset.screen' },
];

const SPEED_OPTIONS: { value: ScrollSpeed; label: MessageKey }[] = [
  { value: 'slow', label: 'studio.video.speed.slow' },
  { value: 'normal', label: 'studio.video.speed.normal' },
  { value: 'fast', label: 'studio.video.speed.fast' },
];

const useIsBusy = () => useRecording((state) => isRecordingBusy(state.stage));

export function VideoPanel() {
  return (
    <>
      <ScreenPicker />
      <PresetPicker />
      <SpeedPicker />
      <PausesSwitch />
      <FirefoxNotice />
      <VideoResultSection />
    </>
  );
}

function ScreenPicker() {
  const screens = useStudio((state) => state.screens);
  const activeScreenId = useStudio((state) => state.activeScreenId);
  const chosenScreenId = useRecording((state) => state.chosenScreenId);
  const isBusy = useIsBusy();
  const readyScreens = screens.filter((screen) => screen.status === 'ready');
  const selected = selectRecordScreen({ screens, activeScreenId, chosenScreenId });

  return (
    <RadioGroup
      className="capture-panel__group"
      value={selected?.id ?? ''}
      isDisabled={isBusy || readyScreens.length === 0}
      onChange={(value) =>
        useRecording.setState({ chosenScreenId: value as typeof chosenScreenId })
      }
    >
      <Label className="capture-panel__label">{t('studio.video.screen.label')}</Label>
      <div className="rec-screens">
        {readyScreens.map((screen) => (
          <Radio key={screen.id} value={screen.id} className="rec-screens__option">
            <span className="rec-screens__name">{screen.name}</span>
            <span className="rec-screens__size pv-tnum">
              {screen.width}x{screen.height}
            </span>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function PresetPicker() {
  const preset = useRecording((state) => state.preset);
  const isBusy = useIsBusy();
  return (
    <RadioGroup
      className="capture-panel__group"
      value={preset}
      isDisabled={isBusy}
      onChange={(value) => useRecording.setState({ preset: value as VideoPreset })}
    >
      <Label className="capture-panel__label">{t('studio.video.preset.label')}</Label>
      <div className="rec-screens">
        {PRESET_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} className="rec-screens__option">
            <span className="rec-screens__name">{t(option.label)}</span>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function SpeedPicker() {
  const speed = useRecording((state) => state.speed);
  const isBusy = useIsBusy();
  return (
    <RadioGroup
      className="capture-panel__group"
      value={speed}
      orientation="horizontal"
      isDisabled={isBusy}
      onChange={(value) => useRecording.setState({ speed: value as ScrollSpeed })}
    >
      <Label className="capture-panel__label">{t('studio.video.speed.label')}</Label>
      <div className="segmented">
        {SPEED_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} className="segmented__option">
            {t(option.label)}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function PausesSwitch() {
  const hasPauses = useRecording((state) => state.hasPauses);
  const isBusy = useIsBusy();
  return (
    <Switch
      className="framed__switch"
      isSelected={hasPauses}
      isDisabled={isBusy}
      onChange={(isOn) => useRecording.setState({ hasPauses: isOn })}
    >
      <span className="framed__track" aria-hidden="true">
        <span className="framed__thumb" />
      </span>
      <span className="framed__label">{t('studio.video.pauses.label')}</span>
    </Switch>
  );
}

function FirefoxNotice() {
  if (typeof chrome.offscreen !== 'undefined') return null;
  return <p className="rec-note">{t('studio.video.permission.firefox')}</p>;
}

function VideoResultSection() {
  const result = useRecording((state) => state.result);
  const isMakingGif = useRecording((state) => state.isMakingGif);
  const gifRatio = useRecording((state) => state.gifRatio);
  if (!result) return null;

  return (
    <section className="result" aria-labelledby="video-result-title">
      <div className="result__head">
        <h3 id="video-result-title" className="capture-panel__label">
          {t('studio.video.result.title')}
        </h3>
      </div>
      <p className="rec-meta pv-tnum">
        {t('studio.video.result.meta', {
          format: result.format,
          w: String(result.width),
          h: String(result.height),
          seconds: result.seconds,
          size: result.megabytes,
        })}
      </p>
      {isMakingGif ? (
        <ProgressBlock
          ratio={gifRatio}
          stepLabel={t('studio.video.gif.working')}
          onCancel={cancelGif}
        />
      ) : (
        <div className="result__actions">
          <UiButton variant="secondary" className="result__export" onPress={downloadVideo}>
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('state.success.download')}
          </UiButton>
          <UiButton variant="ghost" onPress={() => void makeGif()}>
            {t('studio.video.gif.cta')}
          </UiButton>
        </div>
      )}
      <p className="rec-note">{t('studio.video.gif.note')}</p>
    </section>
  );
}

export function RecordButton() {
  const stage = useRecording((state) => state.stage);
  const elapsedMs = useRecording((state) => state.elapsedMs);
  const expectedMs = useRecording((state) => state.expectedMs);
  const gestureShortcut = useRecording((state) => state.gestureShortcut);
  const canRecord = useStudio(
    (state) => selectRecordScreen({ ...state, ...useRecording.getState() }) !== undefined,
  );

  if (isRecordingBusy(stage)) {
    const ratio = computeRecordingRatio(stage, elapsedMs, expectedMs);
    return (
      <div className="capture-action">
        <ProgressBlock
          ratio={ratio}
          stepLabel={describeRecordingStage(stage, elapsedMs, gestureShortcut)}
          progressText={stage === 'recording' ? '' : undefined}
          onCancel={cancelRecording}
        />
      </div>
    );
  }
  return (
    <div className="capture-action">
      <UiButton
        variant="primary"
        isLarge
        className="capture-action__button"
        isDisabled={!canRecord}
        onPress={() => void runRecording()}
      >
        <Film size={18} strokeWidth={1.75} aria-hidden="true" />
        {t('studio.video.cta')}
      </UiButton>
    </div>
  );
}
