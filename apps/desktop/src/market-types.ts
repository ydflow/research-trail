import type { components } from '../../../packages/contracts/generated';

export type MarketSymbol = components['schemas']['MarketSymbol'];
export type Quote = components['schemas']['Quote'];
export type Kline = components['schemas']['Kline'];
export type MarketSnapshot = components['schemas']['MarketSnapshot'];
export type MarketError = components['schemas']['MarketError'];
// Desktop transport failures are separate from Python's business errors.
export type MarketResult = { ok: true; data: MarketSnapshot } | {
  ok: false; error: MarketError | { code: 'UNAVAILABLE' | 'INVALID_SYMBOL'; message: string };
};
