import type { components } from '../../../packages/contracts/generated';

export type OverviewQuery = components['schemas']['OverviewQuery'];
export type OverviewRow = components['schemas']['OverviewRow'];
export type MarketOverview = components['schemas']['MarketOverview'];
export type OverviewFailure = components['schemas']['OverviewFailure'];
export type OverviewCancelResult = components['schemas']['OverviewCancelResult'];
export type MarketOverviewResult = MarketOverview | OverviewFailure;
export type MarketId = OverviewQuery['market'];
