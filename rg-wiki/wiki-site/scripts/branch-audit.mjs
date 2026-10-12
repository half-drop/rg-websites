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
const page = await browser.newPage({ viewport: { width: 160, height: 160 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:3000/pack/pack.mcmeta');
await page.setContent('<div id="host" style="width:160px;height:160px"></div>');
const jobs = await page.evaluate(async () => {
  const m = await import('/lib/render-model.mjs'),
    helpers = await import('/lib/models.mjs');
  window.bundle = await m.loadBundle();
  window.stage = new m.ModelStage(document.getElementById('host'));
  window.helpers = helpers;
  const b = window.bundle;
  let jobs = Object.entries(b.items).map(([p, j]) => ({
    path: p,
    parts: helpers.evaluateItem(j.model, {
      'minecraft:display_context:0': 'gui',
    }),
    view: 'gui',
    type: 'item',
  }));
  for (const [p, j] of Object.entries(b.jsons))
    if (p.includes('/blockstates/')) {
      if (j.variants) {
        for (const [key, v] of Object.entries(j.variants))
          for (const [a, apply] of (Array.isArray(v) ? v : [v]).entries())
            jobs.push({
              path: p,
              label: key + ' #' + a,
              parts: [
                {
                  id: apply.model,
                  x: apply.x,
                  y: apply.y,
                  uvlock: apply.uvlock,
                },
              ],
              type: 'blockstate',
            });
      } else if (j.multipart) {
        const keys = [
          ...new Set(j.multipart.flatMap((p) => Object.keys(p.when || {}))),
        ];
        const max = Math.max(
          ...j.multipart.map((p) =>
            Array.isArray(p.apply) ? p.apply.length : 1,
          ),
        );
        for (let mask = 0; mask < 2 ** keys.length; mask++)
          for (let weighted = 0; weighted < max; weighted++)
            jobs.push({
              path: p,
              label: mask + ' #' + weighted,
              state: {
                ...Object.fromEntries(
                  keys.map((k, i) => [k, String(Boolean(mask & (1 << i)))]),
                ),
                weighted,
              },
              parts: [{ id: 'wiki:state' }],
              definition: j,
              type: 'multipart',
            });
      }
    }
  return jobs;
});
let rows = [];
for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i],
    r = await page.evaluate(async (job) => {
      try {
        let b = window.bundle;
        if (job.definition)
          b = {
            ...b,
            resolve: (id) =>
              id === 'wiki:state'
                ? { ...job.definition, textures: {} }
                : window.bundle.resolve(id),
          };
        const result = await window.stage.show(job.parts, b, {
          state: job.state || {},
          view: job.view || 'orbit',
        });
        return {
          path: job.path,
          label: job.label,
          type: job.type,
          meshes: result.meshes,
          notes: result.notes,
          glError: window.stage.renderer.getContext().getError(),
        };
      } catch (e) {
        return {
          path: job.path,
          label: job.label,
          type: job.type,
          error: e.message,
        };
      }
    }, job);
  rows.push(r);
  if ((i + 1) % 200 === 0)
    console.log(
      `Checked ${i + 1}/${jobs.length}; errors=${rows.filter((r) => r.error).length}`,
    );
}
const report = {
  generatedAt: new Date().toISOString(),
  total: rows.length,
  itemDefaults: rows.filter((r) => r.type === 'item').length,
  blockstateVariants: rows.filter((r) => r.type !== 'item').length,
  errors: rows.filter((r) => r.error || r.glError),
  browserErrors: errors,
  rows,
};
await fs.writeFile(
  'public/branch-report.json',
  JSON.stringify(report, null, 2),
);
console.log({ ...report, rows: undefined });
await browser.close();
if (report.errors.length || errors.length) process.exitCode = 1;
