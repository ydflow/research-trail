import { contextBridge, ipcRenderer } from 'electron';
import type { BackendState, ResearchTrailBridge, RunStreamUpdate } from '../bridge';

const bridge: ResearchTrailBridge = {
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
  startAgentRun: (id, input, scenario = 'normal') => ipcRenderer.invoke('runs:agent', id, input, scenario),
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
