import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { resolver, usedTextures, previewModel } from '../lib/models.mjs';
const require = createRequire(import.meta.url),
  JSZip = require('C:/Users/10979/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip');
await fs.mkdir('.cache', { recursive: true });
const manifest = await (
  await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
).json();
const entry = manifest.versions.find((v) => v.id === '26.2');
if (!entry) throw Error('26.2 unavailable');
const version = await (await fetch(entry.url)).json();
const client = version.downloads.client;
let bytes;
try {
  bytes = await fs.readFile('.cache/minecraft-26.2.jar');
} catch {
  const r = await fetch(client.url);
  if (!r.ok) throw Error(r.status);
  bytes = Buffer.from(await r.arrayBuffer());
  await fs.writeFile('.cache/minecraft-26.2.jar', bytes);
}
if (crypto.createHash('sha1').update(bytes).digest('hex') !== client.sha1)
  throw Error('Client hash mismatch');
const zip = await JSZip.loadAsync(bytes);
let models = {};
for (const [name, file] of Object.entries(zip.files))
  if (name.startsWith('assets/minecraft/models/') && name.endsWith('.json'))
    models['minecraft:' + name.slice(24, -5)] = JSON.parse(
      await file.async('string'),
    );
await fs.writeFile('.cache/vanilla-models.json', JSON.stringify(models));
const pack = JSON.parse(await fs.readFile('public/model-source.json', 'utf8'));
const all = { ...models, ...pack };
const needed = new Set();
const norm = (id) => (id.includes(':') ? id : 'minecraft:' + id);
function visit(id) {
  id = norm(id);
  if (
    needed.has(id) ||
    id === 'minecraft:builtin/generated' ||
    id === 'minecraft:builtin/entity'
  )
    return;
  needed.add(id);
  const j = all[id];
  if (!j) throw Error('Missing model ' + id);
  if (j.parent) visit(j.parent);
}
const roots = new Set(Object.keys(pack));
const jsons = JSON.parse(await fs.readFile('public/json-source.json', 'utf8'));
function refs(n) {
  if (!n || typeof n !== 'object') return;
  if (typeof n.model === 'string') roots.add(norm(n.model));
  for (const v of Object.values(n)) refs(v);
}
for (const [p, j] of Object.entries(jsons))
  if (
    p.includes('/models/') ||
    p.includes('/items/') ||
    p.includes('/blockstates/')
  )
    refs(j);
[...roots].forEach(visit);
const extra = Object.fromEntries(
  [...needed].filter((id) => !pack[id]).map((id) => [id, all[id]]),
);
let textures = new Set();
const resolve = resolver(all);
for (const id of roots) {
  for (const t of usedTextures(previewModel(id, resolve, all).model))
    textures.add(t);
}
let imported = [];
for (const id of textures) {
  const [ns, p] = id.split(':'),
    rel = `assets/${ns}/textures/${p}.png`;
  try {
    await fs.access('public/pack/' + rel);
    continue;
  } catch {}
  const file = zip.file(rel);
  if (!file) {
    console.log('MISSING_TEXTURE ' + id);
    continue;
  }
  await fs.mkdir('public/vanilla/' + rel.slice(0, rel.lastIndexOf('/')), {
    recursive: true,
  });
  await fs.writeFile('public/vanilla/' + rel, await file.async('nodebuffer'));
  if (zip.file(rel + '.mcmeta'))
    await fs.writeFile(
      'public/vanilla/' + rel + '.mcmeta',
      await zip.file(rel + '.mcmeta').async('nodebuffer'),
    );
  imported.push(rel);
}
await fs.writeFile('public/vanilla-models.json', JSON.stringify(extra));
await fs.writeFile(
  'public/vanilla-source.json',
  JSON.stringify(
    {
      version: '26.2',
      manifest: entry.url,
      client: client.url,
      sha1: client.sha1,
      models: Object.keys(extra),
      textures: imported,
    },
    null,
    2,
  ),
);
console.log({
  vanillaModels: Object.keys(extra).length,
  textures: imported.length,
});
