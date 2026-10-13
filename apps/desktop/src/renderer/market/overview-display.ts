import type { OverviewRow } from '../../market-overview-types';

export const MARKET_NAMES = { CN: 'A 股', US: '美股', CRYPTO: '加密货币' };
export const percent = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
export const number = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: digits });
export const unit = (row: OverviewRow) => row.asset.asset_class === 'equity' ? row.asset.currency : row.asset.quote_asset;
export const utc = (value: string) => new Date(value).toISOString().replace('T', ' ').replace('.000Z', 'Z').replace('Z', ' UTC');
export const supportedSecurity = (row: OverviewRow) => row.asset.asset_class === 'equity' && row.asset.market === 'US' && row.detail_target === 'security' && row.security_symbol === row.asset.symbol && ['AAPL.US', 'MSFT.US', 'NVDA.US', 'TSLA.US'].includes(row.asset.symbol) ? row.security_symbol : null;

export function colorBand(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'missing';
  if (value <= -3) return 'loss-3';
  if (value <= -1) return 'loss-2';
  if (value < 0) return 'loss-1';
  if (value === 0) return 'flat';
  if (value < 1) return 'gain-1';
  if (value < 3) return 'gain-2';
  return 'gain-3';
}

export function visibleRows(rows: OverviewRow[], search: string, group: string, sort: string) {
  const term = search.trim().toLocaleLowerCase();
  return rows.filter(row => (!term || `${row.asset.symbol} ${row.asset.name}`.toLocaleLowerCase().includes(term)) &&
    (group === 'all' || (group === 'unclassified' ? row.classification === null : row.classification === group)))
    .sort((a, b) => {
      if (sort === 'symbol') return a.asset.symbol.localeCompare(b.asset.symbol);
      if (a.change_percent === null) return b.change_percent === null ? a.asset.id.localeCompare(b.asset.id) : 1;
      if (b.change_percent === null) return -1;
      return (sort === 'asc' ? a.change_percent - b.change_percent : b.change_percent - a.change_percent) || a.asset.id.localeCompare(b.asset.id);
    });
}
