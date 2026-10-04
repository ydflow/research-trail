import './build.mjs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const desktop = resolve(root, 'apps/desktop');
const require = createRequire(resolve(desktop, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const electron = require('electron');
const server = await createServer({ root: desktop, configFile: resolve(desktop, 'vite.config.ts'), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const address = server.httpServer.address();
const url = `http://127.0.0.1:${address.port}/`;
const env = { ...process.env, RESEARCH_TRAIL_RENDERER_URL: url, RESEARCH_TRAIL_LAUNCHER_PID: String(process.pid) };
delete env.ELECTRON_RUN_AS_NODE;
// Optional verification policy changes only test networking, never business state.
const args = env.RESEARCH_TRAIL_OFFLINE === '1' ? ['-r', resolve(root, 'scripts/offline/electron.cjs'), desktop] : [desktop];
const child = spawn(electron, args, { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: false });
console.log(`研迹开发页面：${url}（请操作 Electron 窗口）`);
let stopping = false;
const stop = () => { if (!stopping) { stopping = true; child.kill(); } };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('error', async (error) => { console.error('Electron 启动失败：', error.message); await server.close(); process.exitCode = 1; });
child.on('exit', async (code) => { await server.close(); process.exitCode = code ?? 1; });
