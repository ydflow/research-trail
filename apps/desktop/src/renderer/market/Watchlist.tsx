// Adapted from Folio packages/ui/src/components/stock/Watchlist.tsx (WatchlistRow
// selection/name layout and uppercase input), ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326.
// Upstream: https://github.com/helsome/folio. Scope/license record: docs/EVIDENCE.md §8.
import { useState } from 'react';
import type { MarketSymbol } from '../../market-types';

export function Watchlist({ symbols, active, onSelect }: {
  symbols: MarketSymbol[]; active: string; onSelect: (symbol: string) => void;
}) {
  const [input, setInput] = useState('');
  return <section className="watchlist" aria-label="选择股票">
    <div className="stock-list">{symbols.map(({ symbol, name }) =>
      <button key={symbol} className="stock-row" aria-label={symbol}
        aria-pressed={active === symbol} onClick={() => onSelect(symbol)}>
        <strong>{symbol}</strong><span>{name}</span>
      </button>)}</div>
    <form className="symbol-form" onSubmit={(event) => { event.preventDefault(); onSelect(input.trim().toUpperCase()); }}>
      <label htmlFor="symbol">查询代码</label>
      <input id="symbol" value={input} maxLength={32} placeholder="例如 AAPL.US"
        onChange={(event) => setInput(event.target.value.toUpperCase())} />
      <button type="submit">查询</button>
    </form>
  </section>;
}
