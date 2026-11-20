import fs from 'node:fs';
import path from 'node:path';
import { launch, openStudio, startFixture, testExtension, outDir, waitForFrameStates, background, sleep } from './harness.mjs';

const stopFixture = startFixture();
await sleep(800);
const session = await launch(testExtension);
const page = await openStudio(session, 'http://localhost:4321/');
const loaded = await waitForFrameStates(page);
await sleep(1500);

const frameOf = (name) => page.frames().find((f) => f.name() === name);
const readPosition = (name) =>
  frameOf(name).evaluate(() => {
    const sections = [...document.querySelectorAll('[data-s]')];
    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top + scrollY <= scrollY + 1) current = s;
    const rect = current.getBoundingClientRect();
    return { scrollY: Math.round(scrollY), maxScroll: document.documentElement.scrollHeight - innerHeight, section: current.id, offsetRatio: Number(((scrollY - (rect.top + scrollY)) / rect.height).toFixed(3)) };
  });
const stats = async () => (await background(page, { type: 'stats.get' })).stats;
const centerOf = async (id) => {
  const box = await page.locator(`#${id}`).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 300) };
};

async function wheelOver(id, deltaY, times) {
  const { x, y } = await centerOf(id);
  await page.mouse.move(x, y);
  for (let i = 0; i < times; i += 1) {
    await page.mouse.wheel(0, deltaY);
    await sleep(60);
  }
  await sleep(2500);
}

const result = { loaded };
const before = await stats();
await wheelOver('frame-s1', 300, 14);
const afterPhone = { s1: await readPosition('npv:s1'), s2: await readPosition('npv:s2'), stats: await stats() };
await wheelOver('frame-s2', -200, 8);
const afterDesktop = { s1: await readPosition('npv:s1'), s2: await readPosition('npv:s2'), stats: await stats() };

const statsBeforeSynthetic = await stats();
const s2Before = await readPosition('npv:s2');
await frameOf('npv:s1').evaluate(() => {
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 400 }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
  window.scrollTo({ top: 3000, behavior: 'instant' });
});
await sleep(1500);
const synthetic = { statsBefore: statsBeforeSynthetic, statsAfter: await stats(), s1: await readPosition('npv:s1'), s2Before, s2After: await readPosition('npv:s2') };

Object.assign(result, {
  statsBefore: before,
  afterWheelOnPhone: afterPhone,
  afterWheelOnDesktop: afterDesktop,
  syntheticEvents: synthetic,
});
await page.screenshot({ path: path.join(outDir, 'p2-espelhamento.png') });
fs.writeFileSync(path.join(outDir, 'p2-resultado.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
await session.context.close();
stopFixture();
