import { contextBridge, ipcRenderer } from 'electron';
import type { BackendState, ResearchTrailBridge } from '../bridge';

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
  startRun: (id, input) => ipcRenderer.invoke('runs:start', id, input),
  getRun: (id, runId) => ipcRenderer.invoke('runs:get', id, runId),
  runEvents: (id, runId, after = 0) => ipcRenderer.invoke('runs:events', id, runId, after),
  onStatus(callback) {
    const listener = (_event: unknown, state: BackendState) => callback(state);
    ipcRenderer.on('backend:changed', listener);
    return () => ipcRenderer.removeListener('backend:changed', listener);
  },
};
contextBridge.exposeInMainWorld('researchTrail', bridge);
