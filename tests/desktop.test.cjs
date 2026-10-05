const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _electron: electron, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync, mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
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

test('settings: independent fake health, native credentials, profile, redacted export and restart', { timeout: 90000 }, async () => {
  const work = mkdtempSync(resolve(tmpdir(), 'research-trail-settings-qa-'));
  const databasePath = resolve(work, 'settings.sqlite3');
  const sentinel = 'test-only-desktop-credential-no-real-service';
  const reportPath = resolve(work, 'diagnostics.json');
  let instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    page.on('dialog', dialog => void dialog.accept());
  };
  watch(instance.page);
  try {
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
    assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
    await instance.page.getByRole('button', { name: '设置与诊断', exact: true }).click();
    const model = instance.page.getByTestId('connection-model');
    await expect(model.getByTestId('connection-status')).toHaveText('未配置');
    await screenshot(instance.page, 'step8-overview.png');
    await model.getByLabel('服务地址').fill('https://203.0.113.1/v1');
    await model.getByLabel('模型名称').fill('demo-model');
    await model.getByLabel('测试前要求已保存凭证').check();
    await model.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('已失效');
    await model.getByLabel('新凭证').fill(sentinel);
    await model.getByRole('button', { name: '保存凭证', exact: true }).click();
    await expect(model).toContainText('已保存（不回显）');
    await expect(model.getByLabel('新凭证')).toHaveValue('');
    await model.getByRole('button', { name: '测试假连接', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('假连接成功');
    await model.getByLabel('模型名称').fill('demo-model-updated');
    await expect(model.getByRole('button', { name: '测试假连接', exact: true })).toBeDisabled();
    await model.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('已失效');
    await model.getByRole('button', { name: '测试假连接', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('假连接成功');
    await instance.page.getByRole('button', { name: '重新读取状态', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('假连接成功');
    const before = await instance.page.evaluate(() => window.researchTrail.connections());
    assert.equal(before.filter(row => row.kind !== 'model').every(row => row.status === 'unconfigured'), true);
    assert.equal(JSON.stringify(before).includes(sentinel), false);
    assert.equal(await instance.page.evaluate(value => Object.values(sessionStorage).some(item => item.includes(value)), sentinel), false);
    await screenshot(instance.page, 'step8-model.png');
    await instance.page.getByRole('button', { name: '连接设置', exact: true }).click();
    for (const [kind, result, status] of [['market', 'failure', '失败'], ['account', 'invalid', '已失效']]) {
      const card = instance.page.getByTestId(`connection-${kind}`);
      await expect(card.getByTestId('connection-status')).toHaveText('未配置');
      await card.getByLabel('假连接结果').selectOption(result);
      await card.getByRole('button', { name: '保存配置', exact: true }).click();
      await expect(card.getByTestId('connection-status')).toHaveText('待测试');
      await card.getByRole('button', { name: '测试假连接', exact: true }).click();
      await expect(card.getByTestId('connection-status')).toHaveText(status);
    }
    await expect(instance.page.getByTestId('connection-skills').getByTestId('connection-status')).toHaveText('未配置');
    await expect(instance.page.getByTestId('connection-runtime').getByTestId('connection-status')).toHaveText('未配置');
    await screenshot(instance.page, 'step8-connections.png');
    await instance.page.getByRole('button', { name: '个人资料', exact: true }).click();
    await instance.page.getByLabel('显示名称').fill('第8步研究者');
    await instance.page.getByLabel('研究偏好').selectOption('cautious');
    await instance.page.getByRole('button', { name: '保存资料', exact: true }).click();
    await expect(instance.page.getByRole('status')).toContainText('个人资料已保存');
    await instance.page.getByRole('button', { name: '诊断', exact: true }).click();
    await instance.page.getByRole('button', { name: '读取诊断', exact: true }).click();
    await expect(instance.page.getByTestId('diagnostics-json')).toContainText('DEMO_FAILED');
    const diagnostic = await instance.page.getByTestId('diagnostics-json').innerText();
    for (const value of [sentinel, '203.0.113.1', '第8步研究者', 'credential_ref', databasePath]) assert.equal(diagnostic.includes(value), false);
    await instance.app.evaluate(({ dialog }, path) => {
      globalThis.originalSettingsSaveDialog = dialog.showSaveDialog;
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
    }, reportPath);
    await instance.page.getByRole('button', { name: '导出脱敏诊断', exact: true }).click();
    await expect(instance.page.getByRole('status')).toContainText('脱敏诊断已保存');
    const file = readFileSync(reportPath, 'utf8');
    assert.equal(JSON.parse(file).real_requests_sent, false);
    for (const value of [sentinel, '203.0.113.1', '第8步研究者', databasePath]) assert.equal(file.includes(value), false);
    await instance.app.evaluate(({ dialog }) => { dialog.showSaveDialog = globalThis.originalSettingsSaveDialog; });
    await screenshot(instance.page, 'step8-diagnostics.png');
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    await instance.page.getByRole('button', { name: '连接设置', exact: true }).click();
    await expect(instance.page.getByRole('button', { name: '连接设置', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(instance.page.getByTestId('connection-market')).toBeVisible();
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await screenshot(instance.page, 'step8-compact.png');
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    const saved = await instance.page.evaluate(() => window.researchTrail.connections());
    const owned = children(instance.pid);
    await instance.app.close();
    await expect.poll(() => owned.every(pid => !alive(pid))).toBe(true);
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
    watch(instance.page);
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    assert.deepEqual(await instance.page.evaluate(() => window.researchTrail.connections()), saved);
    assert.equal((await instance.page.evaluate(() => window.researchTrail.profile())).display_name, '第8步研究者');
    await instance.page.getByRole('button', { name: '设置与诊断', exact: true }).click();
    await expect(instance.page.getByTestId('connection-model')).toContainText('已保存（不回显）');
    await instance.page.getByTestId('connection-model').getByRole('button', { name: '删除凭证', exact: true }).click();
    await expect(instance.page.getByTestId('connection-model').getByTestId('connection-status')).toHaveText('已失效');
    await instance.page.getByTestId('connection-model').getByRole('button', { name: '删除配置', exact: true }).click();
    await expect(instance.page.getByTestId('connection-model').getByTestId('connection-status')).toHaveText('未配置');
    await assert.rejects(instance.page.evaluate(() => window.researchTrail.testConnection('../health')), /未知连接类别/);
    await instance.page.getByRole('button', { name: '个人资料', exact: true }).click();
    await instance.page.getByRole('button', { name: '删除资料', exact: true }).click();
    await expect(instance.page.getByLabel('显示名称')).toHaveValue('');
    assert.deepEqual(errors, []);
  } finally {
    // Remove only this test's generated system-vault entry, never enumerate other apps.
    try { await instance.page.evaluate(() => window.researchTrail.deleteConnection('model')); } catch {}
    await instance.app.close();
    const python = resolve(root, 'services/backend/.venv/Scripts/python.exe');
    execFileSync(python, ['-c', 'import sqlite3,sys; from hashlib import sha256; from research_trail.credentials import WindowsCredentialVault; from pathlib import Path; p=Path(sys.argv[1]).resolve(); n=sha256(str(p).casefold().encode()).hexdigest()[:32]; c=sqlite3.connect(p); refs=[r[0] for r in c.execute("select credential_ref from connections where credential_ref is not null")]; c.close(); v=WindowsCredentialVault(); [v.delete("ResearchTrail/"+n+"/"+r) for r in refs]', databasePath], { cwd: resolve(root, 'services/backend'), env, windowsHide: true });
  }
});
async function screenshot(page, name) {
  if (!process.env.RESEARCH_TRAIL_QA_DIR) return;
  mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
  await page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, name), fullPage: false, animations: 'disabled' });
}
async function launch(extraEnv = {}) {
  const databasePath = extraEnv.RESEARCH_TRAIL_DB_PATH || resolve(mkdtempSync(resolve(tmpdir(), 'research-trail-qa-')), 'test.sqlite3');
  // Playwright deliberately removes NODE_OPTIONS from Electron's environment.
  // Load the same offline guard explicitly, before the application entry point.
  const args = env.RESEARCH_TRAIL_OFFLINE === '1' ? ['-r', resolve(root, 'scripts/offline/electron.cjs'), desktop] : [desktop];
  const app = await electron.launch({ args, cwd: root, env: { ...env, RESEARCH_TRAIL_DB_PATH: databasePath, ...extraEnv } });
  const page = await app.firstWindow();
  return { app, page, pid: await app.evaluate(() => process.pid), databasePath };
}

test('real window, isolated bridge, health, interruption/retry, scoped shutdown', { timeout: 90000 }, async () => {
  const first = await launch();
  let second;
  let firstClosed = false;
  try {
    const errors = [];
    first.page.on('pageerror', (error) => errors.push(error.message));
    await expect(first.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    if (process.env.RESEARCH_TRAIL_OFFLINE === '1') {
      assert.equal(await first.app.evaluate(() => globalThis[Symbol.for('research-trail.offline')]), true);
      assert.equal(await first.app.evaluate(() => {
        const socket = new (process.getBuiltinModule('node:net').Socket)();
        try { socket.connect({ host: '203.0.113.1', port: 443 }); return false; }
        catch (error) { return error.message.includes('Offline verification'); }
        finally { socket.destroy(); }
      }), true);
      assert.equal(await first.app.evaluate(async ({ BrowserWindow }) => {
        try {
          await BrowserWindow.getAllWindows()[0].webContents.session.fetch('http://203.0.113.1/');
          return false;
        } catch (error) { return error.message.includes('ERR_BLOCKED_BY_CLIENT'); }
      }), true);
    }
    assert.equal(await first.page.title(), '研迹 · ResearchTrail');
    assert.equal(await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true);
    assert.match(first.page.url(), /dist\/renderer\/index\.html$/);
    assert.deepEqual(await first.page.evaluate(() => ({
      bridge: Object.keys(window.researchTrail).sort(),
      node: typeof window.require,
      process: typeof window.process,
    })), { bridge: ['checkHealth', 'marketSnapshot', 'marketSymbols', 'onStatus', 'retryBackend', 'status',
      'listSessions', 'createSession', 'getSession', 'deleteSession', 'sessionMessages', 'sessionRuns', 'sessionSnapshot', 'startRun', 'startAgentRun', 'cancelRun', 'getRun', 'runEvents', 'subscribeRun',
      'connections', 'saveConnection', 'deleteConnection', 'saveCredential', 'deleteCredential', 'testConnection', 'profile', 'saveProfile', 'deleteProfile', 'diagnostics', 'exportDiagnostics'].sort(), node: 'undefined', process: 'undefined' });
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
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'AAPL.US');
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

test('four fixture stocks, actual canvas loader, unknown symbol, repeat provenance and shutdown', { timeout: 60000 }, async () => {
  const instance = await launch();
  let closed = false;
  try {
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    const expected = { 'AAPL.US': '189.43', 'NVDA.US': '880.12', 'MSFT.US': '412.60', 'TSLA.US': '175.22' };
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    for (const [symbol, price] of Object.entries(expected)) {
      await instance.page.getByRole('button', { name: symbol, exact: true }).click();
      await expect(instance.page.getByTestId('quote-card')).toHaveAttribute('data-symbol', symbol);
      await expect(instance.page.getByTestId('quote-price')).toHaveText(price);
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', symbol);
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-close', String(Number(price)));
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-count', '10');
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-visible-from', '0');
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-visible-to', '10');
      const geometry = await instance.page.getByTestId('chart-canvas').evaluate((el) => ({
        x: Number(el.dataset.lastX), y: Number(el.dataset.lastY), width: el.clientWidth, height: el.clientHeight,
      }));
      assert.ok(geometry.x >= 0 && geometry.x < geometry.width && geometry.y >= 0 && geometry.y < geometry.height, JSON.stringify(geometry));
      assert.ok(await instance.page.getByTestId('chart-canvas').locator('canvas').count() > 0);
      await expect(instance.page.getByTestId('market-time')).toHaveText('2024-01-16 21:00:00.000 UTC');
    }
    const before = await instance.page.getByTestId('fetched-at').textContent();
    await instance.page.getByRole('button', { name: '重新查询', exact: true }).click();
    await expect(instance.page.getByTestId('fetched-at')).not.toHaveText(before);
    await expect(instance.page.getByTestId('quote-price')).toHaveText('175.22');
    await expect(instance.page.getByTestId('market-time')).toHaveText('2024-01-16 21:00:00.000 UTC');
    await expect(instance.page.getByText('模拟数据 · 固定示例')).toBeVisible();
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-visible-to', '10');
    await instance.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'market-tsla.png'), fullPage: true });
    }
    await instance.page.getByLabel('查询代码', { exact: true }).fill('ZZZZ.US');
    await instance.page.getByRole('button', { name: '查询', exact: true }).click();
    await expect(instance.page.getByRole('alert')).toContainText('未知股票代码：ZZZZ.US');
    assert.equal(await instance.page.getByTestId('quote-card').count(), 0);
    assert.equal(await instance.page.getByTestId('chart-canvas').count(), 0);
    await screenshot(instance.page, 'market-unknown.png');
    assert.equal((await instance.page.evaluate(() => window.researchTrail.marketSnapshot('../health'))).error.code, 'INVALID_SYMBOL');
    assert.equal((await instance.page.evaluate(() => window.researchTrail.marketSnapshot({ url: '/health' }))).error.code, 'INVALID_SYMBOL');
    await instance.page.getByRole('button', { name: 'AAPL.US', exact: true }).click();
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'market-compact.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
    const owned = children(instance.pid);
    await instance.app.close(); closed = true;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (!closed) await instance.app.close(); }
});

test('late earlier response cannot overwrite the latest stock selection', { timeout: 45000 }, async () => {
  const instance = await launch();
  try {
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    const samples = await instance.page.evaluate(async () => ({
      aapl: await window.researchTrail.marketSnapshot('AAPL.US'),
      tsla: await window.researchTrail.marketSnapshot('TSLA.US'),
    }));
    // Test-only main-process delay; production code and real backend data remain unchanged.
    await instance.app.evaluate(({ ipcMain }, samples) => {
      globalThis.marketTestCompleted = [];
      ipcMain.removeHandler('market:snapshot');
      ipcMain.handle('market:snapshot', async (_event, symbol) => {
        await new Promise((resolve) => setTimeout(resolve, symbol === 'AAPL.US' ? 600 : 10));
        globalThis.marketTestCompleted.push(symbol);
        return symbol === 'AAPL.US' ? samples.aapl : samples.tsla;
      });
    }, samples);
    await instance.page.getByRole('button', { name: 'AAPL.US', exact: true }).click();
    await instance.page.getByRole('button', { name: 'TSLA.US', exact: true }).click();
    await expect(instance.page.getByTestId('quote-price')).toHaveText('175.22');
    await expect.poll(() => instance.app.evaluate(() => globalThis.marketTestCompleted)).toEqual(['TSLA.US', 'AAPL.US']);
    await expect(instance.page.getByTestId('quote-card')).toHaveAttribute('data-symbol', 'TSLA.US');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'TSLA.US');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-close', '175.22');
  } finally { await instance.app.close(); }
});

test('persistent sessions, scoped messages, SSE replay, restart and deletion', { timeout: 90000 }, async () => {
  let instance = await launch();
  const databasePath = instance.databasePath;
  const errors = [];
  try {
    instance.page.on('pageerror', (e) => errors.push(e.message));
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    const createAndRun = async (title, input) => {
      await instance.page.getByLabel('会话标题', { exact: true }).fill(title);
      await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
      await expect(instance.page.getByTestId('current-session')).toHaveText(title);
      await instance.page.getByLabel('测试输入', { exact: true }).fill(input);
      await instance.page.getByRole('button', { name: '启动固定测试运行', exact: true }).click();
      await expect(instance.page.getByTestId('message-history')).toContainText(input);
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    };
    await createAndRun('甲会话', '只属于甲的输入');
    await createAndRun('乙会话', '只属于乙的输入');
    await expect(instance.page.getByTestId('message-history')).not.toContainText('只属于甲的输入');
    const records = await instance.page.evaluate(() => window.researchTrail.listSessions());
    const a = records.find((s) => s.title === '甲会话'), b = records.find((s) => s.title === '乙会话');
    const runA = (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), a.id))[0];
    const runB = (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), b.id))[0];
    assert.equal(runA.kind, 'fixture');
    const tail = await instance.page.evaluate(({ id, run }) => window.researchTrail.runEvents(id, run, 4), { id: a.id, run: runA.id });
    assert.deepEqual(tail.map((e) => e.sequence), [5, 6, 7]);
    await assert.rejects(instance.page.evaluate(({ id, run }) => window.researchTrail.runEvents(id, run), { id: b.id, run: runA.id }), /不属于当前会话/);
    await assert.rejects(instance.page.evaluate(() => window.researchTrail.getSession('../health')), /ID格式无效/);
    await assert.rejects(instance.page.evaluate(({ id, run }) => window.researchTrail.runEvents(id, run, -1), { id: b.id, run: runB.id }), /非负整数/);
    await instance.page.getByRole('button', { name: /甲会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('甲会话');
    await expect(instance.page.getByTestId('message-history')).not.toContainText('只属于乙的输入');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    for (let n = 0; n < 2; n++) {
      await instance.page.getByRole('button', { name: '重新读取事件' }).click();
      await expect(instance.page.getByRole('button', { name: '重新读取事件' })).toBeEnabled();
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    }
    assert.equal((await instance.page.evaluate((id) => window.researchTrail.getSession(id), a.id)).message_count, 2);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'sessions-events.png'), fullPage: true });
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'sessions-compact.png'), fullPage: true });
    const oldChildren = children(instance.pid);
    await instance.app.close();
    instance = undefined;
    for (const pid of oldChildren) await expect.poll(() => alive(pid)).toBe(false);
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
    instance.page.on('pageerror', (e) => errors.push(e.message));
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByRole('button', { name: /甲会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('甲会话');
    await expect(instance.page.getByTestId('message-history')).toContainText('只属于甲的输入');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    await instance.page.getByRole('button', { name: '删除当前会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('乙会话');
    await expect(instance.page.getByTestId('message-history')).toContainText('只属于乙的输入');
    await expect(instance.page.getByRole('button', { name: /甲会话/ })).toHaveCount(0);
    assert.equal((await instance.page.evaluate(({ id, run }) => window.researchTrail.getRun(id, run), { id: b.id, run: runB.id })).id, runB.id);
    assert.deepEqual(errors, []);
    const owned = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (instance) await instance.app.close(); }
});

test('database migration startup failure is visible and leaves no backend', { timeout: 45000 }, async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'research-trail-invalid-db-'));
  const instance = await launch({ RESEARCH_TRAIL_DB_PATH: directory });
  try {
    await expect(instance.page.getByRole('heading', { name: '连接未就绪' })).toBeVisible();
    await expect(instance.page.getByText(/unable to open database file/)).toBeVisible();
    await expect(instance.page.getByRole('button', { name: '重试启动' })).toBeEnabled();
    await expect.poll(() => children(instance.pid)).toEqual([]);
    await screenshot(instance.page, 'database-startup-failure.png');
  } finally { await instance.app.close(); }
});

