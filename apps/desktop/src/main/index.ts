import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent, type IpcMainEvent } from 'electron';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BackendManager } from './backend';

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
  ipcMain.handle('runs:agent', (event, id: unknown, input: unknown, scenario: unknown) => { assertSender(event); return backend.startAgentRun(id, input, scenario); });
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
