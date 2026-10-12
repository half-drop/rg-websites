import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url),
  {
    chromium,
  } = require('C:/Users/10979/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
await fs.mkdir('.cache', { recursive: true });
await fs.mkdir('public/thumbnails', { recursive: true });
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 256, height: 256 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
});
await page.goto('http://127.0.0.1:3000/pack/pack.mcmeta');
await page.setContent('<div id="host" style="width:256px;height:256px"></div>');
const ids = await page.evaluate(async () => {
  const m = await import('/lib/render-model.mjs');
  window.bundle = await m.loadBundle();
  window.stage = new m.ModelStage(document.getElementById('host'), {
    transparent: true,
  });
  return Object.keys(window.bundle.pack);
});
let rows = [];
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const r = await page.evaluate(async (id) => {
    try {
      const s = window.stage,
        b = window.bundle,
        result = await s.show([{ id }], b);
      const gl = s.renderer.getContext(),
        pixels = new Uint8Array(256 * 256 * 4);
      gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let visible = 0;
      for (let k = 3; k < pixels.length; k += 4) if (pixels[k] > 0) visible++;
      return {
        id,
        visible,
        glError: gl.getError(),
        ...result,
        png: s.renderer.domElement.toDataURL('image/png').split(',')[1],
      };
    } catch (e) {
      return { id, error: e.stack };
    }
  }, id);
  if (r.png) {
    const [ns, p] = id.split(':'),
      file = `public/thumbnails/assets/${ns}/models/${p}.json.png`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(r.png, 'base64'));
    delete r.png;
  }
  rows.push(r);
  if ((i + 1) % 100 === 0)
    console.log(
      `Rendered ${i + 1}/${ids.length}; errors=${rows.filter((x) => x.error).length}`,
    );
}
const report = {
  generatedAt: new Date().toISOString(),
  total: rows.length,
  rendered: rows.filter((x) => !x.error).length,
  errors: rows.filter((x) => x.error),
  webglErrors: rows.filter((x) => x.glError),
  transparent: rows.filter((x) => !x.error && !x.visible).map((x) => x.id),
  browserErrors: errors,
  rows,
};
await fs.writeFile(
  'public/browser-report.json',
  JSON.stringify(report, null, 2),
);
await page.screenshot({ path: '.cache/audit-last.png' });
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
await browser.close();
if (report.errors.length || report.webglErrors.length || errors.length)
  process.exitCode = 1;
