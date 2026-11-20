import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './async/rate-limiter';
import { createSerialQueue } from './async/serial-queue';
import { withTimeout } from './async/timeout';
import { createEnvelope, okReply, parseEnvelope, unwrapReply } from './messaging/envelope';
import { NpvException } from './messaging/errors';
import { frameHello, frameScroll } from './messaging/frame';
import { buildAnchor, pickAnchorIndex, resolveScrollTop } from './scroll/anchor';
import { registerHello, releaseFrame } from './security/frame-registry';
import { isExtensionPageSender, parseScreenName, parseWebUrl } from './security/sender';

const identity = { runtimeId: 'abc', baseUrl: 'chrome-extension://abc/' };
const info = (frameId: number, screenId: 's1' | 's2') => ({
  frameId,
  screenId,
  presetId: 'iphone-15',
  origin: 'https://a.com',
  helloAt: 1,
});

describe('anchor', () => {
  const sections = [
    { top: 0, height: 800 },
    { top: 800, height: 1000 },
    { top: 1800, height: 100 },
  ];
  it('picks the last tall section at or above scroll', () => {
    expect(pickAnchorIndex(sections, 1000, 800)).toBe(1);
    expect(pickAnchorIndex(sections, 0, 800)).toBe(0);
  });
  it('returns -1 when no section qualifies', () => {
    expect(pickAnchorIndex([{ top: 500, height: 900 }], 0, 800)).toBe(-1);
  });
  it('builds and resolves an anchor across different layouts', () => {
    const anchor = buildAnchor({
      selector: '#a',
      section: sections[1] ?? null,
      scrollY: 1300,
      maxScroll: 4000,
    });
    expect(anchor.offsetRatio).toBeCloseTo(0.5);
    expect(resolveScrollTop(anchor, { top: 2000, height: 400 }, 5000)).toEqual({
      top: 2200,
      usedFallback: false,
    });
  });
  it('falls back to page ratio without section', () => {
    const anchor = buildAnchor({ selector: null, section: null, scrollY: 1000, maxScroll: 4000 });
    expect(resolveScrollTop(anchor, null, 2000)).toEqual({ top: 500, usedFallback: true });
  });
});

describe('sender validation', () => {
  const ok = { id: 'abc', frameId: 0, url: 'chrome-extension://abc/studio.html?url=x' };
  it('accepts only the exact studio page at frame 0', () => {
    expect(isExtensionPageSender(ok, identity, 'studio.html')).toBe(true);
    expect(isExtensionPageSender(ok, identity, 'popup.html')).toBe(false);
    expect(isExtensionPageSender({ ...ok, frameId: 3 }, identity, 'studio.html')).toBe(false);
    expect(isExtensionPageSender({ ...ok, id: 'zzz' }, identity, 'studio.html')).toBe(false);
    expect(
      isExtensionPageSender(
        { ...ok, url: 'https://evil.com/studio.html' },
        identity,
        'studio.html',
      ),
    ).toBe(false);
  });
  it('parses screen names strictly', () => {
    expect(parseScreenName('npv:s1.iphone-15')).toEqual({ screenId: 's1', presetId: 'iphone-15' });
    expect(parseScreenName('npv:s17.x')).toBeNull();
    expect(parseScreenName('npv:s1.X')).toBeNull();
  });
  it('allows only http and https', () => {
    expect(parseWebUrl('https://a.com').ok).toBe(true);
    expect(parseWebUrl('javascript:alert(1)').ok).toBe(false);
  });
});

describe('envelope', () => {
  it('validates payloads and versions', () => {
    const valid = createEnvelope(
      frameScroll,
      { anchor: { selector: null, offsetRatio: 0.2, pageRatio: 0.3 } },
      1,
      2,
    );
    expect(parseEnvelope(frameScroll, valid).ok).toBe(true);
    const bad = parseEnvelope(frameScroll, {
      ...valid,
      payload: { anchor: { selector: null, offsetRatio: 4, pageRatio: 0 } },
    });
    expect(!bad.ok && bad.error.code).toBe('NPV-INVALID-MESSAGE');
    const old = parseEnvelope(frameScroll, { ...valid, v: 2 });
    expect(!old.ok && old.error.code).toBe('NPV-VERSION-MISMATCH');
  });
  it('rejects bad hello and unwraps replies', () => {
    const hello = createEnvelope(
      frameHello,
      { screenId: 's1', presetId: 'a', origin: 'o', url: 'u' },
      1,
    );
    const tampered = { ...hello, payload: { ...hello.payload, screenId: 's99' } };
    expect(parseEnvelope(frameHello, tampered).ok).toBe(false);
    expect(unwrapReply(frameHello, okReply(1, { accepted: true, mirror: true }), 1).mirror).toBe(
      true,
    );
    expect(() => unwrapReply(frameHello, okReply(2, { accepted: true, mirror: true }), 1)).toThrow(
      NpvException,
    );
  });
});

describe('frame registry', () => {
  it('first hello wins until bye', () => {
    const first = registerHello([], info(5, 's1'));
    expect(first.accepted).toBe(true);
    const frames = first.accepted ? first.frames : [];
    expect(registerHello(frames, info(9, 's1')).accepted).toBe(false);
    expect(registerHello(frames, info(5, 's1')).accepted).toBe(true);
    expect(registerHello(releaseFrame(frames, 5), info(9, 's1')).accepted).toBe(true);
  });
});

describe('async helpers', () => {
  it('runs tasks serially even after a failure', async () => {
    const queue = createSerialQueue();
    const order: number[] = [];
    const failing = queue.run(async () => {
      order.push(1);
      throw new Error('x');
    });
    const next = queue.run(async () => order.push(2));
    await expect(failing).rejects.toThrow();
    await next;
    expect(order).toEqual([1, 2]);
  });
  it('times out with NPV-TIMEOUT', async () => {
    await expect(withTimeout(new Promise(() => {}), 10, 't')).rejects.toMatchObject({
      error: { code: 'NPV-TIMEOUT' },
    });
  });
  it('limits events per second', () => {
    let now = 0;
    const limiter = createRateLimiter(2, () => now);
    expect([limiter.tryAcquire(), limiter.tryAcquire(), limiter.tryAcquire()]).toEqual([
      true,
      true,
      false,
    ]);
    now = 1000;
    expect(limiter.tryAcquire()).toBe(true);
  });
});
