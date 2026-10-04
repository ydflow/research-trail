// Adapted from Folio packages/ui/src/components/agent/structured/QuoteCard.tsx:
// numeric/volume formatting and price/change/metrics layout. ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326.
// Upstream: https://github.com/helsome/folio. Scope/license record: docs/EVIDENCE.md §8.
import type { Quote } from '../../market-types';

const fmtNum = (n: number) => n.toFixed(2);
const signed = (n: number) => `${n >= 0 ? '+' : ''}${fmtNum(n)}`;
function fmtCompact(n: number) {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return String(n);
}
export function QuoteCard({ quote }: { quote: Quote }) {
  const metrics = [['开盘', fmtNum(quote.open)], ['最高', fmtNum(quote.high)],
    ['最低', fmtNum(quote.low)], ['昨收', fmtNum(quote.previous_close)], ['成交量', fmtCompact(quote.volume)]];
  return <section className="quote-card" data-testid="quote-card" data-symbol={quote.symbol}>
    <div><h2>{quote.name} <span>{quote.symbol}</span></h2><span className="mock-badge">模拟数据</span></div>
    <div className="price-line"><strong data-testid="quote-price">{fmtNum(quote.last_price)}</strong><span>{quote.currency}</span>
      <span className={quote.change >= 0 ? 'positive' : 'negative'}>{signed(quote.change)} ({signed(quote.change_percent)}%)</span></div>
    <dl className="metrics">{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}
