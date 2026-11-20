import { launch, openStudio, startFixture, testExtension, waitForFrameStates, sleep } from './harness.mjs';
const stop = startFixture();
await sleep(800);
const session = await launch(testExtension);
const tally = {};
for (const port of [4323, 4321, 4322]) {
  for (let i = 0; i < 12; i += 1) {
    const page = await openStudio(session, `http://localhost:${port}/`);
    const r = await waitForFrameStates(page);
    const key = `${port}:${JSON.stringify(r.states)}`;
    tally[key] = (tally[key] ?? 0) + 1;
    page.close();
    await sleep(Number(process.argv[2] ?? 300));
  }
}
console.log(JSON.stringify(tally, null, 1));
await session.context.close();
stop();
