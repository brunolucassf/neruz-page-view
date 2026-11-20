import fs from 'node:fs';
import path from 'node:path';
import { launch, openStudio, startFixture, testExtension, outDir, waitForFrameStates, sleep } from './harness.mjs';

const stopFixture = startFixture();
await sleep(800);
const probe = await launch(testExtension);
const { extensionId: knownId } = probe;
await probe.context.close();
const session = await launch(testExtension, [`--allowlisted-extension-id=${knownId}`]);
const page = await openStudio(session, 'http://localhost:4321/');
await waitForFrameStates(page);
await sleep(1500);
const saved = [];
page.on('download', async (download) => {
  const target = path.join(outDir, `p4-${download.suggestedFilename()}`);
  await download.saveAs(target);
  saved.push({ file: path.relative(path.resolve(outDir, '..', '..'), target), bytes: fs.statSync(target).size });
});
await page.click('#record');
const finished = await page.waitForFunction(() => document.body.dataset.record || document.body.dataset.error, null, { timeout: 90000 }).then(() => true).catch(() => false);
await sleep(3000);
const result = {
  finished,
  record: JSON.parse((await page.evaluate(() => document.body.dataset.record)) ?? 'null'),
  error: await page.evaluate(() => document.body.dataset.error ?? null),
  saved,
};
if (result.record) delete result.record.url;
console.log(JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(outDir, 'p4-resultado.json'), JSON.stringify(result, null, 2));
await session.context.close();
stopFixture();
