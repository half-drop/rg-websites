import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const base = (process.env.WIKI_BASE_PATH || '/rg-websites/rg-wiki').replace(/\/+$/, '');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd run build' : 'npm run build', {
  shell: true, stdio: 'inherit', env: { ...process.env, WIKI_BASE_PATH: base },
});
if (result.status !== 0) process.exit(result.status || 1);
if (!fs.existsSync('dist/client/index.html')) throw Error('Static homepage was not exported');
fs.writeFileSync('dist/client/.nojekyll', '');
fs.writeFileSync('dist/client/.base-path', base);
