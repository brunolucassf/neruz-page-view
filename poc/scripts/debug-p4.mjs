import { launch, openStudio, startFixture, testExtension, waitForFrameStates, sleep } from './harness.mjs';
const stop = startFixture();
await sleep(800);
const probe = await launch(testExtension);
const id = probe.extensionId;
await probe.context.close();
const session = await launch(testExtension, [`--allowlisted-extension-id=${id}`]);
const page = await openStudio(session, 'http://localhost:4321/');
page.on('console', (m) => console.log('studio', m.text()));
session.context.on('page', (p) => { console.log('NEWPAGE', p.url()); p.on('console', (m) => console.log('pg', m.text())); p.on('pageerror', (e) => console.log('pgerr', e.message)); });
session.worker.on('console', (m) => console.log('sw', m.text()));
await waitForFrameStates(page);
await sleep(1500);
await page.click('#record');
for (let i = 0; i < 12; i += 1) {
  await sleep(3000);
  console.log(i, session.context.pages().map((p) => p.url()).join(' '), await page.evaluate(async () => JSON.stringify((await chrome.storage.session.get('recProgress')).recProgress) + (document.body.dataset.record ?? document.body.dataset.error ?? 'pending')).then((v) => v.slice(-500)));
}
await session.context.close();
stop();