test('rule agent invokes Python data tools, renders saved cards and exposes failures', { timeout: 90000 }, async () => {
  let instance = await launch();
  const databasePath = instance.databasePath;
  const errors = [];
  try {
    instance.page.on('pageerror', (e) => errors.push(e.message));
    instance.page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByText('规则演示／假模型', { exact: true })).toBeVisible();
    await instance.page.getByLabel('会话标题', { exact: true }).fill('规则演示验收');
    await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('规则演示验收');
    const sid = (await instance.page.evaluate(() => window.researchTrail.listSessions()))[0].id;
    const runPrompt = async (input, count) => {
      await instance.page.getByLabel('测试输入', { exact: true }).fill(input);
      await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
      await expect(instance.page.getByTestId('message-history')).toContainText(input);
      await expect(instance.page.getByRole('button', { name: '重新读取事件' })).toBeEnabled();
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(count);
      return (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), sid))[0];
    };
    const quote = await runPrompt('查询AAPL.US行情', 8);
    await expect(instance.page.getByTestId('run-state')).toContainText('规则演示／假模型 · 已完成');
    await expect(instance.page.getByTestId('tool-result')).toHaveAttribute('data-tool', 'market.quote');
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await expect(instance.page.getByTestId('message-history')).toContainText('AAPL.US最新价 189.43 USD');
    await expect(instance.page.getByTestId('event-list')).toContainText('调用Python工具 market.quote，参数 AAPL.US');
    const fetchedAt = await instance.page.getByTestId('tool-fetched-at').textContent();
    const trace = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: quote.id });
    assert.equal(trace[3].payload.call_id, trace[4].payload.call_id);
    assert.equal(trace[4].payload.result.data.quote.last_price, 189.43);
    assert.equal(quote.kind, 'fake_agent');
    assert.equal(quote.error, null);
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-quote.png'), fullPage: true });
    }
    const kline = await runPrompt('查看NVDA.US的K线', 8);
    await expect(instance.page.getByTestId('tool-result')).toHaveAttribute('data-tool', 'market.kline');
    await expect(instance.page.getByTestId('agent-kline-summary')).toHaveText('10 根日K线 · 最后收盘 880.12 USD');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'NVDA.US');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-close', '880.12');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-count', '10');
    assert.ok(await instance.page.getByTestId('chart-canvas').locator('canvas').count() > 0);
    assert.equal(await instance.page.getByTestId('quote-card').count(), 0);
    assert.match(kline.answer, /880\.12/);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(quote.id);
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetchedAt);
    await instance.page.getByRole('button', { name: '重新读取事件' }).click();
    await expect(instance.page.getByRole('button', { name: '重新读取事件' })).toBeEnabled();
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
    assert.equal((await instance.page.evaluate((id) => window.researchTrail.getSession(id), sid)).message_count, 4);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(kline.id);
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'NVDA.US');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-kline.png'), fullPage: true });
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-compact.png'), fullPage: true });
    const unsupported = await runPrompt('请帮我推荐股票', 6);
    await expect(instance.page.getByTestId('message-history')).toContainText('当前规则演示只支持');
    assert.equal(unsupported.status, 'completed');
    assert.equal(await instance.page.getByTestId('tool-result').count(), 0);
    assert.equal(await instance.page.getByTestId('chart-canvas').count(), 0);
    const failed = await runPrompt('查询ZZZZ.US行情', 9);
    await expect(instance.page.getByTestId('run-state')).toContainText('运行失败');
    await expect(instance.page.getByTestId('run-error')).toContainText('UNKNOWN_SYMBOL');
    await expect(instance.page.getByTestId('tool-failure')).toContainText('未知股票代码：ZZZZ.US');
    assert.equal(await instance.page.getByTestId('quote-card').count(), 0);
    assert.equal(await instance.page.getByTestId('chart-canvas').count(), 0);
    assert.equal(failed.status, 'failed');
    const failureTrace = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: failed.id });
    assert.equal(failureTrace[4].payload.result.ok, false);
    assert.equal(failureTrace.at(-1).payload.stop_reason, 'error');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-failure.png'), fullPage: true });
    await assert.rejects(instance.page.evaluate((sid) => window.researchTrail.startAgentRun(sid, { command: 'anything' }), sid), /输入需要/);
    const owned = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByTestId('run-error')).toContainText('UNKNOWN_SYMBOL');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(9);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(quote.id);
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetchedAt);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    const replacement = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of replacement) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (instance) await instance.app.close(); }
});

