/* Necessary presentation adapted from Folio ba5dcdfd PortfolioRiskPanel.tsx and CompareTable.tsx.
 * https://github.com/helsome/folio packages/ui/src/components/{portfolio,compare}/
 * Python owns every metric; the same component renders page and persisted Agent tool results.
 */
import type { RiskReport, Comparison } from '../../analytics-types';
import './analytics.css';
const value = (v: string | null | undefined) => v ?? '—';
export default function Results({ report }: { report: RiskReport | Comparison }) {
  return <section className="analytics-result" data-testid={'portfolio_id' in report ? 'risk-result' : 'compare-result'} data-status={report.status} data-snapshot={report.snapshot_id}>
    <h3>{'portfolio_id' in report ? '组合风险摘要' : '股票对比表'}</h3><p>{report.summary}</p>
    <p className="timestamp">{report.provider} · {report.mode === 'simulated' ? '模拟行情' : '真实查询（时效见来源）'} · 状态 {report.status}<br />计算时间 {report.calculated_at} · 快照 {report.snapshot_id}</p>
    {'portfolio_id' in report ? <>
      <p>账户类型 {report.account_kind} · 持仓来源 {report.input_source} · 输入状态 {report.input_status} · 输入时间 {value(report.input_time)} · 组合revision {report.portfolio_revision}</p>
      {report.input_message && <p>{report.input_code} {report.input_message}</p>}
      {!report.groups.length && <p>空组合 / 没有可用持仓。风险指标：—</p>}
      {report.groups.map(g => <article className="analytics-group" key={g.currency} aria-label={`${g.currency}风险`}>
        <h4>{g.currency} · {g.status} · 持仓市值 {value(g.total_market_value)}</h4>
        <dl className="analytics-metrics">{[['Top1权重',g.top1_weight],['Top5权重',g.top5_weight],['HHI集中度',g.herfindahl]].map(([label,v]) => <div key={label!}><dt>{label}（0—1）</dt><dd data-testid={`risk-${label}-${g.currency}`}>{value(v)}</dd></div>)}</dl>
        <div className="analytics-table"><table aria-label={`${g.currency}权重`}><thead><tr>{['证券','数量','估值单价','市值','权重（比例）'].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{g.allocation.map(a => <tr key={a.symbol}>{[a.symbol,a.quantity,a.price,a.market_value,a.weight].map((v,i) => <td key={i}>{value(v)}</td>)}</tr>)}</tbody></table></div>
        <div className="analytics-table"><table aria-label={`${g.currency}波动`}><thead><tr>{['对象','日波动（比例）','年化波动（比例）','回撤（比例）','样本/时间范围'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
          {[...(g.portfolio_volatility ? [g.portfolio_volatility] : []),...g.series].map(s => <tr key={s.symbol}><td>{s.symbol}</td><td>{value(s.daily_volatility)}</td><td>{value(s.annualized_volatility)}</td><td>{value(s.drawdown)}</td><td>{s.bars}根/{s.returns}收益 · {value(s.start)} → {value(s.end)}{s.reason && <small>{s.reason}</small>}</td></tr>)}
        </tbody></table></div>
        {g.signals.map((s,i) => <p className={`analytics-signal ${s.severity}`} key={`${s.kind}:${s.symbol}:${i}`}><strong>{s.kind} · {s.severity}</strong> {s.symbol} {s.detail}</p>)}
        {!!g.unavailable.length && <ul>{g.unavailable.map((s,i) => <li key={i}>{s}</li>)}</ul>}
      </article>)}
    </> : <>
      <p>统一币种 {report.currency} · 年度报告期 {report.report_period}；TTM/市场指标的期间单列。</p>
      <div className="analytics-table"><table aria-label="股票统一指标对比"><thead><tr><th>指标 / 单位</th>{report.symbols.map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>
        {report.rows.map(row => <tr key={row.metric}><th>{row.label} {row.unit}</th>{report.symbols.map(s => { const c=row.cells[s]; return <td key={s} data-metric={row.metric} data-symbol={s}>{value(c?.value)}<small>{c?.reason ?? c?.period ?? '—'} {c?.currency}</small></td>; })}</tr>)}
      </tbody></table></div>
    </>}
    <details><summary>数据来源与读取状态（{report.reads.length}）</summary>{report.reads.map(r => <p className="timestamp" key={`${r.symbol}:${r.capability}`}>
      {r.symbol} · {r.capability} · {r.status} {r.code} {r.provenance && <><br />{r.provenance.data_label} / {r.provenance.transport} / 缓存 {r.provenance.cached ? '是' : '否'} · 市场时间 {value(r.provenance.market_time)} · 获取 {r.provenance.fetched_at}</>}
    </p>)}</details>
    <details open><summary>计算输入、时间范围与方法限制</summary><ul>{report.limitations.map(s => <li key={s}>{s}</li>)}</ul></details>
  </section>;
}
