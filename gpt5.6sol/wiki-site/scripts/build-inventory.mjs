import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const localPackRoot = path.resolve(projectRoot, '..', '8.29');
const sharedPackRoot = path.resolve(projectRoot, '..', '..', 'rg-wiki', '8.29');
const packRoot = existsSync(localPackRoot) ? localPackRoot : sharedPackRoot;
if (!existsSync(packRoot)) {
  throw new Error('Resource pack 8.29 was not found beside this site or in the shared rg-wiki directory');
}
const publicRoot = path.join(projectRoot, 'public');
const publicPack = path.join(publicRoot, 'pack');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return nested.flat();
}

const files = await walk(packRoot);
const records = [];
for (let index = 0; index < files.length; index += 48) {
  const batch = files.slice(index, index + 48);
  records.push(...(await Promise.all(
  batch.map(async (absolutePath) => {
    const buffer = await readFile(absolutePath);
    const relativePath = path.relative(packRoot, absolutePath).split(path.sep).join('/');
    const segments = relativePath.split('/');
    const extension = path.extname(relativePath).slice(1).toLowerCase() || 'text';
    const inAssets = segments[0] === 'assets';
    return {
      path: relativePath,
      name: segments.at(-1),
      size: (await stat(absolutePath)).size,
      extension,
      namespace: inAssets ? segments[1] : 'pack-root',
      section: inAssets ? segments[2] ?? 'root' : 'metadata',
      group: inAssets ? segments[3] ?? 'root' : 'root',
      hash: createHash('sha256').update(buffer).digest('hex').slice(0, 12),
    };
  }),
  )));
}

records.sort((a, b) => a.path.localeCompare(b.path, 'en'));
const counts = (key) =>
  Object.fromEntries(
    [...new Set(records.map((record) => record[key]))]
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((value) => [value, records.filter((record) => record[key] === value).length]),
  );

const inventory = {
  title: 'Hypixel Ravengard Resource Pack',
  release: 'PLAYTEST-0.2.0 (26.2)',
  sourceFolder: '8.29',
  packFormat: 88,
  totalFiles: records.length,
  totalBytes: records.reduce((sum, record) => sum + record.size, 0),
  counts: {
    namespace: counts('namespace'),
    section: counts('section'),
    extension: counts('extension'),
  },
  files: records,
};

await mkdir(publicRoot, { recursive: true });
await writeFile(path.join(publicRoot, 'inventory.json'), JSON.stringify(inventory));
await rm(publicPack, { recursive: true, force: true });
await cp(packRoot, publicPack, { recursive: true });
console.log(`Indexed and copied ${records.length} files (${inventory.totalBytes} bytes).`);
