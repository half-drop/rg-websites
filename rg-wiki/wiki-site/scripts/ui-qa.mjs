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
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
});
await page.goto('http://127.0.0.1:3000/');
await page.waitForSelector('.card');
await page.screenshot({ path: '.cache/catalog.png', fullPage: false });
await page.getByRole('textbox', { name: '搜索资源' }).fill('alchemystand');
await page.locator('.card').filter({ hasText: 'alchemystand' }).first().click();
await page.waitForSelector('canvas[data-loaded="true"]');
await page.getByRole('combobox', { name: '模型视角' }).selectOption('gui');
await page.waitForSelector('canvas[data-loaded="true"]');
await page.getByRole('button', { name: '自动旋转', exact: true }).click();
await page.getByRole('button', { name: '停止旋转', exact: true }).click();
await page.getByRole('button', { name: '重置视角' }).click();
const cases = [
  ['item', 'assets/hypixel_ravengard/items/item/consumables/bandage.json'],
  ['glass', 'assets/minecraft/models/block/pink_stained_glass_pane.json'],
  ['leaves', 'assets/minecraft/models/block/acacia_leaves1.json'],
  ['template', 'assets/minecraft/models/block/leaves1.json'],
  [
    'compass',
    'assets/hypixel_ravengard/models/item/gameplay/trinkets/golden_compass/model.json',
  ],
  [
    'animation',
    'assets/hypixel_ravengard/models/item/decoration/lighting/candel_flame.json',
  ],
  [
    'missing',
    'assets/hypixel_ravengard/models/item/decoration/carts/stalls/market_stall_vegetables.json',
  ],
];
const outcomes = [];
for (const [name, file] of cases) {
  await page.goto('http://127.0.0.1:3000/#' + new URLSearchParams({ file }));
  await page.waitForSelector('canvas[data-loaded="true"]', { timeout: 30000 });
  if (name === 'item') {
    await page
      .getByRole('combobox', {
        name: 'minecraft:custom_model_data:0',
        exact: true,
      })
      .selectOption('RARE');
    await page.waitForSelector('canvas[data-loaded="true"]');
    await page
      .getByRole('combobox', { name: '物品分支', exact: true })
      .selectOption('0');
    await page.waitForSelector('canvas[data-loaded="true"]');
  }
  outcomes.push({
    name,
    status: await page.locator('[role=status]').allTextContents(),
    alerts: await page.locator('.alert').allTextContents(),
  });
  await page.screenshot({ path: `.cache/${name}.png`, fullPage: true });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:3000/');
await page.waitForSelector('.card');
await page.screenshot({ path: '.cache/mobile.png', fullPage: false });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
console.log(JSON.stringify({ outcomes, errors, overflow }, null, 2));
await fs.writeFile(
  'public/ui-report.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      outcomes,
      errors,
      mobileOverflow: overflow,
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length || overflow) process.exitCode = 1;
