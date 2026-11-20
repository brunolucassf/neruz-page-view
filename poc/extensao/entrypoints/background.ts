import type { BackgroundRequest, ScrollAnchor } from '../lib/shared';

type FrameMap = Record<string, { frameId: number; origin: string }>;

const STUDIO_TABS_KEY = 'studioTabs';
const FRAMES_KEY = 'frames';
const AGENT_SCRIPT_ID = 'frame-agent';
const REMOVED_HEADERS = ['x-frame-options', 'content-security-policy', 'content-security-policy-report-only'];

const stats = { hello: 0, scrollIn: {} as Record<string, number>, scrollOut: {} as Record<string, number>, rejected: 0 };

const extensionOrigin = () => `chrome-extension://${chrome.runtime.id}/`;
const isFromExtensionPage = (sender: chrome.runtime.MessageSender) =>
  sender.id === chrome.runtime.id && !!sender.url?.startsWith(extensionOrigin());

async function readStudioTabs(): Promise<number[]> {
  const stored = await chrome.storage.session.get(STUDIO_TABS_KEY);
  return (stored[STUDIO_TABS_KEY] as number[] | undefined) ?? [];
}

const writeStudioTabs = (tabs: number[]) => chrome.storage.session.set({ [STUDIO_TABS_KEY]: tabs });

async function readFrames(): Promise<Record<string, FrameMap>> {
  const stored = await chrome.storage.session.get(FRAMES_KEY);
  return (stored[FRAMES_KEY] as Record<string, FrameMap> | undefined) ?? {};
}

async function installHeaderRule(tabId: number) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
    addRules: [
      {
        id: tabId,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: REMOVED_HEADERS.map((header) => ({ header, operation: 'remove' })),
        },
        condition: { tabIds: [tabId], resourceTypes: ['sub_frame'] },
      },
    ],
  } as chrome.declarativeNetRequest.UpdateRuleOptions);
}

const removeHeaderRule = (tabId: number) => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });

async function grantedWebOrigins(): Promise<string[]> {
  const { origins = [] } = await chrome.permissions.getAll();
  return origins.filter((origin) => origin === '<all_urls>' || /^https?:\/\//.test(origin));
}

let registrationQueue: Promise<unknown> = Promise.resolve();
const serializeRegistration = <T>(task: () => Promise<T>): Promise<T> => {
  const run = registrationQueue.then(task, task);
  registrationQueue = run.catch(() => undefined);
  return run;
};

const syncFrameAgentRegistration = () => serializeRegistration(applyFrameAgentRegistration);

async function applyFrameAgentRegistration() {
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [AGENT_SCRIPT_ID] });
  if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [AGENT_SCRIPT_ID] });
  const tabs = await readStudioTabs();
  const matches = await grantedWebOrigins();
  if (!tabs.length || !matches.length) return;
  await chrome.scripting.registerContentScripts([
    {
      id: AGENT_SCRIPT_ID,
      js: ['frame-agent.js'],
      matches,
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: 'document_start',
      persistAcrossSessions: false,
    },
  ]);
}

const enableStudio = (tabId: number) =>
  serializeRegistration(async () => {
    const tabs = await readStudioTabs();
    if (!tabs.includes(tabId)) await writeStudioTabs([...tabs, tabId]);
    await installHeaderRule(tabId);
    await applyFrameAgentRegistration();
  });

const disableStudio = (tabId: number) =>
  serializeRegistration(async () => {
    const tabs = (await readStudioTabs()).filter((id) => id !== tabId);
    await writeStudioTabs(tabs);
    await removeHeaderRule(tabId);
    const frames = await readFrames();
    delete frames[tabId];
    await chrome.storage.session.set({ [FRAMES_KEY]: frames });
    await applyFrameAgentRegistration();
  });

async function purgeOrphanRules() {
  const alive: number[] = [];
  for (const tabId of await readStudioTabs()) {
    try {
      await chrome.tabs.get(tabId);
      alive.push(tabId);
    } catch {
      continue;
    }
  }
  await writeStudioTabs(alive);
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const orphanIds = rules.map((rule) => rule.id).filter((id) => !alive.includes(id));
  if (orphanIds.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: orphanIds });
  await syncFrameAgentRegistration();
}

const isScrollAnchor = (value: unknown): value is ScrollAnchor => {
  const anchor = value as ScrollAnchor;
  return (
    !!anchor &&
    (anchor.selector === null || (typeof anchor.selector === 'string' && anchor.selector.length <= 300)) &&
    Number.isFinite(anchor.offsetRatio) &&
    Number.isFinite(anchor.pageRatio) &&
    typeof anchor.sourceScreen === 'string' &&
    /^s[0-9]$/.test(anchor.sourceScreen)
  );
};

