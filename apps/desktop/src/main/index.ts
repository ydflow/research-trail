import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
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

function assertSender(event: IpcMainInvokeEvent) {
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
