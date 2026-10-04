const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _electron: electron, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync, mkdtempSync } = require('node:fs');
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
async function screenshot(page, name) {
  if (!process.env.RESEARCH_TRAIL_QA_DIR) return;
  mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
  await page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, name), fullPage: false });
}
async function launch(extraEnv = {}) {
  const databasePath = extraEnv.RESEARCH_TRAIL_DB_PATH || resolve(mkdtempSync(resolve(tmpdir(), 'research-trail-qa-')), 'test.sqlite3');
  const app = await electron.launch({ args: [desktop], cwd: root, env: { ...env, RESEARCH_TRAIL_DB_PATH: databasePath, ...extraEnv } });
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
    assert.equal(await first.page.title(), '研迹 · ResearchTrail');
    assert.equal(await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true);
    assert.match(first.page.url(), /dist\/renderer\/index\.html$/);
    assert.deepEqual(await first.page.evaluate(() => ({
      bridge: Object.keys(window.researchTrail).sort(),
      node: typeof window.require,
      process: typeof window.process,
    })), { bridge: ['checkHealth', 'marketSnapshot', 'marketSymbols', 'onStatus', 'retryBackend', 'status',
      'listSessions', 'createSession', 'getSession', 'deleteSession', 'sessionMessages', 'sessionRuns', 'startRun', 'startAgentRun', 'getRun', 'runEvents'].sort(), node: 'undefined', process: 'undefined' });
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
