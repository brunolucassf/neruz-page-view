import { launch, openStudio, startFixture, testExtension, waitForFrameStates, sleep } from './harness.mjs';
const stop = startFixture();
await sleep(800);
const session = await launch(testExtension);
const page = await openStudio(session, 'http://localhost:4321/');
await waitForFrameStates(page);
await sleep(1500);
for (const type of ['ping', 'metrics', 'waitStable', 'scrollTo']) {
  const r = await page.evaluate(async (t) => {
    const { tabId, frames } = await chrome.runtime.sendMessage({ type: 'frames.get' });
    const started = performance.now();
    const race = await Promise.race([
      chrome.tabs.sendMessage(tabId, { type: t, top: 100 }, { frameId: frames.s1.frameId }),
      new Promise((r) => setTimeout(() => r('TIMEOUT'), 12000)),
    ]);
    return { race, ms: Math.round(performance.now() - started) };
  }, type);
  console.log(type, JSON.stringify(r));
}
await session.context.close();
stop();
