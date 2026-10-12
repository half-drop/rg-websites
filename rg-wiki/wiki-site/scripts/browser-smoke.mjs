import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url),
  {
    chromium,
  } = require('C:/Users/10979/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1360, height: 950 } });
let errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(
  'http://127.0.0.1:3000/#file=assets%2Fhypixel_ravengard%2Fmodels%2Fitem%2Ffurniture%2Ftents%2Falchemystand.json',
);
await page.waitForSelector('canvas[data-loaded="true"]', { timeout: 120000 });
await page.screenshot({ path: '.cache/first-model.png', fullPage: true });
console.log({
  errors,
  status: await page.locator('[role=status]').allTextContents(),
});
await browser.close();