test('run lifecycle cancels, times out, deletes active session and marks backend crash interrupted', { timeout: 90000 }, async () => {
  const databasePath = resolve(mkdtempSync(resolve(tmpdir(), 'research-trail-lifecycle-')), 'test.sqlite3');
  let instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
  try {
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    instance.page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByLabel('会话标题', { exact: true }).fill('生命周期验收');
    await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('生命周期验收');
    let sid = (await instance.page.evaluate(() => window.researchTrail.listSessions()))[0].id;
    const start = async (scenario, expected = '运行中') => {
      await instance.page.getByLabel('模拟工具时序', { exact: true }).selectOption(scenario);
      await instance.page.getByLabel('测试输入', { exact: true }).fill('查询AAPL.US行情');
      await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
      await expect(instance.page.getByTestId('run-state')).toContainText(expected);
      return (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), sid))[0];
    };
    const proof = async (record, status) => {
      const result = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.getRun(sid, rid), { sid, rid: record.id });
      const trace = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: record.id });
      assert.equal(result.status, status);
      assert.equal(trace.filter((e) => e.type === 'run_completed').length, 1);
      assert.equal(trace.filter((e) => e.type === 'message_completed').length, 1);
      assert.equal(trace.at(-1).type, 'run_completed');
      assert.equal(trace.filter((e) => e.type === 'tool_result' && e.payload.result.ok).length, 0);
      const messages = await instance.page.evaluate((id) => window.researchTrail.sessionMessages(id), sid);
      assert.equal(messages.filter((m) => m.run_id === record.id).length, 2);
      return trace;
    };
    await assert.rejects(instance.page.evaluate((id) => window.researchTrail.startAgentRun(id, '查询AAPL.US行情', 'shell'), sid), /未知模拟工具时序/);
    const cancelled = await start('delayed');
    await expect(instance.page.getByTestId('event-list')).toContainText('tool_started');
    await expect(instance.page.getByRole('button', { name: '取消运行', exact: true })).toBeEnabled();
    await instance.page.getByRole('button', { name: '取消运行', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('已取消');
    await expect(instance.page.getByRole('button', { name: '取消运行', exact: true })).toBeDisabled();
    const cancelTrace = await proof(cancelled, 'cancelled');
    assert.equal(await instance.page.getByTestId('tool-result').count(), 0);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'lifecycle-cancelled.png'), fullPage: true });
    const timedOut = await start('timeout', '已超时');
    await expect(instance.page.getByTestId('run-error')).toContainText('TOOL_TIMEOUT');
    await proof(timedOut, 'timed_out');
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(cancelled.id);
    await expect(instance.page.getByTestId('run-state')).toContainText('已取消');
    const unchanged = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: cancelled.id });
    assert.deepEqual(unchanged, cancelTrace);
    const other = await instance.page.evaluate(() => window.researchTrail.createSession('保留会话'));
    const deleted = await start('delayed');
    await instance.page.getByRole('button', { name: '删除当前会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('保留会话');
    await assert.rejects(instance.page.evaluate(({ sid, rid }) => window.researchTrail.getRun(sid, rid), { sid, rid: deleted.id }), /不存在或已删除/);
    sid = other.id;
    const interrupted = await start('delayed');
    await expect(instance.page.getByTestId('event-list')).toContainText('tool_started');
    const backend = children(instance.pid);
    assert.equal(backend.length, 1);
    process.kill(backend[0]);
    await expect(instance.page.getByRole('heading', { name: '连接未就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '重试启动', exact: true }).click();
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    await expect(instance.page.getByTestId('current-session')).toHaveText('保留会话');
    await expect(instance.page.getByTestId('run-state')).toContainText('已中断');
    await expect(instance.page.getByTestId('run-error')).toContainText('BACKEND_INTERRUPTED');
    await expect(instance.page.getByText('保存内容已保留。请在输入框重新发起；不会自动调用工具或模型。', { exact: true })).toBeVisible();
    await proof(interrupted, 'interrupted');
    assert.equal((await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), sid)).length, 1);
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'lifecycle-interrupted.png'), fullPage: true });
      await instance.page.evaluate(() => window.scrollTo(0, 0));
      await screenshot(instance.page, 'lifecycle-compact-viewport.png');
    }
    const explicit = await start('normal', '已完成');
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    assert.equal(explicit.status, 'completed');
    assert.deepEqual(errors, []);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    const final = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of final) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (instance) await instance.app.close(); }
});

