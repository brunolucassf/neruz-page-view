import {
  type BatchPage,
  type BatchSource,
  type CandidateList,
  MAX_PAGE_LIMIT,
  MIN_PAGE_LIMIT,
} from '@neruz/core';
import { Button } from '@neruz/ui';
import { useEffect } from 'react';
import {
  Checkbox,
  Input,
  Label,
  NumberField,
  ProgressBar,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
} from 'react-aria-components';
import { useShallow } from 'zustand/react/shallow';
import { formatInteger, type MessageKey, t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { downloadExportPart, exportBatch } from './batchExport';
import { type BatchMessage, selectSelectedUrls, selectVisibleUrls, useBatch } from './batchStore';
import './batch.css';

const SOURCE_OPTIONS: { value: BatchSource; label: MessageKey }[] = [
  { value: 'list', label: 'batch.source.list' },
  { value: 'sitemap', label: 'batch.source.sitemap' },
  { value: 'links', label: 'batch.source.links' },
];

const DISCARD_KEYS = [
  'invalid',
  'scheme',
  'tooLong',
  'notPage',
  'duplicate',
  'offOrigin',
  'beyondDepth',
] as const;

const BYTES_PER_MEGABYTE = 1024 * 1024;
const ENTER_STAGGER_LIMIT = 12;
const MS_PER_MINUTE = 60_000;

const translatePlural = (key: MessageKey, count: number, params: Record<string, number> = {}) =>
  t(key, { n: count, count, ...params });

export const useHasUsablePage = () =>
  useStudio((state) => state.pageUrl !== null && state.access === 'granted');

export function BatchSection() {
  const phase = useBatch((state) => state.phase);
  useEffect(() => {
    void useBatch.getState().hydrate();
  }, []);

  return (
    <section className="batch" aria-labelledby="batch-title" data-phase={phase}>
      <h3 id="batch-title" className="capture-panel__label">
        {t('batch.title')}
      </h3>
      <div key={phaseGroup(phase)} className="batch__body">
        {phase === 'reviewing' && <BatchReview />}
        {(phase === 'idle' || phase === 'collecting') && <BatchSetup />}
        {(phase === 'running' || phase === 'paused') && <BatchProgress />}
        {phase === 'exporting' && <BatchExporting />}
        {(phase === 'done' || phase === 'cancelled') && <BatchResult />}
      </div>
    </section>
  );
}

function phaseGroup(phase: string): string {
  if (phase === 'collecting') return 'idle';
  if (phase === 'paused') return 'running';
  if (phase === 'cancelled') return 'done';
  return phase;
}

function MessageLine({ message }: { message: BatchMessage | null }) {
  if (!message) return null;
  return (
    <p className="batch__message" role="alert">
      {t(message.key, message.params)}
    </p>
  );
}

function BatchSetup() {
  const source = useBatch((state) => state.source);
  const phase = useBatch((state) => state.phase);
  const message = useBatch((state) => state.message);
  const hasPage = useHasUsablePage();
  const isCollecting = phase === 'collecting';
  return (
    <div className="batch__stack">
      {!hasPage && <p className="batch__hint">{t('batch.needPage')}</p>}
      <RadioGroup
        className="capture-panel__group"
        value={source}
        orientation="horizontal"
        isDisabled={isCollecting}
        onChange={(value) => useBatch.getState().setSource(value as BatchSource)}
      >
        <Label className="batch__sub-label">{t('batch.source.label')}</Label>
        <div className="segmented">
          {SOURCE_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value} className="segmented__option">
              {t(option.label)}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      {source === 'list' && <ListInput isDisabled={isCollecting} />}
      {source === 'sitemap' && <SitemapInput isDisabled={isCollecting} />}
      {source === 'links' && <p className="batch__hint">{t('batch.links.hint')}</p>}
      <LimitField isDisabled={isCollecting} />
      {isCollecting && (
        <p className="batch__hint batch__hint--busy" role="status">
          {t('batch.collecting')}
        </p>
      )}
      <MessageLine message={message} />
    </div>
  );
}

function ListInput({ isDisabled }: { isDisabled: boolean }) {
  const listText = useBatch((state) => state.listText);
  return (
    <TextField
      className="capture-panel__group"
      value={listText}
      isDisabled={isDisabled}
      onChange={(value) => useBatch.getState().setListText(value)}
    >
      <Label className="batch__sub-label">{t('batch.list.label')}</Label>
      <TextArea
        className="pv-input batch__textarea"
        rows={5}
        spellCheck={false}
        placeholder={t('batch.list.placeholder')}
      />
    </TextField>
  );
}

function SitemapInput({ isDisabled }: { isDisabled: boolean }) {
  const sitemapUrl = useBatch((state) => state.sitemapUrl);
  return (
    <TextField
      className="capture-panel__group"
      value={sitemapUrl}
      isDisabled={isDisabled}
      onChange={(value) => useBatch.getState().setSitemapUrl(value)}
    >
      <Label className="batch__sub-label">{t('batch.sitemap.label')}</Label>
      <Input
        className="pv-input"
        inputMode="url"
        spellCheck={false}
        placeholder={t('batch.sitemap.placeholder')}
      />
      <span className="batch__hint">{t('batch.sitemap.hint')}</span>
    </TextField>
  );
}

function LimitField({ isDisabled }: { isDisabled: boolean }) {
  const pageLimit = useBatch((state) => state.pageLimit);
  return (
    <NumberField
      className="size-field batch__limit"
      value={pageLimit}
      minValue={MIN_PAGE_LIMIT}
      maxValue={MAX_PAGE_LIMIT}
      isDisabled={isDisabled}
      formatOptions={{ useGrouping: false }}
      onChange={(value) => {
        if (!Number.isNaN(value)) useBatch.getState().setPageLimit(value);
      }}
    >
      <Label className="batch__sub-label">{t('batch.limit.label')}</Label>
      <Input className="pv-input pv-tnum size-field__input" />
      <span className="batch__hint">{t('batch.limit.hint', { max: MAX_PAGE_LIMIT })}</span>
    </NumberField>
  );
}

function describeDiscarded(discarded: CandidateList['discarded']): string {
  return DISCARD_KEYS.filter((key) => discarded[key] > 0)
    .map((key) => t(`batch.discard.${key}` as MessageKey, { count: discarded[key] }))
    .join(' · ');
}

function BatchReview() {
  const candidates = useBatch((state) => state.candidates);
  const pageLimit = useBatch((state) => state.pageLimit);
  const deselected = useBatch((state) => state.deselected);
  const sitemapFiles = useBatch((state) => state.sitemapFiles);
  const message = useBatch((state) => state.message);
  const screenCount = useStudio(
    (state) => state.screens.filter((screen) => !screen.isFrozen).length,
  );
  const visible = useBatch(useShallow(selectVisibleUrls));
  const selected = useBatch(useShallow(selectSelectedUrls));
  if (!candidates) return null;
  const cutCount = candidates.urls.length - visible.length;
  const discardedText = describeDiscarded(candidates.discarded);
  const failedFiles = sitemapFiles.filter((file) => file.status === 'failed').length;

  return (
    <div className="batch__stack">
      <div className="batch__facts" role="status">
        <p className="batch__fact-main">
          {translatePlural('batch.review.found', candidates.urls.length)}
        </p>
        <p className="batch__hint">{t('batch.review.limit', { max: pageLimit })}</p>
        {cutCount > 0 && (
          <p className="batch__warn">
            {t('batch.review.limitCut', { count: cutCount, max: pageLimit })}
          </p>
        )}
        {candidates.truncated && (
          <p className="batch__warn">
            {t('batch.review.truncated', { max: candidates.urls.length })}
          </p>
        )}
        {failedFiles > 0 && (
          <p className="batch__warn">{t('batch.review.sitemapFailed', { count: failedFiles })}</p>
        )}
        {discardedText && (
          <p className="batch__hint">{t('batch.review.discarded', { items: discardedText })}</p>
        )}
        <p className="batch__hint pv-tnum">
          {t('batch.review.plan', {
            pages: selected.length,
            screens: screenCount,
            captures: selected.length * screenCount,
          })}
        </p>
      </div>
      <div className="batch__row">
        <Button variant="ghost" onPress={() => useBatch.getState().selectAll()}>
          {t('batch.review.selectAll')}
        </Button>
        <Button variant="ghost" onPress={() => useBatch.getState().clearSelection()}>
          {t('batch.review.deselectAll')}
        </Button>
      </div>
      <ul className="batch__urls" aria-label={t('batch.review.listLabel')}>
        {visible.map((url, position) => (
          <li
            key={url}
            className="batch__url"
            style={{ '--i': Math.min(position, ENTER_STAGGER_LIMIT) } as React.CSSProperties}
          >
            <Checkbox
              className="batch__check"
              isSelected={!deselected.has(url)}
              onChange={() => useBatch.getState().toggleUrl(url)}
            >
              <span className="batch__box" aria-hidden="true" />
              <span className="batch__url-text" title={url}>
                {url}
              </span>
            </Checkbox>
          </li>
        ))}
      </ul>
      <MessageLine message={message} />
      <Button variant="ghost" onPress={() => useBatch.getState().backToSetup()}>
        {t('batch.review.back')}
      </Button>
    </div>
  );
}

function formatEta(etaMs: number | null): string {
  if (etaMs === null) return t('batch.run.etaCalculating');
  if (etaMs < MS_PER_MINUTE) return t('batch.run.etaSoon');
  return t('batch.run.eta', { minutes: Math.ceil(etaMs / MS_PER_MINUTE) });
}

function pauseMessage(reason: string | null): MessageKey {
  if (reason === 'hidden') return 'batch.run.pausedHidden';
  if (reason === 'storage-full') return 'batch.run.pausedStorage';
  return 'batch.run.pausedUser';
}

function BatchProgress() {
  const pages = useBatch((state) => state.pages);
  const currentIndex = useBatch((state) => state.currentIndex);
  const etaMs = useBatch((state) => state.etaMs);
  const phase = useBatch((state) => state.phase);
  const pauseReason = useBatch((state) => state.pauseReason);
  const current = pages.find((page) => page.index === currentIndex);
  const counter = t('batch.run.counter', { current: currentIndex ?? 1, total: pages.length });
  const percent = Math.round(((Math.max(1, currentIndex ?? 1) - 1) / pages.length) * 100);

  return (
    <div className="batch__stack">
      <ProgressBar className="batch__progress" value={percent} aria-label={t('batch.run.title')}>
        <span className="batch__counter pv-tnum">{counter}</span>
        <span className="batch__bar" aria-hidden="true">
          <span className="batch__bar-fill" style={{ transform: `scaleX(${percent / 100})` }} />
        </span>
      </ProgressBar>
      <p className="batch__hint" role="status">
        {phase === 'paused' ? t(pauseMessage(pauseReason)) : formatEta(etaMs)}
      </p>
      {current && (
        <p className="batch__current" title={current.url}>
          {current.url}
        </p>
      )}
      <PageStatusList pages={pages} currentIndex={currentIndex} />
    </div>
  );
}

function PageStatusList({
  pages,
  currentIndex,
}: {
  pages: readonly BatchPage[];
  currentIndex: number | null;
}) {
  return (
    <ol className="batch__pages" aria-label={t('batch.review.listLabel')}>
      {pages.map((page) => (
        <li
          key={page.index}
          className="batch__page"
          data-status={page.status}
          data-current={page.index === currentIndex || undefined}
        >
          <span className="batch__page-index pv-tnum">{page.index}</span>
          <span className="batch__page-url" title={page.url}>
            {page.url}
          </span>
          <span className="batch__page-status">
            {t(`report.status.${page.status}` as MessageKey)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function BatchExporting() {
  const zipRatio = useBatch((state) => state.zipRatio);
  const percent = Math.round(zipRatio * 100);
  return (
    <div className="batch__stack">
      <ProgressBar className="batch__progress" value={percent} aria-label={t('batch.exporting')}>
        <span className="batch__counter">{t('batch.exporting')}</span>
        <span className="batch__bar" aria-hidden="true">
          <span className="batch__bar-fill" style={{ transform: `scaleX(${percent / 100})` }} />
        </span>
      </ProgressBar>
    </div>
  );
}

function formatMegabytes(bytes: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    bytes / BYTES_PER_MEGABYTE,
  );
}

function BatchResult() {
  const phase = useBatch((state) => state.phase);
  const pages = useBatch((state) => state.pages);
  const exportParts = useBatch((state) => state.exportParts);
  const hasFiles = useBatch((state) => state.hasFiles);
  const counts = {
    done: pages.filter((page) => page.status === 'done').length,
    partial: pages.filter((page) => page.status === 'partial').length,
    failed: pages.filter((page) => page.status === 'failed').length,
    skipped: pages.filter((page) => page.status === 'skipped').length,
    cancelled: pages.filter((page) => page.status === 'cancelled').length,
  };
  const withIssues = pages.filter((page) => page.issue !== null);
  const isCancelled = phase === 'cancelled';

  return (
    <div className="batch__stack">
      <div className="batch__facts" role="status">
        <p className="batch__fact-main">
          {t(isCancelled ? 'batch.result.cancelledTitle' : 'batch.result.doneTitle')}
        </p>
        <p className="batch__hint pv-tnum">{t('batch.result.summary', counts)}</p>
      </div>
      {exportParts.length === 0 && isCancelled && hasFiles && (
        <Button variant="primary" onPress={() => void exportBatch()}>
          {t('batch.result.salvage')}
        </Button>
      )}
      {exportParts.length === 0 && !hasFiles && (
        <p className="batch__hint">{t('batch.result.nothing')}</p>
      )}
      {exportParts.length > 0 && (
        <div className="batch__downloads">
          {exportParts.map((part, position) => (
            <Button
              key={part.fileName}
              variant="primary"
              isLarge
              onPress={() => void downloadExportPart(part)}
            >
              {exportParts.length === 1
                ? t('batch.result.download')
                : t('batch.result.downloadPart', { part: position + 1, total: exportParts.length })}
              <span className="batch__size pv-tnum">{formatMegabytes(part.bytes)} MB</span>
            </Button>
          ))}
          <p className="batch__hint">{t('batch.result.reportNote')}</p>
        </div>
      )}
      {withIssues.length > 0 && (
        <div className="batch__issues">
          <h4 className="batch__sub-label">{t('batch.result.issuesTitle')}</h4>
          <ul>
            {withIssues.map((page) => (
              <li key={page.index}>
                <span className="pv-tnum">{formatInteger(page.index)}</span> ·{' '}
                {t(`report.issue.${page.issue}` as MessageKey)}
                <span className="batch__issue-url" title={page.url}>
                  {page.url}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pages.length > 0 && <PageStatusList pages={pages} currentIndex={null} />}
    </div>
  );
}
