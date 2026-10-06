// Standalone clean-source harness: invoked by verify-clean, not node --test.
const assert = require('node:assert/strict');
const { waitForBackend } = require('./backend-ready.cjs');
const { chromium, expect } = require('@playwright/test');
const { spawn, execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const net = require('node:net');
const clean = resolve(process.argv[2]);
const work = mkdtempSync(resolve(tmpdir(), 'research-trail-cmd-qa-'));
const database = resolve(work, 'history.sqlite3');
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
function owned() {
  const literal = clean.replaceAll("'", "''");
  const data = execFileSync('powershell.exe', ['-NoProfile', '-Command', `@(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne ${process.pid} -and $_.Name -match '^(electron|python|node|bun|uv)\.exe$' -and $_.CommandLine -and $_.CommandLine.Contains('${literal}') } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true }).trim();
  const result = data ? JSON.parse(data) : []; return Array.isArray(result) ? result : [result];
}
async function launch() {
  const reserve = net.createServer();
  await new Promise((done) => reserve.listen(0, '127.0.0.1', done));
  const port = reserve.address().port; await new Promise((done) => reserve.close(done));
  const guard = resolve(clean, 'scripts/offline/network.cjs').replaceAll('\\', '/');
  const env = { ...process.env, RESEARCH_TRAIL_OFFLINE: '1', RESEARCH_TRAIL_QA_CDP_PORT: String(port), RESEARCH_TRAIL_DB_PATH: database,
    PYTHONPATH: resolve(clean, 'scripts/offline'), PYTHONUTF8: '1', UV_OFFLINE: '1', UV_PYTHON_DOWNLOADS: 'never', NODE_OPTIONS: `--require "${guard}"` };
  delete env.ELECTRON_RUN_AS_NODE;
  let output = '';
  const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'start-dev.cmd'], { cwd: clean, env, windowsHide: true });
  child.stdout.on('data', (value) => { output += value.toString(); }); child.stderr.on('data', (value) => { output += value.toString(); });
  let browser;
  try {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error('start-dev.cmd exited before window: ' + output);
      try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 }); break; }
      catch { await sleep(150); }
    }
    if (!browser) throw new Error('CMD window/CDP startup timed out: ' + output);
    const page = browser.contexts()[0].pages()[0];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await waitForBackend(page);
    assert.equal(await page.title(), '研迹 · ResearchTrail');
    assert.match(page.url(), /^http:\/\/127\.0\.0\.1:\d+\//);
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    return { child, browser, page, errors, output: () => output };
  } catch (error) {
    if (browser) await browser.close();
    for (const pid of owned()) if (alive(pid)) process.kill(pid);
    if (alive(child.pid)) child.kill();
    throw error;
  }
}
async function close(instance) {
  const pids = owned(); assert.ok(pids.length >= 2, 'Expected owned Electron/Vite/Python commands');
  await instance.page.close(); await instance.browser.close();
  const deadline = Date.now() + 15000;
  while ((instance.child.exitCode === null || pids.some(alive)) && Date.now() < deadline) await sleep(100);
  assert.equal(instance.child.exitCode, 0, instance.output());
  assert.deepEqual(pids.filter(alive), [], 'Owned process remained after close');
}
(async () => {
  let instance;
  try {
    instance = await launch();
    await instance.page.getByRole('button', { name: 'NVDA.US', exact: true }).click();
    await expect(instance.page.getByTestId('quote-price')).toHaveText('880.12');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'NVDA.US');
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByLabel('会话标题', { exact: true }).fill('干净源码首版验收');
    await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('干净源码首版验收');
    await instance.page.getByLabel('测试输入', { exact: true }).fill('查询AAPL.US行情');
    await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('已完成');
    const fetched = await instance.page.getByTestId('tool-fetched-at').textContent();
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    await instance.page.getByLabel('模拟工具时序', { exact: true }).selectOption('delayed');
    await instance.page.getByLabel('测试输入', { exact: true }).fill('查看NVDA.US的K线');
    await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('运行中');
    await instance.page.getByRole('button', { name: '取消运行', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('已取消');
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(4);
    const sessions = await instance.page.evaluate(() => window.researchTrail.listSessions());
    const sid = sessions[0].id;
    const before = await instance.page.evaluate((id) => window.researchTrail.sessionSnapshot(id), sid);
    assert.deepEqual(instance.errors, []);
    const qa = process.env.RESEARCH_TRAIL_QA_DIR;
    if (qa) { mkdirSync(qa, { recursive: true }); await instance.page.screenshot({ path: resolve(qa, 'clean-cmd-cancelled.png'), fullPage: true }); }
    await close(instance); instance = undefined;
    instance = await launch();
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(4);
    const after = await instance.page.evaluate((id) => window.researchTrail.sessionSnapshot(id), sid);
    assert.deepEqual(after, before);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(before.runs.find((run) => run.status === 'completed').id);
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetched);
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
    await instance.page.getByRole('button', { name: '重新读取事件', exact: true }).click();
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
    assert.deepEqual(instance.errors, []);
    if (qa) await instance.page.screenshot({ path: resolve(qa, 'clean-cmd-restored.png'), fullPage: true });
    await close(instance); instance = undefined;
    writeFileSync(resolve(work, 'result.json'), JSON.stringify({ status: 'PASS', source: clean, messageCount: 4, runs: 2, sameSnapshotAfterRestart: true, ownedProcessesRemaining: owned().length }, null, 2));
    console.log('[clean-cmd] PASS: stock → session → quote → cancel → close/restart/history; identical saved snapshot, no new runs, owned processes exited.');
    console.log(`[clean-cmd] Isolated evidence: ${work}`);
  } finally {
    if (instance) { try { await close(instance); } finally { for (const pid of owned()) if (alive(pid)) process.kill(pid); if (alive(instance.child.pid)) instance.child.kill(); } }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
