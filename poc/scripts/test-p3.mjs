import fs from 'node:fs';
import path from 'node:path';
import { launch, openStudio, startFixture, testExtension, outDir, waitForFrameStates, sleep } from './harness.mjs';

const stopFixture = startFixture();
await sleep(800);
const session = await launch(testExtension);
const results = {};

for (const mode of (process.argv[2] ?? 'fast,experience').split(',')) {
  const page = await openStudio(session, 'http://localhost:4321/');
  await waitForFrameStates(page);
  await sleep(1500);
  const saved = [];
  page.on('download', async (download) => {
    const target = path.join(outDir, `p3-${download.suggestedFilename()}`);
    await download.saveAs(target);
    saved.push({ file: path.relative(path.resolve(outDir, '..', '..'), target), bytes: fs.statSync(target).size });
  });
  await page.click(`#print-${mode}`);
  const key = mode === 'fast' ? 'print_fast' : 'print_experience';
  const finished = await page.waitForFunction((k) => document.body.dataset[k] || document.body.dataset.error, key, { timeout: 240000 }).then(() => true).catch(() => false);
  await sleep(2500);
  results[mode] = {
    finished,
    log: JSON.parse((await page.evaluate((k) => document.body.dataset[k], key)) ?? 'null'),
    error: await page.evaluate(() => document.body.dataset.error ?? null),
    saved,
  };
  console.log(mode, JSON.stringify(results[mode]));
  await page.close();
}

fs.writeFileSync(path.join(outDir, 'p3-resultado.json'), JSON.stringify(results, null, 2));
await session.context.close();
stopFixture();
