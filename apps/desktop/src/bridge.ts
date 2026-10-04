// Desktop lifecycle transport only; Python business contracts arrive in later steps.
export type BackendPhase = 'idle' | 'starting' | 'healthy' | 'failed' | 'stopping';
export interface BackendState {
  phase: BackendPhase;
  detail: string;
  checkedAt?: string;
  pythonVersion?: string;
}
export interface ResearchTrailBridge {
  status(): Promise<BackendState>;
  checkHealth(): Promise<BackendState>;
  retryBackend(): Promise<BackendState>;
  onStatus(callback: (state: BackendState) => void): () => void;
}
