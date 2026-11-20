import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const pocRoot = path.resolve(here, '..');
export const outDir = path.join(pocRoot, 'saidas');
export const testExtension = path.join(pocRoot, 'extensao', '.output-test', 'chrome-mv3');
export const realExtension = path.join(pocRoot, 'extensao', '.output', 'chrome-mv3');
fs.mkdirSync(outDir, { recursive: true });

export function startFixture() {
  const child = spawn(process.execPath, [path.join(pocRoot, 'fixture', 'server.mjs')], { stdio: 'ignore' });
  return () => child.kill();
}

export async function launch(extensionPath, extraArgs = []) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npv-poc-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--window-position=0,0',
      '--window-size=2560,1440',
      ...extraArgs,
    ],
  });
  let worker = context.serviceWorkers()[0];
  worker ??= await context.waitForEvent('serviceworker', { timeout: 15000 });
  const extensionId = new URL(worker.url()).host;
  return { context, extensionId, worker, userDataDir };
}

export async function openStudio({ context, extensionId }, url) {
  const page = await context.newPage();
  const query = url ? `?url=${encodeURIComponent(url)}` : '';
  await page.goto(`chrome-extension://${extensionId}/studio.html${query}`);
  return page;
}

export const background = (page, message) => page.evaluate((m) => chrome.runtime.sendMessage(m), message);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitForFrameStates(page, timeout = 20000) {
  await page.waitForFunction(() => document.body.dataset.frameStates || document.body.dataset.permission === 'missing', null, { timeout });
  return page.evaluate(() => ({
    permission: document.body.dataset.permission,
    states: JSON.parse(document.body.dataset.frameStates ?? 'null'),
    status: document.getElementById('status').textContent,
  }));
}