test('snapshot first, real stream reconnect, active refresh and session unsubscribe restore without duplicate messages', { timeout: 90000 }, async () => {
  const instance = await launch();
  let closed = false;
  try {
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    instance.page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    // Test-only main HTTP observation and disconnect; real Python remains live.
    await instance.app.evaluate(() => {
      const http = process.getBuiltinModule('node:http'), original = http.request;
      globalThis.streamQa = [];
      http.request = function (...args) {
        const req = original.apply(this, args), url = String(args[0]);
        const item = { url, method: args[1]?.method || 'GET', cursor: args[1]?.headers?.['Last-Event-ID'], req };
        if (url.includes('/sessions/')) globalThis.streamQa.push(item);
        if (url.includes('follow=true')) {
          // The initial snapshot may end before or after tool_started. Observe
          // complete frames after the production decoder, not the start cursor.
          item.lastReceivedCursor = item.cursor;
          let buffer = '';
          req.on('response', (response) => response.on('data', (chunk) => {
            buffer = (buffer + chunk.toString()).replaceAll('\r\n', '\n');
            let end;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
              const id = frame.match(/^id: ([^\n]+)$/m);
              if (id) item.lastReceivedCursor = id[1];
            }
          }));
        }
        return req;
      };
    });
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    for (const title of ['流甲会话', '流乙会话']) {
      await instance.page.getByLabel('会话标题', { exact: true }).fill(title);
      await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
      await expect(instance.page.getByTestId('current-session')).toHaveText(title);
    }
    const list = await instance.page.evaluate(() => window.researchTrail.listSessions());
    const a = list.find((item) => item.title === '流甲会话'), b = list.find((item) => item.title === '流乙会话');
    await instance.page.getByRole('button', { name: /流甲会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText(a.title);
    const start = async (text) => {
      await instance.page.getByLabel('模拟工具时序', { exact: true }).selectOption('delayed');
      await instance.page.getByLabel('测试输入', { exact: true }).fill(text);
      await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
      await expect(instance.page.getByTestId('run-state')).toContainText('运行中');
      await expect(instance.page.getByTestId('stream-state')).toContainText('事件已连接');
      return (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), a.id))[0];
    };
    const first = await start('查询AAPL.US行情');
    await expect(instance.page.getByTestId('event-list')).toContainText('tool_started');
    const disconnectedCursor = await instance.app.evaluate(() => {
      const item = globalThis.streamQa.findLast((item) => item.url.includes('follow=true') && !item.req.destroyed);
      if (!item) throw new Error('Expected real live SSE request');
      // Capture and destroy in one main-process turn: no frame can advance the
      // expected waterline between separate renderer/main evaluation requests.
      const cursor = item.lastReceivedCursor;
      item.req.destroy(new Error('test-only stream disconnect'));
      return cursor;
    });
    await expect(instance.page.getByTestId('stream-state')).toContainText('中断');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'stream-reconnecting.png'), fullPage: true });
    await expect(instance.page.getByTestId('run-state')).toContainText('已完成');
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
    await expect(instance.page.getByTestId('tool-result')).toHaveCount(1);
    const trace = await instance.app.evaluate(() => globalThis.streamQa.map(({ url, method, cursor }) => ({ url, method, cursor })));
    const streams = trace.filter((item) => item.url.includes(first.id) && item.url.includes('follow=true'));
    assert.equal(streams.length, 2);
    assert.match(streams[1].cursor, new RegExp(`${first.id}:\\d+$`));
    assert.equal(streams[1].cursor, disconnectedCursor);
    const snapshotIndex = trace.findIndex((item) => item.url.endsWith(`/sessions/${a.id}/snapshot`));
    assert.ok(snapshotIndex >= 0 && snapshotIndex < trace.findIndex((item) => item.url.includes('follow=true')));
    const fetched = await instance.page.getByTestId('tool-fetched-at').textContent();
    await instance.page.getByTestId('tool-activity-toggle').click();
    await expect(instance.page.getByTestId('tool-activity-call')).toContainText('已返回');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'stream-restored-history.png'), fullPage: true });
    await instance.page.reload();
    await expect(instance.page.getByTestId('current-session')).toHaveText(a.title);
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetched);
    for (let n = 0; n < 2; n++) {
      await instance.page.getByRole('button', { name: '重新读取事件', exact: true }).click();
      await expect(instance.page.getByRole('button', { name: '重新读取事件', exact: true })).toBeEnabled();
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
      await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    }
    const second = await start('查看NVDA.US的K线');
    await instance.page.reload();
    await expect(instance.page.getByTestId('current-session')).toHaveText(a.title);
    await expect(instance.page.getByTestId('stream-state')).toContainText('事件已连接');
    await instance.page.getByRole('button', { name: /流乙会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText(b.title);
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(0);
    await expect.poll(() => instance.app.evaluate(() => globalThis.streamQa.filter((item) => item.url.includes('follow=true') && !item.req.destroyed).length)).toBe(0);
    await expect.poll(() => instance.page.evaluate(({ sid, rid }) => window.researchTrail.getRun(sid, rid).then((run) => run.status), { sid: a.id, rid: second.id })).toBe('completed');
    await expect(instance.page.getByTestId('current-session')).toHaveText(b.title);
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(0);
    assert.equal(await instance.page.getByTestId('tool-result').count(), 0);
    await instance.page.getByRole('button', { name: /流甲会话/ }).click();
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(4);
    const saved = await instance.page.evaluate((id) => window.researchTrail.sessionSnapshot(id), a.id);
    const kline = saved.events.find((item) => item.run_id === second.id && item.type === 'tool_result').payload.result.data;
    await expect(instance.page.getByTestId('agent-kline-summary')).toContainText(kline.klines.at(-1).close.toFixed(2));
    assert.equal(await instance.app.evaluate(() => globalThis.streamQa.filter((item) => item.method === 'POST' && /\/runs$/.test(item.url)).length), 2);
    assert.equal(saved.runs.length, 2); assert.equal(saved.messages.length, 4);
    const ids = await instance.page.getByTestId('message-history').locator('article').evaluateAll((items) => items.map((item) => item.dataset.messageId));
    assert.equal(new Set(ids).size, 4);
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await instance.page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(instance.page, 'stream-compact.png');
    assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
    assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0); assert.deepEqual(errors, []);
    const owned = children(instance.pid);
    await instance.app.close(); closed = true;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (!closed) await instance.app.close(); }
});

