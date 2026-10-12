import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('../8.29'),
  out = path.resolve('public');
export async function walk(d) {
  let a = [];
  for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    a.push(...(e.isDirectory() ? await walk(p) : [p]));
  }
  return a;
}
const files = await walk(root);
let records = [],
  counts = {},
  models = {},
  items = {},
  jsons = {},
  totalBytes = 0;
for (let i = 0; i < files.length; i += 32)
  await Promise.all(
    files.slice(i, i + 32).map(async (p) => {
      const b = await fs.readFile(p),
        rel = path.relative(root, p).replaceAll('\\', '/'),
        s = rel.split('/'),
        section =
          s[0] === 'assets' ? (s.length === 3 ? 'metadata' : s[2]) : 'root',
        ns = s[0] === 'assets' ? s[1] : 'pack',
        ext = path.extname(p).slice(1);
      let j;
      if (ext === 'json' || ext === 'mcmeta') {
        try {
          j = JSON.parse(b.toString());
        } catch (e) {
          throw Error(rel + ': ' + e.message);
        }
      }
      if (j) {
        jsons[rel] = j;
        if (section === 'models')
          models[
            ns +
              ':' +
              s
                .slice(3)
                .join('/')
                .replace(/\.json$/, '')
          ] = j;
        if (section === 'items') items[rel] = j;
      }
      const rec = {
        path: rel,
        name: path.basename(p),
        section,
        namespace: ns,
        group: s.slice(3, -1).join('/') || '根目录',
        size: b.length,
        sha256: crypto.createHash('sha256').update(b).digest('hex'),
        ext,
      };
      records.push(rec);
      counts[section] = (counts[section] || 0) + 1;
      totalBytes += b.length;
      await fs.mkdir(path.dirname(path.join(out, 'pack', rel)), {
        recursive: true,
      });
      await fs.writeFile(path.join(out, 'pack', rel), b);
    }),
  );
records.sort((a, b) => a.path.localeCompare(b.path));
await fs.writeFile(
  path.join(out, 'inventory.json'),
  JSON.stringify({
    version: '8.29',
    generatedAt: new Date().toISOString(),
    total: records.length,
    totalBytes,
    counts,
    files: records,
  }),
);
await fs.writeFile(path.join(out, 'model-source.json'), JSON.stringify(models));
await fs.writeFile(path.join(out, 'item-source.json'), JSON.stringify(items));
await fs.writeFile(path.join(out, 'json-source.json'), JSON.stringify(jsons));
console.log(JSON.stringify({ total: records.length, totalBytes, counts }));
