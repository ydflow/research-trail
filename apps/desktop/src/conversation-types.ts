import type { components } from '../../../packages/contracts/generated';

export type SessionDTO = components['schemas']['SessionDTO'];
export type MessageDTO = components['schemas']['MessageDTO'];
export type RunDTO = components['schemas']['RunDTO'];
export type StreamEvent = components['schemas']['EventPage']['events'][number];
export type SessionSnapshot = components['schemas']['SessionSnapshot'];
export type ReportContextRef = components['schemas']['ReportContextRef'];
export type ReportReadToolData = components['schemas']['ReportReadToolData'];
export interface ReportCandidate extends ReportContextRef { symbol: string; version: number }