test('late earlier session snapshot cannot overwrite selected session', { timeout: 45000 }, async () => {
  const instance = await launch();
  try {
    await expect(instance.page.getByRole('heading', { name: '连接就绪' })).toBeVisible();
    const samples = await instance.page.evaluate(async () => {
      const bridge = window.researchTrail;
      const a = await bridge.createSession('慢快照甲'), b = await bridge.createSession('快快照乙');
      await bridge.startRun(a.id, '只属于慢甲'); await bridge.startRun(b.id, '只属于快乙');
      return [await bridge.sessionSnapshot(a.id), await bridge.sessionSnapshot(b.id)];
    });
    await instance.app.evaluate(({ ipcMain }, samples) => {
      globalThis.snapshotQa = [];
      ipcMain.removeHandler('sessions:snapshot');
      ipcMain.handle('sessions:snapshot', async (_event, id) => {
        await new Promise((done) => setTimeout(done, id === samples[0].session.id ? 600 : 10));
        globalThis.snapshotQa.push(id); return samples.find((sample) => sample.session.id === id);
      });
    }, samples);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('快快照乙');
    await instance.app.evaluate(() => { globalThis.snapshotQa = []; });
    await instance.page.getByRole('button', { name: /慢快照甲/ }).click();
    await instance.page.getByRole('button', { name: /快快照乙/ }).click();
    await expect.poll(() => instance.app.evaluate(() => globalThis.snapshotQa)).toEqual([samples[1].session.id, samples[0].session.id]);
    await expect(instance.page.getByTestId('current-session')).toHaveText('快快照乙');
    await expect(instance.page.getByTestId('message-history')).toContainText('只属于快乙');
    await expect(instance.page.getByTestId('message-history')).not.toContainText('只属于慢甲');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
  } finally { await instance.app.close(); }
});
