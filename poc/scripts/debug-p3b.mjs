import { launch, openStudio, startFixture, testExtension, waitForFrameStates, sleep } from './harness.mjs';
const stop = startFixture();
await sleep(800);
const session = await launch(testExtension);
const page = await openStudio(session, 'http://localhost:4321/');
await waitForFrameStates(page);
await sleep(1500);
await page.click('#print-experience');
const f = page.frames().find((x) => x.name() === 'npv:s1');
for (let i = 0; i < 10; i += 1) {
  await sleep(2000);
  console.log(i, JSON.stringify(await f.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight, ih: innerHeight, anims: document.getAnimations().map((a) => [a.playState, a.effect?.getComputedTiming().iterations]).slice(0, 5), cls: document.documentElement.className }))));
}
await session.context.close();
stop();
