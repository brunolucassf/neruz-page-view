import { describe, expect, it } from 'vitest';
import {
  buildCollectUrl,
  buildPageParams,
  buildPayload,
  canSendAnalytics,
  isValidEventName,
} from './analyticsPayload';

const base = { hasSecret: true, isSettingOn: true, isFirefox: false, hasFirefoxPermission: false };

describe('buildPayload', () => {
  it('keeps session, extension identity and categorical params', () => {
    const body = buildPayload({
      clientId: 'c1',
      sessionId: 's1',
      version: '1.1.0',
      name: 'capture_done',
      params: { mode: 'fast', is_framed: true, screens: 2 },
    });
    expect(body.client_id).toBe('c1');
    expect(body.events[0]).toEqual({
      name: 'capture_done',
      params: {
        mode: 'fast',
        is_framed: 'true',
        screens: 2,
        session_id: 's1',
        engagement_time_msec: 100,
        extension_name: 'neruz-page-view',
        extension_version: '1.1.0',
      },
    });
  });

  it('truncates long values and does not let params override identity', () => {
    const body = buildPayload({
      clientId: 'c',
      sessionId: 's',
      version: '1',
      name: 'x',
      params: { note: 'a'.repeat(300), extension_name: 'evil' },
    });
    expect(String(body.events[0]?.params.note)).toHaveLength(100);
    expect(body.events[0]?.params.extension_name).toBe('neruz-page-view');
  });

  it('builds page_view params without a real page URL', () => {
    expect(buildPageParams('studio')).toEqual({
      page_title: 'studio',
      page_location: 'extension://neruz-page-view/studio',
    });
  });
});

describe('event names and url', () => {
  it('accepts snake_case up to 40 chars only', () => {
    expect(isValidEventName('capture_done')).toBe(true);
    expect(isValidEventName('Capture')).toBe(false);
    expect(isValidEventName('a'.repeat(41))).toBe(false);
  });

  it('targets the measurement id and encodes the secret', () => {
    expect(buildCollectUrl('a b')).toBe(
      'https://www.google-analytics.com/mp/collect?measurement_id=G-6M5PDF206S&api_secret=a%20b',
    );
  });
});

describe('canSendAnalytics', () => {
  it('sends on Chromium with setting on and a secret', () => {
    expect(canSendAnalytics(base)).toBe(true);
  });
  it('blocks when the setting is off', () => {
    expect(canSendAnalytics({ ...base, isSettingOn: false })).toBe(false);
  });
  it('blocks without a secret', () => {
    expect(canSendAnalytics({ ...base, hasSecret: false })).toBe(false);
  });
  it('blocks on Firefox without the data permission', () => {
    expect(canSendAnalytics({ ...base, isFirefox: true })).toBe(false);
  });
  it('sends on Firefox with the data permission', () => {
    expect(canSendAnalytics({ ...base, isFirefox: true, hasFirefoxPermission: true })).toBe(true);
  });
});
