import { lazy, Suspense } from 'react';
import type { StreamEvent } from '../conversation-types';
import { QuoteCard } from './market/QuoteCard';
import { FinancialKLineChart } from './market/LazyFinancialKLineChart';

const Results = lazy(() => import('./analytics/Results'));
const utc = (time: string) => new Date(time).toISOString().replace('T', ' ').replace('Z', ' UTC');

export function ToolResultCards({ events, runId, compact = false }: { events: StreamEvent[]; runId: string; compact?: boolean }) {
  return <div className={`tool-cards${compact ? ' compact-tool-cards' : ''}`} data-testid="tool-cards">
    {events.map((event) => {
      if (event.run_id !== runId || event.type !== 'tool_result') return null;
      const result = event.payload.result;
      if (!result.ok) return <section key={event.payload.call_id} className="tool-failure" data-testid="tool-failure">
        <h3>Python工具调用失败</h3><p>{event.payload.name}</p>
        <p className="market-error">{result.error.code}：{result.error.message}</p>
      </section>;
      const data = result.data;
      if (data.kind === 'research_report') return <section key={event.payload.call_id} className="tool-result report-tool-card" data-testid="report-tool-result" data-tool={event.payload.name}>
        <h3>{data.symbol} · 已保存报告证据</h3><span className="mock-badge">模拟数据 · 固定合成器</span>
        <p>{data.facts_label}</p>
        <p className="report-overview">本页事实 <strong>{data.returned}/{data.total}</strong> · 未读 {data.omitted_facts}<br/>已返回来源 {data.sources.length} 项 · 缺口 {data.gaps.length} 项{data.omitted_gaps > 0 && `（另有 ${data.omitted_gaps} 项未返回）`}</p>
        <details><summary>报告身份与工具信息</summary><p>实际Python工具：{event.payload.name}；此卡来自已保存工具事件，历史读取不重新执行。</p><p>报告 {data.report_id} · 版本 {data.report_version}<br/>采集任务 {data.source_run_id} · {data.collection_status}<br/>事实偏移 {data.evidence_offset} · 未返回来源 {data.omitted_sources}</p></details>
        <details className="report-facts"><summary>查看本页事实、来源与SHA256</summary>{data.facts.map(f => <article key={f.id}><strong>{f.capability}{f.pointer}</strong><p>{JSON.stringify(f.value)}</p><small>引用 {f.id} · 执行序号 {f.ordinal} · 来源 {f.provider} · 获取 {f.fetched_at}<br/>SHA256 {f.result_hash}</small></article>)}{data.sources.map(s => <p key={s.capability}>{s.capability} · {s.provenance.data_label} · {s.provenance.transport}<br/>执行 {s.step_started_at} → {s.step_completed_at}<br/>市场时间 {s.provenance.market_time ?? '未提供'}</p>)}</details>
        <details className="report-analysis"><summary>固定摘要与分析 · {data.saved_summary.length} 项</summary><p>{data.synthesis_label}</p>{data.saved_summary.map((c,i)=><article key={i}><p>【{c.kind === 'fact' ? '事实' : c.kind === 'analysis' ? '分析' : '预测'}】{c.kind === 'fact' ? c.evidence_ids.map(id => { const f = data.facts.find(f => f.id === id); return f ? `${f.capability}${f.pointer} = ${JSON.stringify(f.value)}` : id; }).join('；') : c.text}</p><small>引用 {c.evidence_ids.join('、')}</small></article>)}<p>未返回摘要 {data.omitted_summary} 项</p></details>
        <section className="report-prediction"><h4>预测 · 未校准</h4>{data.saved_forecast ? <><p>{data.saved_forecast.label} · {(data.saved_forecast.probability * 100).toFixed(1)}%</p><p>{data.saved_forecast.horizon} · {data.saved_forecast.event}<br/>{data.saved_forecast.basis}</p><details><summary>预测引用</summary><p>{data.saved_forecast.evidence_ids.join('、')}</p></details></> : <p>{data.omitted_forecast ? '有预测未在本页返回，不能据此推断。' : '未提供预测，不从分析推算。'}</p>}</section>
        <section className="report-gap-section"><h4>数据缺口</h4>{data.gaps.length ? data.gaps.map((g,i)=><p key={i}>{g.scope} · {g.key} · {g.code}</p>) : <p>本页未返回缺口记录，不保证资料完整。</p>}</section>
        {data.next_offset !== null && <p>下一页偏移 {data.next_offset}；如需读取，请显式发送“证据偏移 {data.next_offset}”，不会自动翻页。</p>}
      </section>;
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
