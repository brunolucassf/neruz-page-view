import { MAX_IMAGE_QUALITY, MIN_IMAGE_QUALITY } from '@neruz/core';
import { CutMarks, RotateIcon, Button as UiButton } from '@neruz/ui';
import { ChevronDown } from 'lucide-react';
import { lazy, Suspense } from 'react';
import {
  Button,
  Disclosure,
  DisclosurePanel,
  Heading,
  Input,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components';
import { useBatch } from '../batch/batchStore';
import { ResultSection } from '../export/ResultSection';
import { type MessageKey, t } from '../i18n';
import { isRecordingBusy, type PanelTab, useRecording } from '../recording/recordingState';
import { KIND_LABEL, MAX_SCREEN_SIZE, MIN_SCREEN_SIZE } from '../screens/presets';
import { selectActiveScreen, useStudio } from '../shell/studioStore';
import { CaptureButton } from './CaptureButton';
import {
  type CaptureModeChoice,
  type CaptureTarget,
  type ImageFormat,
  useCapture,
} from './captureStore';
import { FramedSwitch } from './FramedSwitch';
import './capture-panel.css';

const BatchSection = lazy(() =>
  import('../batch/BatchSection').then((module) => ({ default: module.BatchSection })),
);
const VideoPanel = lazy(() =>
  import('../recording/VideoPanel').then((module) => ({ default: module.VideoPanel })),
);
const RecordButton = lazy(() =>
  import('../recording/VideoPanel').then((module) => ({ default: module.RecordButton })),
);

type ModeOption = {
  value: CaptureModeChoice;
  label: MessageKey;
  description: MessageKey;
  isAvailable: boolean;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'fast',
    label: 'studio.capture.mode.quick.label',
    description: 'studio.capture.mode.quick.desc',
    isAvailable: true,
  },
  {
    value: 'experience',
    label: 'studio.capture.mode.experience.label',
    description: 'studio.capture.mode.experience.desc',
    isAvailable: true,
  },
  {
    value: 'moments',
    label: 'studio.capture.mode.moments.label',
    description: 'studio.capture.mode.moments.desc',
    isAvailable: true,
  },
];

const TARGET_OPTIONS: { value: CaptureTarget; label: MessageKey }[] = [
  { value: 'active', label: 'studio.capture.target.active' },
  { value: 'all', label: 'studio.capture.target.all' },
  { value: 'pages', label: 'batch.title' },
];

const FORMAT_OPTIONS: { value: ImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];

export function CapturePanel() {
  const tab = useRecording((state) => state.tab);
  const isVideo = tab === 'video';
  return (
    <aside className="capture-panel" aria-labelledby="capture-title">
      <div className="capture-panel__scroll">
        <h2 id="capture-title" className="capture-panel__title">
          {t('studio.capture.title')}
        </h2>
        <TabSwitch />
        {isVideo ? (
          <Suspense fallback={null}>
            <VideoPanel />
          </Suspense>
        ) : (
          <ImageTabContent />
        )}
      </div>
      <div className="capture-panel__footer">
        {isVideo ? (
          <Suspense fallback={null}>
            <RecordButton />
          </Suspense>
        ) : (
          <CaptureButton />
        )}
        <a
          className="capture-panel__credit"
          href="https://fontedev.com"
          target="_blank"
          rel="noopener"
        >
          {t('settings.credits')}
        </a>
      </div>
    </aside>
  );
}

const TAB_OPTIONS: { value: PanelTab; label: MessageKey }[] = [
  { value: 'image', label: 'studio.capture.tab.image' },
  { value: 'video', label: 'studio.capture.tab.video' },
];

function ImageTabContent() {
  const target = useCapture((state) => state.target);
  const isBatchBusy = useBatch(
    (state) => !['idle', 'collecting', 'reviewing'].includes(state.phase),
  );
  if (target !== 'pages') {
    return (
      <>
        <ActiveScreenSize />
        <ModePicker />
        <TargetPicker />
        <FramedSwitch />
        <AdvancedOptions />
        <ResultSection />
      </>
    );
  }
  return (
    <>
      <TargetPicker />
      <Suspense fallback={null}>
        <BatchSection />
      </Suspense>
      {!isBatchBusy && (
        <>
          <ModePicker />
          <FramedSwitch />
          <AdvancedOptions />
        </>
      )}
    </>
  );
}

