import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent, type IpcMainEvent } from 'electron';
import { writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BackendManager } from './backend';
import { originalNewsUrl } from './news-url';

const root = resolve(__dirname, '../../..');
const backend = new BackendManager(root);
let window: BrowserWindow | undefined;
let closing = false;
let mayQuit = false;
const devUrl = process.env.RESEARCH_TRAIL_RENDERER_URL;
if (devUrl && (new URL(devUrl).hostname !== '127.0.0.1' || new URL(devUrl).protocol !== 'http:')) throw new Error('开发页面必须来自本机 Vite。');
const rendererUrl = devUrl || pathToFileURL(join(__dirname, 'renderer/index.html')).href;

function assertSender(event: IpcMainInvokeEvent | IpcMainEvent) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== rendererUrl) throw new Error('不允许的 IPC 来源。');
}

app.whenReady().then(async () => {
  // Each instance uses its own browser session and backend; tests do not lock user data.
  window = new BrowserWindow({
    width: 1100, height: 800, minWidth: 560, minHeight: 540,
    title: '研迹 · ResearchTrail', backgroundColor: '#ffffff', autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      partition: `research-trail-${process.pid}`,
    },
  });
  const session = window.webContents.session;
  await session.setProxy({ mode: 'direct' });
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (url !== rendererUrl) event.preventDefault(); });
  ipcMain.handle('backend:status', (event) => { assertSender(event); return backend.snapshot(); });
  ipcMain.handle('backend:check', (event) => { assertSender(event); return backend.check(); });
  ipcMain.handle('backend:retry', (event) => { assertSender(event); return backend.retry(); });
  ipcMain.handle('workspace:state', event => { assertSender(event); return backend.workspaceState(); });
  ipcMain.handle('research:strategies', event => { assertSender(event); return backend.researchStrategies(); });
  ipcMain.handle('research:plan', (event, input: unknown) => { assertSender(event); return backend.researchPlan(input); });
  ipcMain.handle('research:list', event => { assertSender(event); return backend.researchRuns(); });
  ipcMain.handle('research:start', (event, input: unknown) => { assertSender(event); return backend.startResearch(input); });
  ipcMain.handle('research:get', (event, id: unknown) => { assertSender(event); return backend.researchRun(id); });
  ipcMain.handle('research:cancel', (event, id: unknown) => { assertSender(event); return backend.cancelResearch(id); });
  ipcMain.handle('research:data', (event, id: unknown, capability: unknown) => { assertSender(event); return backend.researchData(id, capability); });
  ipcMain.handle('research:checkpoint', (event, id: unknown) => { assertSender(event); return backend.researchCheckpoint(id); });
  ipcMain.handle('research:resume', (event, id: unknown, requestId: unknown) => { assertSender(event); return backend.recoverResearch(id, 'resume', requestId); });
  ipcMain.handle('research:restart', (event, id: unknown, requestId: unknown) => { assertSender(event); return backend.recoverResearch(id, 'restart', requestId); });
  ipcMain.handle('research:abandon', (event, id: unknown, requestId: unknown) => { assertSender(event); return backend.recoverResearch(id, 'abandon', requestId); });
  ipcMain.handle('reports:list', (event, runId: unknown) => { assertSender(event); return backend.reportList(runId); });
  ipcMain.handle('reports:generate', (event, runId: unknown, mode: unknown, requestId: unknown) => { assertSender(event); return backend.generateReport(runId, mode, requestId); });
  ipcMain.handle('reports:get', (event, id: unknown) => { assertSender(event); return backend.report(id); });
  ipcMain.handle('reports:cancel', (event, id: unknown) => { assertSender(event); return backend.cancelReport(id); });
  ipcMain.handle('reports:evidence', (event, id: unknown, reference: unknown) => { assertSender(event); return backend.reportEvidence(id, reference); });
  ipcMain.handle('reports:diff', (event, before: unknown, after: unknown) => { assertSender(event); return backend.reportDiff(before, after); });
  ipcMain.handle('reports:export', async (event, id: unknown) => {
    assertSender(event);
    const report = await backend.reportMarkdown(id);
    const chosen = await dialog.showSaveDialog(window!, { defaultPath: report.filename, filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (chosen.canceled || !chosen.filePath) return false;
    try { await writeFile(chosen.filePath, report.content, { encoding: 'utf8', mode: 0o600 }); }
    catch { throw new Error('报告未保存，请检查所选位置。'); }
    return true;
  });
  ipcMain.handle('capabilities:list', (event, context: unknown) => { assertSender(event); return backend.capabilities(context); });
  ipcMain.handle('skills:list', (event, context: unknown) => { assertSender(event); return backend.skills(context); });
  ipcMain.handle('skills:enabled', (event, id: unknown, enabled: unknown, context: unknown) => { assertSender(event); return backend.setSkillEnabled(id, enabled, context); });
  ipcMain.handle('skills:resource', (event, id: unknown, path: unknown, context: unknown) => { assertSender(event); return backend.readSkillResource(id, path, context); });
  ipcMain.handle('portfolios:list', event => { assertSender(event); return backend.portfolioList(); });
  ipcMain.handle('analytics:risk', (event, body: unknown) => { assertSender(event); return backend.portfolioRisk(body); });
  ipcMain.handle('analytics:compare', (event, body: unknown) => { assertSender(event); return backend.compareStocks(body); });
  ipcMain.handle('portfolios:create', (event, body: unknown) => { assertSender(event); return backend.createPortfolio(body); });
  ipcMain.handle('portfolios:view', (event, id: unknown) => { assertSender(event); return backend.portfolioView(id); });
  ipcMain.handle('portfolios:preview', (event, id: unknown, csv: unknown) => { assertSender(event); return backend.previewPortfolio(id, csv); });
  ipcMain.handle('portfolios:confirm', (event, id: unknown, draft: unknown) => { assertSender(event); return backend.confirmPortfolio(id, draft); });
  ipcMain.handle('portfolios:undo', (event, id: unknown, batch: unknown) => { assertSender(event); return backend.undoPortfolio(id, batch); });
  ipcMain.handle('portfolios:refresh', (event, id: unknown) => { assertSender(event); return backend.refreshPortfolio(id); });
  ipcMain.handle('workspace:add', (event, symbol: unknown) => { assertSender(event); return backend.addWatch(symbol); });
  ipcMain.handle('workspace:remove', (event, symbol: unknown) => { assertSender(event); return backend.removeWatch(symbol); });
  ipcMain.handle('workspace:select', (event, symbol: unknown) => { assertSender(event); return backend.selectSecurity(symbol); });
  ipcMain.handle('workspace:page', (event, query: unknown) => { assertSender(event); return backend.securityPage(query); });
  ipcMain.handle('workspace:news-link', (event, url: unknown) => { assertSender(event); return shell.openExternal(originalNewsUrl(url)); });
  ipcMain.handle('providers:profiles', (event) => { assertSender(event); return backend.providerProfiles(); });
  ipcMain.handle('providers:save', (event, provider: unknown, body: unknown) => { assertSender(event); return backend.saveProvider(provider, body); });
  ipcMain.handle('providers:delete', (event, provider: unknown) => { assertSender(event); return backend.deleteProvider(provider); });
  ipcMain.handle('providers:credential-save', (event, provider: unknown, body: unknown) => { assertSender(event); return backend.saveProviderCredential(provider, body); });
  ipcMain.handle('providers:credential-delete', (event, provider: unknown) => { assertSender(event); return backend.deleteProviderCredential(provider); });
  ipcMain.handle('providers:capabilities', (event) => { assertSender(event); return backend.providerCapabilities(); });
  ipcMain.handle('providers:query', (event, provider: unknown, body: unknown) => { assertSender(event); return backend.queryProvider(provider, body); });
  ipcMain.handle('settings:connections', (event) => { assertSender(event); return backend.connections(); });
  ipcMain.handle('settings:save', (event, kind: unknown, body: unknown) => { assertSender(event); return backend.saveConnection(kind, body); });
  ipcMain.handle('settings:delete', (event, kind: unknown) => { assertSender(event); return backend.deleteConnection(kind); });
  ipcMain.handle('settings:credential-save', (event, kind: unknown, secret: unknown) => { assertSender(event); return backend.saveCredential(kind, secret); });
  ipcMain.handle('settings:credential-delete', (event, kind: unknown) => { assertSender(event); return backend.deleteCredential(kind); });
  ipcMain.handle('settings:test', (event, kind: unknown) => { assertSender(event); return backend.testConnection(kind); });
  ipcMain.handle('settings:profile', (event) => { assertSender(event); return backend.profile(); });
  ipcMain.handle('settings:profile-save', (event, body: unknown) => { assertSender(event); return backend.saveProfile(body); });
  ipcMain.handle('settings:profile-delete', (event) => { assertSender(event); return backend.deleteProfile(); });
  ipcMain.handle('settings:diagnostics', (event) => { assertSender(event); return backend.diagnostics(); });
  ipcMain.handle('settings:diagnostics-export', async (event) => {
    assertSender(event);
    const report = await backend.diagnostics();
    // Only a user-selected destination and a Python-generated whitelist report.
    const chosen = await dialog.showSaveDialog(window!, { defaultPath: 'research-trail-diagnostics.json',
      filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (chosen.canceled || !chosen.filePath) return false;
    try { await writeFile(chosen.filePath, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 }); }
    catch { throw new Error('诊断文件未保存，请检查所选位置。'); }
    return true;
  });
  ipcMain.handle('market:symbols', (event) => { assertSender(event); return backend.marketSymbols(); });
  ipcMain.handle('market:snapshot', (event, symbol: unknown) => { assertSender(event); return backend.marketSnapshot(symbol); });
  ipcMain.handle('sessions:list', (event) => { assertSender(event); return backend.listSessions(); });
  ipcMain.handle('sessions:create', (event, title: unknown) => { assertSender(event); return backend.createSession(title); });
  ipcMain.handle('sessions:get', (event, id: unknown) => { assertSender(event); return backend.getSession(id); });
  ipcMain.handle('sessions:delete', (event, id: unknown) => { assertSender(event); return backend.deleteSession(id); });
  ipcMain.handle('sessions:messages', (event, id: unknown) => { assertSender(event); return backend.sessionMessages(id); });
  ipcMain.handle('sessions:runs', (event, id: unknown) => { assertSender(event); return backend.sessionRuns(id); });
  ipcMain.handle('sessions:snapshot', (event, id: unknown) => { assertSender(event); return backend.sessionSnapshot(id); });
  ipcMain.handle('runs:start', (event, id: unknown, input: unknown) => { assertSender(event); return backend.startRun(id, input); });
  ipcMain.handle('runs:agent', (event, id: unknown, input: unknown, scenario: unknown, kind: unknown) => { assertSender(event); return backend.startAgentRun(id, input, scenario, kind); });
  ipcMain.handle('runs:cancel', (event, id: unknown, runId: unknown) => { assertSender(event); return backend.cancelRun(id, runId); });
  ipcMain.handle('runs:get', (event, id: unknown, runId: unknown) => { assertSender(event); return backend.getRun(id, runId); });
  ipcMain.handle('runs:events', (event, id: unknown, runId: unknown, after: unknown) => { assertSender(event); return backend.runEvents(id, runId, after); });
  ipcMain.on('runs:subscribe', (event, key: unknown, id: unknown, runId: unknown, after: unknown) => {
    assertSender(event);
    if (typeof key !== 'string' || key.length > 36) return;
    try {
      backend.subscribeRun(key, id, runId, after, (value) => {
        if (window && !window.isDestroyed()) window.webContents.send('runs:changed', key, value);
      });
    } catch (error) {
      event.sender.send('runs:changed', key, { kind: 'connection', phase: 'failed', detail: (error as Error).message });
    }
  });
  ipcMain.on('runs:unsubscribe', (event, key: unknown) => { assertSender(event); backend.unsubscribeRun(key); });
  window.webContents.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => { if (mainFrame) backend.stopSubscriptions(); });
  window.webContents.on('destroyed', () => backend.stopSubscriptions());
  backend.on('status', (state) => {
    if (window && !window.isDestroyed()) window.webContents.send('backend:changed', state);
  });
  if (devUrl) {
    let lastPhase = '';
    backend.on('status', (state) => {
      if (state.phase !== lastPhase) console.log(`研迹后端：${state.phase}`);
      lastPhase = state.phase;
    });
  }
  await window.loadURL(rendererUrl);
  window.show();
  void backend.retry();
}).catch((error) => { console.error('桌面启动失败：', error.message); app.quit(); });

app.on('window-all-closed', () => app.quit());
app.on('before-quit', (event) => {
  if (mayQuit) return;
  event.preventDefault();
  if (closing) return;
  closing = true;
  backend.dispose().catch((error) => console.error('清理失败：', error.message)).finally(() => { mayQuit = true; app.quit(); });
});

// Windows GUI Electron cannot reliably read redirected stdin. Watch the exact launcher PID.
const launcherPid = Number(process.env.RESEARCH_TRAIL_LAUNCHER_PID);
if (Number.isInteger(launcherPid) && launcherPid > 0) {
  const ownerMonitor = setInterval(() => {
    try { process.kill(launcherPid, 0); } catch { app.quit(); }
  }, 1000);
  app.on('will-quit', () => clearInterval(ownerMonitor));
}
