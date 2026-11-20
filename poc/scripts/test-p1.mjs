import fs from 'node:fs';
import path from 'node:path';
import { launch, openStudio, startFixture, testExtension, outDir, waitForFrameStates, sleep } from './harness.mjs';

const stopFixture = startFixture();
await sleep(800);
const session = await launch(testExtension);
const report = { sites: [], control: null, login: [], cleanup: null };

const sites = [
  ['fixture sem cabecalhos', 'http://localhost:4321/'],
  ['XFO DENY + frame-ancestors none (local)', 'http://localhost:4322/'],
  ['CSP frame-ancestors self (local)', 'http://localhost:4323/'],
  ['github.com (XFO deny real)', 'https://github.com/'],
  ['linkedin.com (frame-ancestors real)', 'https://www.linkedin.com/'],
  ['wikipedia (controle sem bloqueio)', 'https://en.wikipedia.org/wiki/Main_Page'],
];

const controlPage = await session.context.newPage();
await controlPage.goto('http://localhost:4321/');
for (const port of [4322, 4323]) {
  const state = await controlPage.evaluate(
    (src) => new Promise((resolve) => {
      const frame = document.createElement('iframe');
      frame.onload = () => resolve('load-event');
      frame.src = src;
      document.body.append(frame);
    }),
    `http://localhost:${port}/`,
  );
  await sleep(500);
  const urls = controlPage.frames().map((f) => f.url());
  report.control = { ...(report.control ?? {}), [port]: { state, frameUrls: urls.filter((u) => u.includes(String(port)) || u.startsWith('chrome-error')) } };
}
await controlPage.close();

for (const [label, url] of sites) {
  const page = await openStudio(session, url);
  let result;
  try {
    result = await waitForFrameStates(page, 25000);
  } catch (error) {
    result = { error: String(error).slice(0, 120) };
  }
  await sleep(500);
  const frameUrls = page.frames().filter((f) => f !== page.mainFrame()).map((f) => f.url().slice(0, 80));
  const heading = await page.frames().find((f) => f.name() === 'npv:s1')?.locator('body').innerText({ timeout: 2000 }).then((t) => t.slice(0, 60).replace(/\n/g, ' ')).catch(() => null);
  report.sites.push({ label, url, ...result, frameUrls, s1Text: heading });
  await page.screenshot({ path: path.join(outDir, `p1-${label.replace(/[^a-z0-9]+/gi, '_').slice(0, 30)}.png`) });
  await page.close();
}

for (const mode of ['lax', 'none']) {
  const page = await openStudio(session, `http://localhost:4324/`);
  await sleep(2500);
  const frame = () => page.frames().find((f) => f.name() === 'npv:s1');
  const before = await frame()?.locator('body').innerText().catch(() => null);
  await frame()?.goto(`http://localhost:4324/login?mode=${mode}`).catch(() => null);
  await sleep(800);
  await frame()?.goto('http://localhost:4324/').catch(() => null);
  await sleep(1200);
  const after = await frame()?.locator('body').innerText().then((t) => t.slice(0, 50).replace(/\n/g, ' ')).catch(() => null);
  report.login.push({ mode, before, afterLogin: after, loggedIn: !!after?.includes('Fixture') });
  await page.close();
}

const openPage = await openStudio(session, 'http://localhost:4321/');
await waitForFrameStates(openPage);
const during = await session.worker.evaluate(async () => ({
  rules: (await chrome.declarativeNetRequest.getSessionRules()).map((r) => ({ id: r.id, tabIds: r.condition.tabIds, types: r.condition.resourceTypes, headers: r.action.responseHeaders?.map((h) => h.header) })),
  scripts: (await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id),
}));
await openPage.close();
await sleep(1000);
const after = await session.worker.evaluate(async () => ({
  rules: (await chrome.declarativeNetRequest.getSessionRules()).length,
  scripts: (await chrome.scripting.getRegisteredContentScripts()).length,
}));
report.cleanup = { during, afterClose: after };

fs.writeFileSync(path.join(outDir, 'p1-resultado.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await session.context.close();
stopFixture();
