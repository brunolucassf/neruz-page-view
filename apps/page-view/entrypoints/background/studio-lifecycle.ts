import { createSerialQueue } from '@neruz/core';
import { syncAgentRegistration } from './agent-registration';
import {
  readAllFrames,
  readDnrRules,
  readStudioTabs,
  writeDnrRules,
  writeFramesOfTab,
  writeStudioTabs,
} from './session-state';
import { installStudioRule, listSessionRuleIds, removeStudioRules } from './studio-rules';

const queue = createSerialQueue();

export const runSerial = queue.run;

export const enableStudioTab = (tabId: number) =>
  queue.run(async () => {
    const tabs = await readStudioTabs();
    const ruleIds = await installStudioRule(tabId);
    await writeStudioTabs(tabs.includes(tabId) ? tabs : [...tabs, tabId]);
    const otherRules = (await readDnrRules()).filter((entry) => entry.tabId !== tabId);
    await writeDnrRules([...otherRules, { tabId, ruleIds }]);
    const grantedOrigins = await syncAgentRegistration(true);
    return { tabId, grantedOrigins, ruleIds };
  });

export const disableStudioTab = (tabId: number) =>
  queue.run(async () => {
    const rules = await readDnrRules();
    const ownedRuleIds = rules
      .filter((entry) => entry.tabId === tabId)
      .flatMap((entry) => entry.ruleIds);
    await removeStudioRules(ownedRuleIds.length ? ownedRuleIds : [tabId]);
    await writeDnrRules(rules.filter((entry) => entry.tabId !== tabId));
    await writeFramesOfTab(tabId, []);
    const tabs = (await readStudioTabs()).filter((id) => id !== tabId);
    await writeStudioTabs(tabs);
    await syncAgentRegistration(tabs.length > 0);
  });

export const syncAgentScripts = () =>
  queue.run(async () => {
    const tabs = await readStudioTabs();
    return { origins: await syncAgentRegistration(tabs.length > 0) };
  });

export const isStudioTab = async (tabId: number) => (await readStudioTabs()).includes(tabId);

export const isTabAlive = async (tabId: number) => {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
};

export const reconcileWithLiveTabs = () =>
  queue.run(async () => {
    const alive: number[] = [];
    for (const tabId of await readStudioTabs()) if (await isTabAlive(tabId)) alive.push(tabId);
    const orphanRuleIds = (await listSessionRuleIds()).filter((id) => !alive.includes(id));
    await removeStudioRules(orphanRuleIds);
    await writeStudioTabs(alive);
    await writeDnrRules((await readDnrRules()).filter((entry) => alive.includes(entry.tabId)));
    for (const entry of await readAllFrames()) {
      if (!alive.includes(entry.tabId)) await writeFramesOfTab(entry.tabId, []);
    }
    await syncAgentRegistration(alive.length > 0);
  });
