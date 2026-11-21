import { animateEnter, Button } from '@neruz/ui';
import { Camera } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { ProgressBar } from 'react-aria-components';
import { t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { cancelCapture, runCapture, useCapture } from './captureStore';

const BatchFooter = lazy(() =>
  import('../batch/BatchFooter').then((module) => ({ default: module.BatchFooter })),
);

export function CaptureButton() {
  const swapRef = useRef<HTMLDivElement>(null);
  const isRunning = useCapture((state) => state.isRunning);
  const target = useCapture((state) => state.target);
  const readyCount = useStudio(
    (state) => state.screens.filter((screen) => screen.status === 'ready').length,
  );
  const isActiveReady = useStudio((state) =>
    state.screens.some((screen) => screen.id === state.activeScreenId && screen.status === 'ready'),
  );
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      return;
    }
    if (swapRef.current) animateEnter(swapRef.current, 0, isRunning ? 200 : 140);
  }, [isRunning]);

  if (target === 'pages')
    return (
      <Suspense fallback={null}>
        <BatchFooter />
      </Suspense>
    );

  const isAllTarget = target === 'all';
  const canCapture = isAllTarget ? readyCount > 0 : isActiveReady;
  const label =
    isAllTarget && readyCount > 1
      ? t('studio.capture.cta.all', { n: readyCount })
      : t('studio.capture.cta');

  return (
    <div ref={swapRef} className="capture-action">
      {isRunning ? (
        <CaptureProgress />
      ) : (
        <Button
          variant="primary"
          isLarge
          className="capture-action__button"
          isDisabled={!canCapture}
          onPress={() => void runCapture()}
        >
          <Camera size={18} strokeWidth={1.75} aria-hidden="true" />
          {label}
        </Button>
      )}
    </div>
  );
}

function CaptureProgress() {
  const ratio = useCapture((state) => state.ratio);
  const stepKey = useCapture((state) => state.stepKey);
  return <ProgressBlock ratio={ratio} stepLabel={t(stepKey)} onCancel={cancelCapture} />;
}

type ProgressBlockProps = {
  ratio: number;
  stepLabel: string;
  onCancel: () => void;
  progressText?: string;
};

export function ProgressBlock({ ratio, stepLabel, onCancel, progressText }: ProgressBlockProps) {
  const percent = Math.round(ratio * 100);
  const valueText = progressText ?? t('queue.progress', { percent });

  return (
    <div className="capture-progress">
      <ProgressBar
        className="capture-progress__bar pv-cut"
        value={percent}
        aria-label={stepLabel}
        valueLabel={valueText}
      >
        <span className="capture-progress__text">
          <span className="capture-progress__step">{stepLabel}</span>
          <span className="pv-tnum">{valueText}</span>
        </span>
        <span
          className="capture-progress__clip"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
          aria-hidden="true"
        >
          <span className="capture-progress__fill">
            <span className="capture-progress__text">
              <span className="capture-progress__step">{stepLabel}</span>
              <span className="pv-tnum">{valueText}</span>
            </span>
          </span>
        </span>
      </ProgressBar>
      <Button variant="secondary" className="capture-progress__cancel" onPress={onCancel}>
        {t('queue.cancel')}
      </Button>
    </div>
  );
}
