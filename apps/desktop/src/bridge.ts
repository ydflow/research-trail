import type { MarketResult, MarketSymbol } from './market-types';
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
  marketSymbols(): Promise<MarketSymbol[]>;
  marketSnapshot(symbol: string): Promise<MarketResult>;
  onStatus(callback: (state: BackendState) => void): () => void;
}
