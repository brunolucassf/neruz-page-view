import { NpvException } from '@neruz/core';

const AGENT_SCRIPT_ID = 'npv-frame-agent';
const AGENT_SCRIPT_FILE = 'content-scripts/frame-agent.js';
const WEB_MATCH_PATTERN = /^(?:https?|\*):\/\/|^<all_urls>$/;

export const listGrantedWebOrigins = async (): Promise<string[]> => {
  const { origins = [] } = await chrome.permissions.getAll();
  return origins.filter((origin) => WEB_MATCH_PATTERN.test(origin));
};

export const syncAgentRegistration = async (hasStudioTabs: boolean): Promise<string[]> => {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [AGENT_SCRIPT_ID],
    });
    if (registered.length)
      await chrome.scripting.unregisterContentScripts({ ids: [AGENT_SCRIPT_ID] });
    const origins = await listGrantedWebOrigins();
    if (!hasStudioTabs || !origins.length) return origins;
    await chrome.scripting.registerContentScripts([
      {
        id: AGENT_SCRIPT_ID,
        js: [AGENT_SCRIPT_FILE],
        matches: origins,
        allFrames: true,
        matchOriginAsFallback: true,
        runAt: 'document_start',
        persistAcrossSessions: false,
      },
    ]);
    return origins;
  } catch (cause) {
    throw new NpvException(
      'NPV-SCRIPT-REGISTER-FAILED',
      String(cause instanceof Error ? cause.message : cause),
    );
  }
};
