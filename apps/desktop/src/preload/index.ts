import { contextBridge, ipcRenderer } from 'electron';
import type { BackendState, ResearchTrailBridge, RunStreamUpdate } from '../bridge';

const bridge: ResearchTrailBridge = {
  capabilities: context => ipcRenderer.invoke('capabilities:list', context),
  skills: context => ipcRenderer.invoke('skills:list', context),
  setSkillEnabled: (id, enabled, context) => ipcRenderer.invoke('skills:enabled', id, enabled, context),
  readSkillResource: (id, path, context) => ipcRenderer.invoke('skills:resource', id, path, context),
  portfolioList: () => ipcRenderer.invoke('portfolios:list'),
  portfolioRisk: input => ipcRenderer.invoke('analytics:risk', input),
  compareStocks: input => ipcRenderer.invoke('analytics:compare', input),
  createPortfolio: input => ipcRenderer.invoke('portfolios:create', input),
  portfolioView: id => ipcRenderer.invoke('portfolios:view', id),
  previewPortfolio: (id, csv) => ipcRenderer.invoke('portfolios:preview', id, csv),
  confirmPortfolio: (id, draft) => ipcRenderer.invoke('portfolios:confirm', id, draft),
  undoPortfolio: (id, batch) => ipcRenderer.invoke('portfolios:undo', id, batch),
  refreshPortfolio: id => ipcRenderer.invoke('portfolios:refresh', id),
  workspaceState: () => ipcRenderer.invoke('workspace:state'),
  addWatch: symbol => ipcRenderer.invoke('workspace:add', symbol),
  removeWatch: symbol => ipcRenderer.invoke('workspace:remove', symbol),
  selectSecurity: symbol => ipcRenderer.invoke('workspace:select', symbol),
  securityPage: query => ipcRenderer.invoke('workspace:page', query),
  openNewsSource: url => ipcRenderer.invoke('workspace:news-link', url),
  providerProfiles: () => ipcRenderer.invoke('providers:profiles'),
  saveProvider: (provider, input) => ipcRenderer.invoke('providers:save', provider, input),
  deleteProvider: (provider) => ipcRenderer.invoke('providers:delete', provider),
  saveProviderCredential: (provider, input) => ipcRenderer.invoke('providers:credential-save', provider, input),
  deleteProviderCredential: (provider) => ipcRenderer.invoke('providers:credential-delete', provider),
  providerCapabilities: () => ipcRenderer.invoke('providers:capabilities'),
  queryProvider: (provider, input) => ipcRenderer.invoke('providers:query', provider, input),
  connections: () => ipcRenderer.invoke('settings:connections'),
  saveConnection: (kind, input) => ipcRenderer.invoke('settings:save', kind, input),
  deleteConnection: (kind) => ipcRenderer.invoke('settings:delete', kind),
  saveCredential: (kind, secret) => ipcRenderer.invoke('settings:credential-save', kind, secret),
  deleteCredential: (kind) => ipcRenderer.invoke('settings:credential-delete', kind),
  testConnection: (kind) => ipcRenderer.invoke('settings:test', kind),
  profile: () => ipcRenderer.invoke('settings:profile'),
  saveProfile: (input) => ipcRenderer.invoke('settings:profile-save', input),
  deleteProfile: () => ipcRenderer.invoke('settings:profile-delete'),
  diagnostics: () => ipcRenderer.invoke('settings:diagnostics'),
  exportDiagnostics: () => ipcRenderer.invoke('settings:diagnostics-export'),
  status: () => ipcRenderer.invoke('backend:status'),
  checkHealth: () => ipcRenderer.invoke('backend:check'),
  retryBackend: () => ipcRenderer.invoke('backend:retry'),
  marketSymbols: () => ipcRenderer.invoke('market:symbols'),
  marketSnapshot: (symbol) => ipcRenderer.invoke('market:snapshot', symbol),
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  createSession: (title) => ipcRenderer.invoke('sessions:create', title),
  getSession: (id) => ipcRenderer.invoke('sessions:get', id),
  deleteSession: (id) => ipcRenderer.invoke('sessions:delete', id),
  sessionMessages: (id) => ipcRenderer.invoke('sessions:messages', id),
  sessionRuns: (id) => ipcRenderer.invoke('sessions:runs', id),
  sessionSnapshot: (id) => ipcRenderer.invoke('sessions:snapshot', id),
  startRun: (id, input) => ipcRenderer.invoke('runs:start', id, input),
  startAgentRun: (id, input, scenario = 'normal', kind = 'fake_agent') => ipcRenderer.invoke('runs:agent', id, input, scenario, kind),
  cancelRun: (id, runId) => ipcRenderer.invoke('runs:cancel', id, runId),
  getRun: (id, runId) => ipcRenderer.invoke('runs:get', id, runId),
  runEvents: (id, runId, after = 0) => ipcRenderer.invoke('runs:events', id, runId, after),
  subscribeRun(id, runId, after, callback) {
    const key = crypto.randomUUID();
    const listener = (_event: unknown, receivedKey: string, value: RunStreamUpdate) => { if (receivedKey === key) callback(value); };
    ipcRenderer.on('runs:changed', listener);
    ipcRenderer.send('runs:subscribe', key, id, runId, after);
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      ipcRenderer.removeListener('runs:changed', listener);
      ipcRenderer.send('runs:unsubscribe', key);
    };
  },
  onStatus(callback) {
    const listener = (_event: unknown, state: BackendState) => callback(state);
    ipcRenderer.on('backend:changed', listener);
    return () => ipcRenderer.removeListener('backend:changed', listener);
  },
};
contextBridge.exposeInMainWorld('researchTrail', bridge);
