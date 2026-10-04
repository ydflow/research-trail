const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _electron: electron, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync } = require('node:fs');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');
const desktop = resolve(root, 'apps/desktop');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.RESEARCH_TRAIL_RENDERER_URL;
delete env.RESEARCH_TRAIL_LAUNCHER_PID;
delete env.RESEARCH_TRAIL_PYTHON;

function children(pid) {
  const result = execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `@(Get-CimInstance Win32_Process -Filter "ParentProcessId = ${Number(pid)}" | Where-Object { $_.Name -eq 'python.exe' } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress`,
  ], { encoding: 'utf8', windowsHide: true }).trim();
  const parsed = result ? JSON.parse(result) : [];
  return Array.isArray(parsed) ? parsed : [parsed];
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function screenshot(page, name) {
  if (!process.env.RESEARCH_TRAIL_QA_DIR) return;
  mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
  await page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, name), fullPage: false });
}
async function launch(extraEnv = {}) {
  const app = await electron.launch({ args: [desktop], cwd: root, env: { ...env, ...extraEnv } });
  const page = await app.firstWindow();
  return { app, page, pid: await app.evaluate(() => process.pid) };
}

test('real window, isolated bridge, health, interruption/retry, scoped shutdown', { timeout: 90000 }, async () => {
  const first = await launch();
  let second;
  let firstClosed = false;
  try {
    const errors = [];
    first.page.on('pageerror', (error) => errors.push(error.message));
    await expect(first.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    assert.equal(await first.page.title(), '研迹 · ResearchTrail');
    assert.equal(await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true);
    assert.match(first.page.url(), /dist\/renderer\/index\.html$/);
    assert.deepEqual(await first.page.evaluate(() => ({
      bridge: Object.keys(window.researchTrail).sort(),
      node: typeof window.require,
      process: typeof window.process,
    })), { bridge: ['checkHealth', 'onStatus', 'retryBackend', 'status'], node: 'undefined', process: 'undefined' });
    assert.deepEqual(await first.app.evaluate(({ BrowserWindow }) => {
      const pref = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: pref.sandbox, nodeIntegration: pref.nodeIntegration, contextIsolation: pref.contextIsolation };
    }), { sandbox: true, nodeIntegration: false, contextIsolation: true });
    const original = children(first.pid);
    assert.equal(original.length, 1);
    const oldState = await first.page.evaluate(() => window.researchTrail.status());
    await first.page.getByRole('button', { name: '重新检查' }).click();
    await expect.poll(() => first.page.evaluate(() => window.researchTrail.status().then((s) => s.checkedAt))).not.toBe(oldState.checkedAt);
    await screenshot(first.page, 'healthy.png');
    assert.equal(await first.page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);

    process.kill(original[0]); // Only the Python PID owned by this test instance.
    await expect(first.page.getByRole('heading', { name: '连接未就绪' })).toBeVisible();
    await screenshot(first.page, 'interrupted.png');
    await first.page.getByRole('button', { name: '重试启动' }).click();
    await expect(first.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    const replacement = children(first.pid);
    assert.equal(replacement.length, 1);
    assert.notEqual(replacement[0], original[0]);

    second = await launch();
    await expect(second.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    const unrelated = children(second.pid);
    assert.equal(unrelated.length, 1);
    await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    await expect.poll(() => alive(replacement[0])).toBe(false);
    await expect.poll(() => alive(first.pid)).toBe(false);
    firstClosed = true;
    assert.equal(alive(unrelated[0]), true);
    const healthy = await second.page.evaluate(() => window.researchTrail.checkHealth());
    assert.equal(healthy.phase, 'healthy');
    await second.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    await screenshot(second.page, 'compact.png');
    assert.equal(await second.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await second.app.close();
    await expect.poll(() => alive(unrelated[0])).toBe(false);
    second = undefined;
  } finally {
    if (!firstClosed) await first.app.close();
    if (second) await second.app.close();
  }
});

test('missing Python startup explains failure and retry remains honest', { timeout: 45000 }, async () => {
  const instance = await launch({ RESEARCH_TRAIL_PYTHON: resolve(root, 'missing-python-for-test.exe') });
  try {
    await expect(instance.page.getByText(/未找到 Python 可执行文件/)).toBeVisible();
    await screenshot(instance.page, 'startup-failure.png');
    await instance.page.getByRole('button', { name: '重试启动' }).click();
    await expect(instance.page.getByText(/未找到 Python 可执行文件/)).toBeVisible();
    assert.equal(children(instance.pid).length, 0);
  } finally { await instance.app.close(); }
});

test('Electron forced exit closes owner pipe and backend exits', { timeout: 45000 }, async () => {
  const instance = await launch();
  try {
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    const owned = children(instance.pid);
    assert.equal(owned.length, 1);
    process.kill(instance.pid);
    await expect.poll(() => alive(owned[0]), { timeout: 10000 }).toBe(false);
  } finally { if (alive(instance.pid)) await instance.app.close(); }
});

test('Vite development renderer, CSP, bridge and hot reload', { timeout: 45000 }, async () => {
  const desktopRequire = createRequire(resolve(desktop, 'package.json'));
  const { createServer } = await import(pathToFileURL(desktopRequire.resolve('vite')).href);
  const server = await createServer({ root: desktop, configFile: resolve(desktop, 'vite.config.ts'), server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  let instance;
  try {
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    instance = await launch({ RESEARCH_TRAIL_RENDERER_URL: url, RESEARCH_TRAIL_LAUNCHER_PID: String(process.pid) });
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    instance.page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    assert.equal(instance.page.url(), url);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    assert.equal(await instance.page.evaluate(() => getComputedStyle(document.documentElement).fontFamily.includes('Microsoft YaHei')), true);
    const owned = children(instance.pid);
    assert.equal(owned.length, 1);
    server.ws.send({ type: 'full-reload' });
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await expect(instance.page.getByRole('button', { name: '重新检查' })).toBeEnabled();
    assert.deepEqual(children(instance.pid), owned);
    await screenshot(instance.page, 'development.png');
    assert.deepEqual(errors, []);
    await instance.app.close();
    await expect.poll(() => alive(owned[0])).toBe(false);
    instance = undefined;
  } finally {
    if (instance) await instance.app.close();
    await server.close();
  }
});
