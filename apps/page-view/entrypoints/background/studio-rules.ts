import { NpvException } from '@neruz/core';

const FRAMING_HEADERS = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
];

const buildRule = (tabId: number): chrome.declarativeNetRequest.Rule => ({
  id: tabId,
  priority: 1,
  action: {
    type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
    responseHeaders: FRAMING_HEADERS.map((header) => ({
      header,
      operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation,
    })),
  },
  condition: {
    tabIds: [tabId],
    resourceTypes: ['sub_frame' as chrome.declarativeNetRequest.ResourceType],
  },
});

export const installStudioRule = async (tabId: number): Promise<number[]> => {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tabId],
      addRules: [buildRule(tabId)],
    });
    return [tabId];
  } catch (cause) {
    throw new NpvException(
      'NPV-DNR-FAILED',
      String(cause instanceof Error ? cause.message : cause),
    );
  }
};

export const removeStudioRules = async (ruleIds: number[]) => {
  if (!ruleIds.length) return;
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
  } catch (cause) {
    throw new NpvException(
      'NPV-DNR-FAILED',
      String(cause instanceof Error ? cause.message : cause),
    );
  }
};

export const listSessionRuleIds = async (): Promise<number[]> =>
  (await chrome.declarativeNetRequest.getSessionRules()).map((rule) => rule.id);
