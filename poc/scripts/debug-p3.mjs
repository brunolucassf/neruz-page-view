import { launch, openStudio, startFixture, testExtension, waitForFrameStates, sleep } from './harness.mjs';
const stop = startFixture();
await sleep(800);
const session = await launch(testExtension);
const page = await openStudio(session, 'http://localhost:4321/');
page.on('console', (m) => console.log('console', m.text()));
page.on('pageerror', (e) => console.log('pageerror', e.message));
await waitForFrameStates(page);
await sleep(1500);
await page.click('#print-experience');
for (let i = 0; i < 20; i += 1) {
  await sleep(3000);
  const info = await page.evaluate(() => ({ trace: document.body.dataset.trace, error: document.body.dataset.error, done: document.body.dataset.print_experience, innerH: innerHeight, dpr: devicePixelRatio }));
  console.log(i, JSON.stringify(info).slice(0, 600));
  if (info.error || info.done) break;
}
await session.context.close();
stop();
