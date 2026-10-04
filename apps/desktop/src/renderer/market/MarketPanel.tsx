import { useEffect, useState } from 'react';
import type { MarketSnapshot, MarketSymbol } from '../../market-types';
import { Watchlist } from './Watchlist';
import { QuoteCard } from './QuoteCard';
import { FinancialKLineChart } from './FinancialKLineChart';

const utc = (value: string) => new Date(value).toISOString().replace('T', ' ').replace('Z', ' UTC');
export function MarketPanel({ available }: { available: boolean }) {
  const [symbols, setSymbols] = useState<MarketSymbol[]>([]);
  const [symbol, setSymbol] = useState('AAPL.US');
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<{ data?: MarketSnapshot; error?: string; loading?: boolean }>({});
  useEffect(() => {
    if (!available || !window.researchTrail) return;
    let cancelled = false;
    window.researchTrail.marketSymbols().then((items) => { if (!cancelled) setSymbols(items); })
      .catch(() => { if (!cancelled) setView({ error: '无法读取模拟股票列表，请重新查询或检查后端连接。' }); });
    return () => { cancelled = true; };
  }, [available, revision]);
  useEffect(() => {
    let cancelled = false;
    if (!available || !window.researchTrail) { setView({}); return; }
    setView({ loading: true });
    window.researchTrail.marketSnapshot(symbol).then((result) => {
      if (!cancelled) setView(result.ok ? { data: result.data } : { error: result.error.message });
    }).catch(() => { if (!cancelled) setView({ error: '行情通信失败，请检查连接后重新查询。' }); });
    return () => { cancelled = true; };
  }, [available, symbol, revision]);
  const select = (next: string) => { setView({ loading: true }); setSymbol(next); setRevision((value) => value + 1); };
  // Hide the previous response immediately on selection or backend disconnection.
  const data = available && view.data?.quote.symbol === symbol ? view.data : undefined;
  return <section className="market-panel" aria-label="模拟行情">
    <div className="market-heading"><h2>行情一览</h2><span className="mock-badge">模拟数据 · 固定示例</span></div>
    <p className="market-note">FixtureMarketProvider · 仅供功能演示。重复查询不会更新市场价格。</p>
    <Watchlist symbols={symbols} active={symbol} onSelect={select} />
    {!available ? <p className="market-message">等待后端连接后读取模拟行情。</p> : <>
      <button className="refresh-market" onClick={() => select(symbol)}>重新查询</button>
      {view.loading && <p role="status">正在读取 {symbol || '代码'}…</p>}
      {view.error && <p role="alert" className="market-error">{view.error}</p>}
      {data && <>
        <QuoteCard quote={data.quote} />
        <div className="chart-heading"><h3>{data.quote.symbol} · 日 K 线</h3><span>模拟数据 · {data.klines.length} 根固定蜡烛</span></div>
        <FinancialKLineChart bars={data.klines} symbol={data.quote.symbol} />
        <p className="data-times">固定市场时间：<time data-testid="market-time">{utc(data.market_time)}</time><br />
          本次获取时间：<time data-testid="fetched-at">{utc(data.fetched_at)}</time></p>
        <p className="chart-summary">最后一根收盘：{data.klines.at(-1)?.close.toFixed(2)} USD · 示例版本 {data.fixture_version}</p>
      </>}
    </>}
  </section>;
}
