export const MEASUREMENT_ID = 'G-6M5PDF206S';
export const EXTENSION_NAME = 'neruz-page-view';
export const COLLECT_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const ENGAGEMENT_TIME_MS = 100;
export const MAX_EVENT_NAME_LENGTH = 40;
export const MAX_PARAM_VALUE_LENGTH = 100;

export type AnalyticsPage = 'studio' | 'popup' | 'side_panel' | 'options';
export type AnalyticsParamValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsParamValue>;

export type PayloadInput = {
  clientId: string;
  sessionId: string;
  version: string;
  name: string;
  params?: AnalyticsParams;
};

export type GateInput = {
  hasSecret: boolean;
  isSettingOn: boolean;
  isFirefox: boolean;
  hasFirefoxPermission: boolean;
};

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export const isValidEventName = (name: string) =>
  name.length <= MAX_EVENT_NAME_LENGTH && EVENT_NAME_PATTERN.test(name);

export function canSendAnalytics(gate: GateInput): boolean {
  if (!gate.hasSecret || !gate.isSettingOn) return false;
  return !gate.isFirefox || gate.hasFirefoxPermission;
}

const normalizeValue = (value: AnalyticsParamValue): string | number => {
  if (typeof value === 'string') return value.slice(0, MAX_PARAM_VALUE_LENGTH);
  if (typeof value === 'boolean') return String(value);
  return value;
};

export const buildPageParams = (page: AnalyticsPage): AnalyticsParams => ({
  page_title: page,
  page_location: `extension://${EXTENSION_NAME}/${page}`,
});

export type AnalyticsPayload = {
  client_id: string;
  events: { name: string; params: Record<string, string | number> }[];
};

export function buildPayload(input: PayloadInput): AnalyticsPayload {
  const params = Object.fromEntries(
    Object.entries(input.params ?? {}).map(([key, value]) => [key, normalizeValue(value)]),
  );
  return {
    client_id: input.clientId,
    events: [
      {
        name: input.name,
        params: {
          ...params,
          session_id: input.sessionId,
          engagement_time_msec: ENGAGEMENT_TIME_MS,
          extension_name: EXTENSION_NAME,
          extension_version: input.version,
        },
      },
    ],
  };
}

export const buildCollectUrl = (secret: string, endpoint = COLLECT_ENDPOINT) =>
  `${endpoint}?measurement_id=${MEASUREMENT_ID}&api_secret=${encodeURIComponent(secret)}`;
