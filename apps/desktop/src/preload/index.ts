import { contextBridge, ipcRenderer } from 'electron';
import type { BackendState, ResearchTrailBridge } from '../bridge';

const bridge: ResearchTrailBridge = {
  status: () => ipcRenderer.invoke('backend:status'),
  checkHealth: () => ipcRenderer.invoke('backend:check'),
  retryBackend: () => ipcRenderer.invoke('backend:retry'),
  onStatus(callback) {
    const listener = (_event: unknown, state: BackendState) => callback(state);
    ipcRenderer.on('backend:changed', listener);
    return () => ipcRenderer.removeListener('backend:changed', listener);
  },
};
contextBridge.exposeInMainWorld('researchTrail', bridge);
