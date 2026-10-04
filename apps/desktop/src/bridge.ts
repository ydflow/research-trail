import type { MarketResult, MarketSymbol } from './market-types';
import type { SessionDTO, MessageDTO, RunDTO, StreamEvent } from './conversation-types';
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
  listSessions(): Promise<SessionDTO[]>;
  createSession(title: string): Promise<SessionDTO>;
  getSession(sessionId: string): Promise<SessionDTO>;
  deleteSession(sessionId: string): Promise<void>;
  sessionMessages(sessionId: string): Promise<MessageDTO[]>;
  sessionRuns(sessionId: string): Promise<RunDTO[]>;
  startRun(sessionId: string, input: string): Promise<RunDTO>;
  startAgentRun(sessionId: string, input: string, scenario?: 'normal' | 'delayed' | 'timeout'): Promise<RunDTO>;
  cancelRun(sessionId: string, runId: string): Promise<RunDTO>;
  getRun(sessionId: string, runId: string): Promise<RunDTO>;
  runEvents(sessionId: string, runId: string, afterSequence?: number): Promise<StreamEvent[]>;
  onStatus(callback: (state: BackendState) => void): () => void;
}
