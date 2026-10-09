import { app, BrowserWindow, dialog, ipcMain, shell, Notification, type IpcMainInvokeEvent, type IpcMainEvent } from 'electron';
import { writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BackendManager } from './backend';
import { originalNewsUrl } from './news-url';
import { MonitorNotifications } from './monitor-notifications';
import { packagedLaunch } from './packaged-launch';

const root = resolve(__dirname, '../../..');
if (app.isPackaged) {
  app.setAppUserModelId('io.github.ydflow.researchtrail');
  const custom = process.argv.find(arg => arg.startsWith('--research-trail-data-dir='))?.split('=').slice(1).join('=');
  if (custom && !isAbsolute(custom)) throw new Error('用户数据目录必须是绝对路径。');
  const userData = custom || join(app.getPath('appData'), 'ResearchTrail');
  mkdirSync(userData, { recursive: true });
  app.setPath('userData', userData);
  if (!app.requestSingleInstanceLock()) app.exit(0);
}
const backend = new BackendManager(root, app.isPackaged ? packagedLaunch(process.resourcesPath, app.getPath('userData'), process.env) : undefined);
const notifications = new MonitorNotifications(backend,run => {
  if(!Notification.isSupported()) return Promise.resolve('unsupported');
  return new Promise(resolveDelivery=>{
    const notice=new Notification({title:'研迹 · '+String(run.payload.rule_name??'研究提醒').slice(0,60),
      body:(run.payload.mode==='simulated'?'模拟来源 · ':'已保存来源 · ')+String(run.payload.reason??'请打开Today查看触发事实。').slice(0,200),silent:true});
    const timer=setTimeout(()=>resolveDelivery('failed'),4000);
    notice.once('show',()=>{clearTimeout(timer);resolveDelivery('shown');});
    notice.once('failed',()=>{clearTimeout(timer);resolveDelivery('failed');});
    notice.once('click',()=>{if(window && !window.isDestroyed()){window.show();window.focus();}});
    try { notice.show(); } catch { clearTimeout(timer);resolveDelivery('failed'); }
  });
});
let window: BrowserWindow | undefined;
app.on('second-instance', () => {
  if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
});
let closing = false;
let mayQuit = false;
const devUrl = app.isPackaged ? undefined : process.env.RESEARCH_TRAIL_RENDERER_URL;
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
      partition: app.isPackaged ? 'persist:research-trail' : `research-trail-${process.pid}`,
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
  ipcMain.handle('outcomes:opinions',event=>{assertSender(event);return backend.outcomeOpinions();});
  ipcMain.handle('outcomes:capture',(event,input:unknown)=>{assertSender(event);return backend.captureOutcome(input);});
  ipcMain.handle('outcomes:opinion',(event,id:unknown)=>{assertSender(event);return backend.outcomeOpinion(id);});
  ipcMain.handle('outcomes:evaluate',(event,id:unknown,requestId:unknown)=>{assertSender(event);return backend.evaluateOutcome(id,requestId);});
  ipcMain.handle('outcomes:policies',event=>{assertSender(event);return backend.outcomePolicies();});
  ipcMain.handle('outcomes:policy-change',(event,input:unknown)=>{assertSender(event);return backend.changeOutcomePolicy(input);});
  ipcMain.handle('outcomes:performance',(event,input:unknown)=>{assertSender(event);return backend.outcomePerformance(input);});
  ipcMain.handle('outcomes:snapshot',(event,id:unknown)=>{assertSender(event);return backend.outcomeSnapshot(id);});
  ipcMain.handle('evaluation:evaluationCases',(event)=>{assertSender(event);return backend.evaluationCases();});
  ipcMain.handle('evaluation:evaluationExperiments',(event)=>{assertSender(event);return backend.evaluationExperiments();});
  ipcMain.handle('evaluation:createExperiment',(event, input: unknown)=>{assertSender(event);return backend.createExperiment(input);});
  ipcMain.handle('evaluation:evaluationExperiment',(event, id: unknown, baselineId: unknown)=>{assertSender(event);return backend.evaluationExperiment(id,baselineId);});
  ipcMain.handle('evaluation:startExperiment',(event, id: unknown)=>{assertSender(event);return backend.startExperiment(id);});
  ipcMain.handle('evaluation:cancelExperiment',(event, id: unknown)=>{assertSender(event);return backend.cancelExperiment(id);});
  ipcMain.handle('evaluation:evaluationBaselines',(event)=>{assertSender(event);return backend.evaluationBaselines();});
  ipcMain.handle('evaluation:saveEvaluationBaseline',(event, input: unknown)=>{assertSender(event);return backend.saveEvaluationBaseline(input);});
  ipcMain.handle('evaluation:evaluationFeedback',(event, id: unknown)=>{assertSender(event);return backend.evaluationFeedback(id);});
  ipcMain.handle('evaluation:addEvaluationFeedback',(event, id: unknown, input: unknown)=>{assertSender(event);return backend.addEvaluationFeedback(id,input);});
  ipcMain.handle('evaluation:tracingConfigurations',(event)=>{assertSender(event);return backend.tracingConfigurations();});
  ipcMain.handle('evaluation:saveTracingConfiguration',(event, provider: unknown, input: unknown)=>{assertSender(event);return backend.saveTracingConfiguration(provider,input);});
  ipcMain.handle('evaluation:saveTracingCredential',(event, provider: unknown, input: unknown)=>{assertSender(event);return backend.saveTracingCredential(provider,input);});
  ipcMain.handle('evaluation:deleteTracingCredential',(event, provider: unknown)=>{assertSender(event);return backend.deleteTracingCredential(provider);});
  ipcMain.handle('evaluation:probeTracing',(event, provider: unknown)=>{assertSender(event);return backend.probeTracing(provider);});
  ipcMain.handle('evaluation:previewEvaluationTrace',(event, provider: unknown, id: unknown)=>{assertSender(event);return backend.previewEvaluationTrace(provider,id);});
  ipcMain.handle('evaluation:uploadEvaluationTrace',(event, provider: unknown, id: unknown, input: unknown)=>{assertSender(event);return backend.uploadEvaluationTrace(provider,id,input);});
  ipcMain.handle('evaluation:evaluationTraceDeliveries',(event)=>{assertSender(event);return backend.evaluationTraceDeliveries();});
  ipcMain.handle('today:view',(event,timezone:unknown)=>{assertSender(event);return backend.today(timezone);});
  ipcMain.handle('monitoring:rules',event=>{assertSender(event);return backend.monitoringRules();});
  ipcMain.handle('monitoring:create',(event,input:unknown)=>{assertSender(event);return backend.createMonitoringRule(input);});
  ipcMain.handle('monitoring:toggle',(event,id:unknown,enabled:unknown)=>{assertSender(event);return backend.toggleMonitoringRule(id,enabled);});
  ipcMain.handle('monitoring:runs',event=>{assertSender(event);return backend.monitoringRuns();});
  ipcMain.handle('monitoring:research',(event,id:unknown,symbol:unknown)=>{assertSender(event);return backend.monitoringResearch(id,symbol);});
  ipcMain.handle('calendar:sources',(event,input:unknown)=>{assertSender(event);return backend.calendarSources(input);});
  ipcMain.handle('calendar:refresh',(event,input:unknown)=>{assertSender(event);return backend.refreshCalendar(input);});
  ipcMain.handle('calendar:history',event=>{assertSender(event);return backend.calendarHistory();});
  ipcMain.handle('calendar:view',(event,id:unknown,timezone:unknown)=>{assertSender(event);return backend.calendarView(id,timezone);});
  ipcMain.handle('calendar:original',(event,id:unknown,readId:unknown)=>{assertSender(event);return backend.calendarOriginal(id,readId);});
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
  ipcMain.handle('theses:list', event => { assertSender(event); return backend.thesisList(); });
  ipcMain.handle('screening:tasks', (event,context: unknown) => { assertSender(event); return backend.screeningTasks(context); });
  ipcMain.handle('screening:start', (event,input: unknown) => { assertSender(event); return backend.startScreening(input); });
  ipcMain.handle('screening:list', event => { assertSender(event); return backend.screeningRuns(); });
  ipcMain.handle('screening:get', (event,id: unknown) => { assertSender(event); return backend.screeningRun(id); });
  ipcMain.handle('screening:cancel', (event,id: unknown) => { assertSender(event); return backend.cancelScreening(id); });
  ipcMain.handle('screening:evidence', (event,id: unknown,readId: unknown) => { assertSender(event); return backend.screeningEvidence(id,readId); });
  ipcMain.handle('theses:create', (event, input: unknown) => { assertSender(event); return backend.createThesis(input); });
  ipcMain.handle('theses:get', (event, id: unknown) => { assertSender(event); return backend.thesis(id); });
  ipcMain.handle('theses:version', (event, id: unknown, version: unknown) => { assertSender(event); return backend.thesisVersion(id, version); });
  ipcMain.handle('theses:edit', (event, id: unknown, input: unknown) => { assertSender(event); return backend.mutateThesis(id, 'edit', input); });
  ipcMain.handle('theses:evaluate', (event, id: unknown, input: unknown) => { assertSender(event); return backend.mutateThesis(id, 'evaluate', input); });
  ipcMain.handle('theses:judge', (event, id: unknown, input: unknown) => { assertSender(event); return backend.mutateThesis(id, 'judge', input); });
  ipcMain.handle('theses:review', (event, id: unknown, reviewId: unknown) => { assertSender(event); return backend.thesisReview(id, reviewId); });
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
    if(state.phase==='healthy') notifications.start(); else notifications.stop();
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
  notifications.stop();
  backend.dispose().catch((error) => console.error('清理失败：', error.message)).finally(() => { mayQuit = true; app.quit(); });
});

// Windows GUI Electron cannot reliably read redirected stdin. Watch the exact launcher PID.
const launcherPid = app.isPackaged ? NaN : Number(process.env.RESEARCH_TRAIL_LAUNCHER_PID);
if (Number.isInteger(launcherPid) && launcherPid > 0) {
  const ownerMonitor = setInterval(() => {
    try { process.kill(launcherPid, 0); } catch { app.quit(); }
  }, 1000);
  app.on('will-quit', () => clearInterval(ownerMonitor));
}
