import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  resolver,
  usedTextures,
  previewModel,
  collectItemRefs,
} from '../lib/models.mjs';
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8')),
  inv = await read('public/inventory.json'),
  pack = await read('public/model-source.json'),
  models = { ...(await read('public/vanilla-models.json')), ...pack },
  resolve = resolver(models),
  items = await read('public/item-source.json'),
  van = await read('public/vanilla-source.json');
const textures = {};
for (const [prefix, paths] of [
  ['pack', inv.files.filter((f) => f.ext === 'png').map((f) => f.path)],
  ['vanilla', van.textures],
])
  for (const rel of paths) {
    if (!rel.startsWith('assets/')) continue;
    const seg = rel.split('/'),
      id =
        seg[1] +
        ':' +
        seg
          .slice(3)
          .join('/')
          .replace(/\.png$/, '');
    const b = await fs.readFile(`public/${prefix}/${rel}`);
    let animation;
    try {
      animation = (await read(`public/${prefix}/${rel}.mcmeta`)).animation;
    } catch {}
    textures[id] = {
      url: `/${prefix}/${rel}`,
      width: b.readUInt32BE(16),
      height: b.readUInt32BE(20),
      animation,
    };
  }
const rows = [];
for (const id of Object.keys(pack)) {
  try {
    const { model, templateExample } = previewModel(id, resolve, pack),
      refs = usedTextures(model),
      missing = refs.filter((t) => !textures[t]);
    rows.push({
      id,
      status: missing.length
        ? 'source-missing'
        : templateExample
          ? 'template'
          : 'ok',
      kind: model.multipart
        ? 'multipart'
        : model.elements?.length
          ? 'elements'
          : 'generated',
      elements: model.elements?.length || 0,
      parentChain: model.chain,
      templateExample,
      missingTextures: missing,
      textures: refs,
    });
  } catch (e) {
    rows.push({ id, status: 'error', error: e.message });
  }
}
let itemErrors = [];
for (const [p, j] of Object.entries(items))
  for (const r of collectItemRefs(j.model))
    if (r.id && !models[r.id]) itemErrors.push({ path: p, id: r.id });
const missing = [...new Set(rows.flatMap((r) => r.missingTextures || []))];
for (const id of missing)
  textures[id] = {
    missing: true,
    url: '/missing-texture.svg',
    width: 16,
    height: 16,
  };
await fs.writeFile('public/texture-index.json', JSON.stringify(textures));
await fs.writeFile(
  'public/missing-texture.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill="#b158b8" d="M0 0h16v16H0z"/><path fill="#242029" d="M0 0h8v8H0zM8 8h8v8H8z"/></svg>',
);
const coverage = {
  generatedAt: new Date().toISOString(),
  sourceFiles: inv.total,
  indexedFiles: inv.files.length,
  verifiedFiles: 0,
  missing: [],
  mismatched: [],
};
for (let i = 0; i < inv.files.length; i += 32)
  await Promise.all(
    inv.files.slice(i, i + 32).map(async (f) => {
      try {
        const bytes = await fs.readFile('public/pack/' + f.path),
          original = await fs.readFile('../8.29/' + f.path),
          hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
        if (hash(bytes) !== f.sha256 || hash(original) !== f.sha256)
          coverage.mismatched.push(f.path);
        else coverage.verifiedFiles++;
      } catch {
        coverage.missing.push(f.path);
      }
    }),
  );
coverage.coverage = coverage.verifiedFiles / coverage.sourceFiles;
await fs.writeFile(
  'public/coverage-report.json',
  JSON.stringify(coverage, null, 2),
);
const report = {
  total: rows.length,
  ok: rows.filter((r) => r.status === 'ok').length,
  templates: rows.filter((r) => r.status === 'template').length,
  sourceMissing: rows.filter((r) => r.status === 'source-missing').length,
  errors: rows.filter((r) => r.status === 'error'),
  itemDefinitions: Object.keys(items).length,
  itemErrors,
  vanillaVersion: van.version,
  vanillaModels: van.models.length,
  vanillaTextures: van.textures.length,
  missingTextures: missing,
  rows,
};
await fs.writeFile('public/model-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
console.log(coverage);
if (report.errors.length || itemErrors.length || coverage.coverage !== 1)
  process.exitCode = 1;
