import {
  type CandidateList,
  createCandidateCollector,
  getStudioClient,
  MAX_COLLECTED_LINKS,
  NpvException,
  originPattern,
  parseUrlList,
  studioCollectLinks,
} from '@neruz/core';
import { type Screen, useStudio } from '../shell/studioStore';
import { readSitemap } from './batchSitemap';
import { type BatchMessage, useBatch } from './batchStore';

let collectController: AbortController | null = null;

const failure = (key: BatchMessage['key'], params?: BatchMessage['params']): BatchMessage => ({
  key,
  params,
});

function showCandidates(candidates: CandidateList) {
  if (candidates.urls.length === 0) {
    useBatch.setState({ phase: 'idle', message: failure('batch.error.noPages') });
    return;
  }
  useBatch.setState({ phase: 'reviewing', candidates, deselected: new Set(), message: null });
}

export function reviewListSource(): void {
  const { listText } = useBatch.getState();
  const pageUrl = useStudio.getState().pageUrl ?? undefined;
  if (listText.trim().length === 0) {
    useBatch.setState({ message: failure('batch.error.empty') });
    return;
  }
  useBatch.setState({ sitemapFiles: [] });
  showCandidates(parseUrlList(listText, pageUrl));
}

const readSitemapStart = (): string | null => {
  const typed = useBatch.getState().sitemapUrl.trim();
  const base = useStudio.getState().pageUrl;
  try {
    if (typed) return new URL(/^https?:\/\//i.test(typed) ? typed : `https://${typed}`).href;
    return base ? new URL(base).origin : null;
  } catch {
    return null;
  }
};

const toSitemapMessage = (cause: unknown): BatchMessage => {
  if (cause instanceof NpvException && cause.error.code === 'NPV-PERMISSION-DENIED')
    return failure('batch.error.permission');
  const reason = cause instanceof NpvException ? cause.error.details?.reason : undefined;
  if (reason === 'not-found' || reason === 'http' || reason === 'empty')
    return failure('batch.error.sitemapNotFound');
  return failure('batch.error.sitemapFailed');
};

export function collectSitemapSource(): void {
  const startUrl = readSitemapStart();
  if (!startUrl) {
    useBatch.setState({ message: failure('batch.error.sitemapFailed') });
    return;
  }
  const permission = chrome.permissions.request({ origins: [originPattern(startUrl)] });
  useBatch.setState({ phase: 'collecting', message: null });
  void finishSitemapRead(startUrl, permission);
}

async function finishSitemapRead(startUrl: string, permission: Promise<boolean>): Promise<void> {
  collectController = new AbortController();
  try {
    if (!(await permission))
      throw new NpvException('NPV-PERMISSION-DENIED', 'host permission refused');
    await getStudioClient().syncScripts();
    const result = await readSitemap(startUrl, collectController.signal);
    useBatch.setState({ sitemapFiles: result.files });
    showCandidates(result);
  } catch (cause) {
    useBatch.setState({ phase: 'idle', message: toSitemapMessage(cause) });
  } finally {
    collectController = null;
  }
}

const findLinksScreen = (): Screen | undefined => {
  const { screens, activeScreenId } = useStudio.getState();
  const ready = screens.filter((screen) => screen.status === 'ready' && !screen.isFrozen);
  return ready.find((screen) => screen.id === activeScreenId) ?? ready[0];
};

export async function collectLinksSource(): Promise<void> {
  const screen = findLinksScreen();
  const pageUrl = useStudio.getState().pageUrl;
  if (!screen || !pageUrl) {
    useBatch.setState({ message: failure('batch.error.links') });
    return;
  }
  useBatch.setState({ phase: 'collecting', message: null, sitemapFiles: [] });
  try {
    const { links } = await getStudioClient().command(studioCollectLinks, screen.id, {
      max: MAX_COLLECTED_LINKS,
    });
    const collector = createCandidateCollector('links', { origin: new URL(pageUrl).origin });
    collector.add(pageUrl);
    for (const link of links) collector.add(link.url);
    showCandidates(collector.build());
  } catch {
    useBatch.setState({ phase: 'idle', message: failure('batch.error.links') });
  }
}

export function cancelCollecting(): void {
  collectController?.abort();
  useBatch.setState({ phase: 'idle' });
}
