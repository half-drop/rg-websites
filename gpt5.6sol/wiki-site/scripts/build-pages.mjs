import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const base = (process.env.WIKI_BASE_PATH || '/rg-websites/gpt5.6sol').replace(/\/+$/, '');
if (!/^\/(?:[\w.-]+\/?)+$/.test(base) || base.includes('..')) {
  throw new Error('WIKI_BASE_PATH must be an absolute URL path without parent segments');
}
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: projectRoot,
  shell: process.platform === 'win32',
  stdio: 'inherit',
  env: { ...process.env, WIKI_BASE_PATH: base },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const output = path.join(projectRoot, 'dist', 'client');
if (!fs.existsSync(path.join(output, 'index.html'))) throw new Error('Static homepage was not exported');
fs.writeFileSync(path.join(output, '.nojekyll'), '');
fs.writeFileSync(path.join(output, '.base-path'), base);
