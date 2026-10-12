import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = path.join(root, '.wiki-server.pid');
const url = 'http://127.0.0.1:3000';
const request = (suffix, options = {}) =>
  fetch(url + suffix, { ...options, signal: AbortSignal.timeout(1500) });
try {
  let health;
  try {
    const response = await request('/__wiki_health');
    health = await response.json();
  } catch {}
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (
      health?.application === 'ravengard-829-wiki' &&
      health.pid === state.pid
    ) {
      const response = await request('/__wiki_stop', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + state.token },
      });
      if (!response.ok) throw Error('Could not stop the saved Wiki server.');
      fs.unlinkSync(stateFile);
      console.log('Wiki stopped.');
      process.exit(0);
    }
    fs.unlinkSync(stateFile);
  }
  let occupied = false;
  try {
    await request('/');
    occupied = true;
  } catch {}
  if (occupied) throw Error('Port 3000 is in use. Close that service first.');
  if (!fs.existsSync(path.join(root, 'dist/client/index.html'))) {
    if (!fs.existsSync(path.join(root, 'node_modules'))) {
      const install = spawnSync('npm.cmd ci', {
        cwd: root,
        shell: true,
        stdio: 'inherit',
      });
      if (install.status !== 0) throw Error('Dependency installation failed.');
    }
    const build = spawnSync('npm.cmd run build', {
      cwd: root,
      shell: true,
      stdio: 'inherit',
    });
    if (build.status !== 0) throw Error('Site build failed.');
  }
  const token = randomBytes(24).toString('hex');
  const stdout = fs.openSync(path.join(root, 'server.log'), 'a');
  const stderr = fs.openSync(path.join(root, 'server-error.log'), 'a');
  const child = spawn(
    process.execPath,
    [path.join(root, 'scripts/serve.mjs')],
    {
      cwd: root,
      env: { ...process.env, WIKI_CONTROL_TOKEN: token },
      detached: true,
      windowsHide: true,
      stdio: ['ignore', stdout, stderr],
    },
  );
  child.unref();
  fs.closeSync(stdout);
  fs.closeSync(stderr);
  fs.writeFileSync(stateFile, JSON.stringify({ pid: child.pid, token }));
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const h = await (await request('/__wiki_health')).json();
      if (h.application === 'ravengard-829-wiki' && h.pid === child.pid) {
        ready = true;
        break;
      }
    } catch {}
  }
  if (!ready) throw Error('Wiki did not become ready. See server-error.log.');
  console.log('Wiki started: ' + url);
  if (!process.argv.includes('--no-browser'))
    spawn('cmd.exe', ['/c', 'start', '', url], {
      windowsHide: true,
      stdio: 'ignore',
    }).unref();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