function TabSwitch() {
  const tab = useRecording((state) => state.tab);
  const isImageRunning = useCapture((state) => state.isRunning);
  const isVideoRunning = useRecording((state) => isRecordingBusy(state.stage));
  return (
    <RadioGroup
      className="capture-panel__group"
      value={tab}
      orientation="horizontal"
      aria-label={t('studio.capture.tab.label')}
      isDisabled={isImageRunning || isVideoRunning}
      onChange={(value) => useRecording.setState({ tab: value as PanelTab })}
    >
      <div className="segmented">
        {TAB_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} className="segmented__option">
            {t(option.label)}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function ActiveScreenSize() {
  const screen = useStudio(selectActiveScreen);
  const hasPage = useStudio((state) => state.pageUrl !== null);
  const resizeScreen = useStudio((state) => state.resizeScreen);
  const rotateScreen = useStudio((state) => state.rotateScreen);
  if (!screen) return null;

  const commit = (dimension: 'width' | 'height') => (value: number) => {
    if (!Number.isNaN(value)) resizeScreen(screen.id, { [dimension]: value });
  };

  return (
    <section className="capture-panel__group" aria-labelledby="active-screen-title">
      <div className="capture-panel__row">
        <h3 id="active-screen-title" className="capture-panel__label">
          {t('studio.screen.active')} ·{' '}
          <span className="capture-panel__accent">{t(KIND_LABEL[screen.kind])}</span>
        </h3>
        <UiButton variant="ghost" isDisabled={!hasPage} onPress={() => rotateScreen(screen.id)}>
          <RotateIcon size={16} />
          {t('studio.screen.rotate')}
        </UiButton>
      </div>
      <div className="capture-panel__size">
        <NumberField
          className="size-field"
          value={screen.width}
          minValue={MIN_SCREEN_SIZE}
          maxValue={MAX_SCREEN_SIZE}
          formatOptions={{ useGrouping: false }}
          isDisabled={!hasPage}
          onChange={commit('width')}
        >
          <Label className="size-field__label">{t('studio.library.custom.width')}</Label>
          <Input className="pv-input pv-tnum size-field__input" />
        </NumberField>
        <span className="capture-panel__times" aria-hidden="true">
          ×
        </span>
        <NumberField
          className="size-field"
          value={screen.height}
          minValue={MIN_SCREEN_SIZE}
          maxValue={MAX_SCREEN_SIZE}
          formatOptions={{ useGrouping: false }}
          isDisabled={!hasPage}
          onChange={commit('height')}
        >
          <Label className="size-field__label">{t('studio.library.custom.height')}</Label>
          <Input className="pv-input pv-tnum size-field__input" />
        </NumberField>
      </div>
    </section>
  );
}

function ModePicker() {
  const mode = useCapture((state) => state.mode);
  const setMode = useCapture((state) => state.setMode);
  const isRunning = useCapture((state) => state.isRunning);
  return (
    <RadioGroup
      className="capture-panel__group"
      value={mode}
      isDisabled={isRunning}
      onChange={(value) => setMode(value as CaptureModeChoice)}
    >
      <Label className="capture-panel__label">{t('studio.capture.mode.label')}</Label>
      <div className="mode-cards">
        {MODE_OPTIONS.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            isDisabled={!option.isAvailable}
            className="mode-card pv-cut pv-cut--tooth"
          >
            <span className="mode-card__title">
              {t(option.label)}
              {option.value === 'experience' && (
                <span className="mode-card__badge">{t('studio.capture.mode.recommended')}</span>
              )}
            </span>
            <span className="mode-card__description">{t(option.description)}</span>
            <CutMarks className="mode-card__marks" />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function TargetPicker() {
  const target = useCapture((state) => state.target);
  const setTarget = useCapture((state) => state.setTarget);
  const isRunning = useCapture((state) => state.isRunning);
  return (
    <RadioGroup
      className="capture-panel__group"
      value={target}
      orientation="horizontal"
      isDisabled={isRunning}
      onChange={(value) => setTarget(value as CaptureTarget)}
    >
      <Label className="capture-panel__label">{t('studio.capture.target.label')}</Label>
      <div className="segmented">
        {TARGET_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} className="segmented__option">
            {t(option.label)}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function AdvancedOptions() {
  const format = useCapture((state) => state.format);
  const setFormat = useCapture((state) => state.setFormat);
  return (
    <Disclosure className="capture-panel__group advanced">
      <Heading className="advanced__heading">
        <Button slot="trigger" className="advanced__trigger">
          {t('studio.capture.advanced')}
          <ChevronDown
            className="advanced__chevron"
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </Button>
      </Heading>
      <DisclosurePanel className="advanced__panel">
        <RadioGroup
          value={format}
          orientation="horizontal"
          onChange={(value) => setFormat(value as ImageFormat)}
        >
          <Label className="capture-panel__label">{t('studio.capture.advanced.format')}</Label>
          <div className="segmented">
            {FORMAT_OPTIONS.map((option) => (
              <Radio key={option.value} value={option.value} className="segmented__option">
                {option.label}
              </Radio>
            ))}
          </div>
        </RadioGroup>
        {format !== 'png' && <QualitySlider />}
      </DisclosurePanel>
    </Disclosure>
  );
}

function QualitySlider() {
  const quality = useCapture((state) => state.quality);
  const setQuality = useCapture((state) => state.setQuality);
  return (
    <Slider
      className="range"
      minValue={MIN_IMAGE_QUALITY}
      maxValue={MAX_IMAGE_QUALITY}
      step={0.01}
      value={quality}
      onChange={setQuality}
      formatOptions={{ style: 'percent', maximumFractionDigits: 0 }}
    >
      <div className="range__head">
        <Label className="capture-panel__label">{t('studio.capture.advanced.quality')}</Label>
        <SliderOutput className="pv-tnum capture-panel__accent" />
      </div>
      <SliderTrack className="range__track">
        <div className="range__rail" />
        <SliderThumb className="range__thumb" />
      </SliderTrack>
    </Slider>
  );
}