async function relayScroll(tabId: number, anchor: ScrollAnchor) {
  stats.scrollIn[anchor.sourceScreen] = (stats.scrollIn[anchor.sourceScreen] ?? 0) + 1;
  const frames = (await readFrames())[tabId] ?? {};
  for (const [screen, { frameId }] of Object.entries(frames)) {
    if (screen === anchor.sourceScreen) continue;
    stats.scrollOut[screen] = (stats.scrollOut[screen] ?? 0) + 1;
    chrome.tabs.sendMessage(tabId, { type: 'scroll.apply', anchor }, { frameId }).catch(() => undefined);
  }
}

let frameWriteQueue: Promise<unknown> = Promise.resolve();
const enqueueFrameWrite = <T>(task: () => Promise<T>): Promise<T> => {
  const run = frameWriteQueue.then(task, task);
  frameWriteQueue = run.catch(() => undefined);
  return run;
};

async function handleFrameMessage(message: BackgroundRequest, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  const studioTabs = await readStudioTabs();
  if (tabId === undefined || !studioTabs.includes(tabId) || !sender.frameId) {
    stats.rejected += 1;
    return { ok: false };
  }
  if (message.type === 'frame.hello') {
    if (!/^s[0-9]$/.test(message.screen)) return { ok: false };
    const screen = message.screen;
    const frameId = sender.frameId;
    await enqueueFrameWrite(async () => {
      const frames = await readFrames();
      frames[tabId] = { ...frames[tabId], [screen]: { frameId, origin: String(message.origin).slice(0, 200) } };
      await chrome.storage.session.set({ [FRAMES_KEY]: frames });
    });
    stats.hello += 1;
    return { ok: true };
  }
  if (message.type === 'scroll' && isScrollAnchor(message.anchor)) {
    await relayScroll(tabId, message.anchor);
    return { ok: true };
  }
  stats.rejected += 1;
  return { ok: false };
}

async function startRecording(tabId: number, message: Extract<BackgroundRequest, { type: 'rec.start' }>) {
  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType] });
  if (!existing.length) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA' as chrome.offscreen.Reason],
      justification: 'Gravar a aba do Estudio com tabCapture',
    });
  }
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  return chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'rec.start',
    streamId,
    rect: message.rect,
    viewport: message.viewport,
    durationMs: message.durationMs,
    outWidth: message.outWidth,
    outHeight: message.outHeight,
  });
}

async function handleStudioMessage(message: BackgroundRequest, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  if (message.type === 'rec.progress') {
    await chrome.storage.session.set({ recProgress: message.log });
    return { ok: true };
  }
  if (message.type === 'stats.get') {
    const rules = await chrome.declarativeNetRequest.getSessionRules();
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    return {
      stats,
      studioTabs: await readStudioTabs(),
      frames: await readFrames(),
      ruleCount: rules.length,
      ruleTabIds: rules.map((rule) => rule.condition.tabIds),
      registeredScripts: scripts.map((script) => script.id),
    };
  }
  if (tabId === undefined) return { ok: false };
  if (message.type === 'studio.enable') {
    await enableStudio(tabId);
    return { ok: true };
  }
  if (message.type === 'studio.disable') {
    await disableStudio(tabId);
    return { ok: true };
  }
  if (message.type === 'frames.get') return { tabId, frames: (await readFrames())[tabId] ?? {} };
  if (message.type === 'rec.start') return startRecording(tabId, message);
  return { ok: false };
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: BackgroundRequest & { target?: string }, sender, sendResponse) => {
    if (message.target === 'offscreen') return false;
    const handler = isFromExtensionPage(sender) ? handleStudioMessage : handleFrameMessage;
    handler(message, sender).then(sendResponse, (error) =>
      sendResponse({ ok: false, error: String(error?.message ?? error) }),
    );
    return true;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    readStudioTabs().then((tabs) => (tabs.includes(tabId) ? disableStudio(tabId) : undefined));
  });
  chrome.permissions.onAdded.addListener(() => void syncFrameAgentRegistration());
  chrome.permissions.onRemoved.addListener(() => void syncFrameAgentRegistration());
  chrome.action.onClicked.addListener(() => void chrome.tabs.create({ url: chrome.runtime.getURL('/studio.html') }));

  void purgeOrphanRules();
});
