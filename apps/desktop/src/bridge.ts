import type { MarketResult, MarketSymbol } from './market-types';
import type { SessionDTO, MessageDTO, RunDTO, StreamEvent, SessionSnapshot } from './conversation-types';
export type RunStreamUpdate = { kind: 'event'; event: StreamEvent } |
  { kind: 'connection'; phase: 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'failed'; detail: string };
export type BackendPhase = 'idle' | 'starting' | 'healthy' | 'failed' | 'stopping';
export interface BackendState {
  phase: BackendPhase;
  detail: string;
  checkedAt?: string;
  pythonVersion?: string;
}
export interface ResearchTrailBridge {
  providerProfiles(): Promise<import('./provider-types').ProviderProfile[]>;
  saveProvider(provider: import('./provider-types').ProviderId, input: import('./provider-types').ProviderConfiguration): Promise<import('./provider-types').ProviderProfile>;
  deleteProvider(provider: import('./provider-types').ProviderId): Promise<import('./provider-types').ProviderProfile>;
  saveProviderCredential(provider: import('./provider-types').ProviderId, input: import('./provider-types').ProviderCredentials): Promise<import('./provider-types').ProviderProfile>;
  deleteProviderCredential(provider: import('./provider-types').ProviderId): Promise<import('./provider-types').ProviderProfile>;
  providerCapabilities(): Promise<import('./provider-types').CapabilityView[]>;
  queryProvider(provider: import('./provider-types').ProviderId, input: import('./provider-types').ReadQuery): Promise<import('./provider-types').ProviderResult>;
  connections(): Promise<import('./settings-types').ConnectionView[]>;
  saveConnection(kind: import('./settings-types').ConnectionKind, input: import('./settings-types').ConnectionInput): Promise<import('./settings-types').ConnectionView>;
  deleteConnection(kind: import('./settings-types').ConnectionKind): Promise<import('./settings-types').ConnectionView>;
  saveCredential(kind: import('./settings-types').ConnectionKind, secret: string): Promise<import('./settings-types').ConnectionView>;
  deleteCredential(kind: import('./settings-types').ConnectionKind): Promise<import('./settings-types').ConnectionView>;
  testConnection(kind: import('./settings-types').ConnectionKind): Promise<import('./settings-types').ConnectionView>;
  profile(): Promise<import('./settings-types').Profile>;
  saveProfile(input: import('./settings-types').Profile): Promise<import('./settings-types').Profile>;
  deleteProfile(): Promise<import('./settings-types').Profile>;
  diagnostics(): Promise<import('./settings-types').Diagnostics>;
  exportDiagnostics(): Promise<boolean>;
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
  sessionSnapshot(sessionId: string): Promise<SessionSnapshot>;
  startRun(sessionId: string, input: string): Promise<RunDTO>;
  startAgentRun(sessionId: string, input: string, scenario?: 'normal' | 'delayed' | 'timeout', kind?: 'fake_agent' | 'openai_agent'): Promise<RunDTO>;
  cancelRun(sessionId: string, runId: string): Promise<RunDTO>;
  getRun(sessionId: string, runId: string): Promise<RunDTO>;
  runEvents(sessionId: string, runId: string, afterSequence?: number): Promise<StreamEvent[]>;
  subscribeRun(sessionId: string, runId: string, afterSequence: number, callback: (update: RunStreamUpdate) => void): () => void;
  onStatus(callback: (state: BackendState) => void): () => void;
}
