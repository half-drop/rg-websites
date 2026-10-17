import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '_site');
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').at(-1) || 'rg-websites';
const basePath = (process.env.PAGES_BASE_PATH ?? `/${repositoryName}`).replace(/\/+$/, '');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const site of ['rg-wiki', 'gpt5.6sol']) {
  const siteRoot = path.join(root, site, 'wiki-site');
  console.log(`Building ${site} at ${basePath}/${site}/`);
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run build:pages'], {
        cwd: siteRoot, stdio: 'inherit', env: { ...process.env, WIKI_BASE_PATH: `${basePath}/${site}` },
      })
    : spawnSync('npm', ['run', 'build:pages'], {
        cwd: siteRoot, stdio: 'inherit', env: { ...process.env, WIKI_BASE_PATH: `${basePath}/${site}` },
      });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  await cp(path.join(siteRoot, 'dist', 'client'), path.join(output, site), { recursive: true });
  const html = await readFile(path.join(output, site, 'index.html'), 'utf8');
  if (!html.includes(`${basePath}/${site}/`)) throw new Error(`${site}: missing deployment base path`);
}

await cp(path.join(root, 'pages', 'index.html'), path.join(output, 'index.html'));
// Keep the YUNDI concept prototype isolated from the existing wiki sites.
await cp(path.join(root, 'yundi'), path.join(output, 'yundi'), { recursive: true });
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`All websites are ready in ${output}`);
