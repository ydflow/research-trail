import { lazy, Suspense } from 'react';
import type { StreamEvent } from '../conversation-types';
import { QuoteCard } from './market/QuoteCard';
import { FinancialKLineChart } from './market/FinancialKLineChart';

const Results = lazy(() => import('./analytics/Results'));
const utc = (time: string) => new Date(time).toISOString().replace('T', ' ').replace('Z', ' UTC');

export function ToolResultCards({ events, runId }: { events: StreamEvent[]; runId: string }) {
  return <div className="tool-cards" data-testid="tool-cards">
    {events.map((event) => {
      if (event.run_id !== runId || event.type !== 'tool_result') return null;
      const result = event.payload.result;
      if (!result.ok) return <section key={event.payload.call_id} className="tool-failure" data-testid="tool-failure">
        <h3>Python工具调用失败</h3><p>{event.payload.name}</p>
        <p className="market-error">{result.error.code}：{result.error.message}</p>
      </section>;
      const data = result.data;
      if(data.kind === 'risk' || data.kind === 'compare') return <section key={event.payload.call_id} className="tool-result" data-testid="tool-result" data-tool={event.payload.name}>
        <p>Python只读工具 {event.payload.name} · 保存的计算快照，重读历史不重新计算。</p>
        <Suspense fallback={<p>正在显示计算结果…</p>}><Results report={data.report}/></Suspense>
      </section>;
      return <section key={event.payload.call_id} className="tool-result" data-testid="tool-result" data-tool={event.payload.name}>
        <p className="market-note">结果来自Python工具 · {data.kind === 'quote' ? '行情查询' : 'K线查询'}</p>
        {data.kind === 'quote' ? <QuoteCard quote={data.quote} /> : <>
          <div className="chart-heading"><h3>{data.symbol} · 日K线</h3><span className="mock-badge">{data.data_label}</span></div>
          <p className="chart-summary" data-testid="agent-kline-summary">{data.klines.length} 根日K线 · 最后收盘 {data.klines.at(-1)!.close.toFixed(2)} USD</p>
          <FinancialKLineChart bars={data.klines} symbol={data.symbol} />
        </>}
        <p className="data-times">固定市场时间：<span data-testid="tool-market-time">{utc(data.market_time)}</span><br />
          本次数据获取：<span data-testid="tool-fetched-at">{utc(data.fetched_at)}</span><br />
          此卡片保存的是本次调用结果，重读历史不会刷新行情。</p>
      </section>;
    })}
  </div>;
}
