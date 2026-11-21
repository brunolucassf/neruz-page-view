import { Button } from '@neruz/ui';
import { Layers } from 'lucide-react';
import { t } from '../i18n';
import { isRecordingBusy, useRecording } from '../recording/recordingState';
import { useHasUsablePage } from './BatchSection';
import { cancelExport, finishBatch } from './batchExport';
import { cancelBatch, pauseBatch, resumeBatch, skipCurrentPage, startBatch } from './batchRunner';
import {
  cancelCollecting,
  collectLinksSource,
  collectSitemapSource,
  reviewListSource,
} from './batchSources';
import { selectSelectedUrls, useBatch } from './batchStore';

const COLLECT_LABEL = {
  list: 'batch.action.review',
  sitemap: 'batch.action.sitemap',
  links: 'batch.action.links',
} as const;

const collectSource = (source: 'list' | 'sitemap' | 'links') => {
  if (source === 'list') reviewListSource();
  else if (source === 'sitemap') collectSitemapSource();
  else void collectLinksSource();
};

export function BatchFooter() {
  const phase = useBatch((state) => state.phase);
  return (
    <div className="capture-action batch__footer">
      {(phase === 'idle' || phase === 'collecting') && <CollectAction />}
      {phase === 'reviewing' && <StartAction />}
      {(phase === 'running' || phase === 'paused') && <RunControls />}
      {phase === 'exporting' && (
        <Button variant="secondary" className="capture-action__button" onPress={cancelExport}>
          {t('queue.cancel')}
        </Button>
      )}
      {(phase === 'done' || phase === 'cancelled') && (
        <Button
          variant={phase === 'done' ? 'secondary' : 'primary'}
          isLarge
          className="capture-action__button"
          onPress={() => void finishBatch()}
        >
          {t(phase === 'done' ? 'batch.result.new' : 'batch.result.discard')}
        </Button>
      )}
    </div>
  );
}

function CollectAction() {
  const source = useBatch((state) => state.source);
  const phase = useBatch((state) => state.phase);
  const hasPage = useHasUsablePage();
  if (phase === 'collecting') {
    return (
      <Button
        variant="secondary"
        isLarge
        className="capture-action__button"
        onPress={cancelCollecting}
      >
        {t('queue.cancel')}
      </Button>
    );
  }
  return (
    <Button
      variant="primary"
      isLarge
      className="capture-action__button"
      isDisabled={!hasPage}
      onPress={() => collectSource(source)}
    >
      <Layers size={18} strokeWidth={1.75} aria-hidden="true" />
      {t(COLLECT_LABEL[source])}
    </Button>
  );
}

function StartAction() {
  const count = useBatch((state) => selectSelectedUrls(state).length);
  const isRecording = useRecording((state) => isRecordingBusy(state.stage));
  return (
    <Button
      variant="primary"
      isLarge
      className="capture-action__button"
      isDisabled={count === 0 || isRecording}
      onPress={startBatch}
    >
      <Layers size={18} strokeWidth={1.75} aria-hidden="true" />
      {t('batch.cta', { n: count, count })}
    </Button>
  );
}

function RunControls() {
  const phase = useBatch((state) => state.phase);
  const isPaused = phase === 'paused';
  return (
    <div className="batch__controls">
      <Button variant="secondary" onPress={() => (isPaused ? resumeBatch() : pauseBatch('user'))}>
        {t(isPaused ? 'batch.run.resume' : 'batch.run.pause')}
      </Button>
      <Button variant="secondary" onPress={skipCurrentPage}>
        {t('batch.run.skip')}
      </Button>
      <Button variant="ghost" onPress={cancelBatch}>
        {t('batch.run.cancel')}
      </Button>
    </div>
  );
}
