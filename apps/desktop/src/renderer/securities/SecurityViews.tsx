// Local adaptations of Folio workspace/{OverviewView,SecurityHeader,ChartView,
// FinancialsView,NewsView}.tsx and stock/Watchlist.tsx: metric cards, table rows,
// original-link news list, selected symbol and chart lifecycle. No portfolio sections.
// https://github.com/helsome/folio; ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326.
// Python owns all reads/state. Scope and retained declarations: docs/EVIDENCE.md §28.
import { useState, type ReactNode } from 'react';
import type { SecurityBlock, SecurityPage, SecurityQuery } from '../../workspace-types';
import { FinancialKLineChart } from '../market/FinancialKLineChart';

export const display = (value: string | number | null | undefined) => value == null || value === '' ? '—' : typeof value === 'number' ? value.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : value;
export function time(value: string | null | undefined) { return value ? `${new Date(value).toLocaleString('zh-CN', { timeZone: 'UTC', hour12: false })} UTC` : '—'; }
const names = { longbridge: 'Longbridge', massive: 'Massive', 'longbridge-account': 'Longbridge只读账户' };
const timing = { unknown: '延迟未知', realtime: '实时（自行声明）', delayed: '延迟（自行声明）', historical: '历史' };
const sources = { fixture: '自主编写的模拟样例', sdk: '官方Python SDK', cli: '只读CLI', http: 'REST接口' };

function Source({ block }: { block: SecurityBlock }) {
  const p = block.provenance;
  return <div className="security-source" data-testid="security-source">
    <p>{p ? `${names[p.provider]} · ${p.data_label} · ${sources[p.transport]} · ${p.cached ? '缓存命中' : '本次获取'} · ${timing[p.timeliness]}` : '数据来源：—'}</p>
    <p>市场时间：{time(p?.market_time)} · 获取时间：{time(p?.fetched_at)} · 服务时间：{time(p?.served_at)}</p>
    {p?.mode === 'real' && <p>时效依据：{p.timeliness_basis === 'user-declared' ? '本机配置声明' : p.timeliness_basis === 'historical-request' ? '历史请求' : '未知'}；成功仅证明本次能力请求。</p>}
  </div>;
}
function BlockFrame({ block, children }: { block: SecurityBlock; children: ReactNode }) {
  return <section className="security-block" data-testid="security-block" data-status={block.status}>
    <h3>{block.title}{block.symbol ? <small> {block.symbol}</small> : null}</h3>
    {block.status === 'missing' ? <p className="security-empty">缺失数据 · —{block.code ? ` · ${block.code}` : ''}</p> : block.status !== 'ready' ?
      <p role="alert">{block.status === 'restricted' ? '权限受限' : block.status === 'unconfigured' ? '未配置' : block.status === 'unsupported' ? '能力不支持' : '提供商失败'} · {block.code} · {block.message}</p> : null}
    {children}<Source block={block} />
  </section>;
}
function Metrics({ block }: { block: SecurityBlock }) {
  return <dl className="security-metrics">{(block.metrics ?? []).map(m => <div key={m.label}><dt>{m.label}</dt><dd>{display(m.value)}{m.value != null && m.unit ? ` ${m.unit}` : ''}</dd></div>)}</dl>;
}
// OverviewView's metric blocks, without its original portfolio or estimated year range.
export function OverviewView({ page }: { page: SecurityPage }) {
  return <div className="security-grid">{page.blocks.map((block, i) => <BlockFrame key={i} block={block}><Metrics block={block} /></BlockFrame>)}</div>;
}
// SecurityHeader/QuoteCard's last price and supporting statistics.
export function QuoteView({ page }: { page: SecurityPage }) {
  return <>{page.blocks.map((block, i) => <BlockFrame key={i} block={block}>
    <p className="security-price">{display(block.metrics?.find(m => m.label === '最新价')?.value)}</p><Metrics block={block} />
  </BlockFrame>)}</>;
}
export function ChartView({ page, period }: { page: SecurityPage; period: SecurityQuery['period'] }) {
  return <>{page.blocks.map((block, i) => <BlockFrame key={i} block={block}>
    {(block.bars?.length ?? 0) > 0 ? <FinancialKLineChart bars={block.bars!} symbol={block.symbol!} period={period} dataLabel={page.mode === 'simulated' ? '模拟' : '真实'} /> : <p>暂无K线 · —</p>}
    {page.mode === 'simulated' && <p className="security-note">模拟K线为固定日线样例；不证明所选周期在真实市场可用。</p>}
  </BlockFrame>)}</>;
}
// FinancialsView's table/card layout; extended with the Python statement DTO.
export function FinancialsView({ page }: { page: SecurityPage }) {
  return <>{page.blocks.map((block, i) => <BlockFrame key={i} block={block}>
    <div className="security-table-scroll"><table><caption>供应商返回报表；缺失值为 —，不补零、不跨币种合计。</caption>
      <thead><tr><th>报表</th><th>指标</th><th>报告期</th><th>币种</th><th>数值</th></tr></thead>
      <tbody>{block.financials?.length ? block.financials.map((r, j) => <tr key={j}><td>{{ IS: '利润表', BS: '资产负债表', CF: '现金流量表' }[r.statement]}</td><td>{r.label}</td><td>{display(r.period)}</td><td>{display(r.currency)}</td><td>{display(r.value)}</td></tr>) : <tr><td colSpan={5}>暂无财务报表 · —</td></tr>}</tbody>
    </table></div>
  </BlockFrame>)}</>;
}
// NewsView's source-linked list; no invented timestamp, URL, summary or HTML rendering.
export function NewsView({ page }: { page: SecurityPage }) {
  const [linkError, setLinkError] = useState('');
  return <>{page.blocks.map((block, i) => <BlockFrame key={i} block={block}>
    <ul className="security-news">{block.news?.length ? block.news.map((n, j) => <li key={`${n.id}-${j}`}>
      {n.url ? <a href={n.url} target="_blank" rel="noopener noreferrer" onClick={e => {
        e.preventDefault(); setLinkError(''); void window.researchTrail!.openNewsSource(n.url!).catch(() => setLinkError('无法打开原始来源链接。'));
      }}>{display(n.title)}</a> : <strong>{display(n.title)}</strong>}
      <p>{display(n.summary)}</p><small>原始来源：{display(n.source)} · 发布时间：{time(n.published_at)}{n.url ? '' : ' · 来源链接：—'}</small>
    </li>) : <li>暂无新闻 · —</li>}</ul>
    {linkError ? <p role="alert">{linkError}</p> : null}
  </BlockFrame>)}</>;
}
// SecurityHeader's market-suffix selection, with per-market source time preserved.
export function MarketStatusView({ page }: { page: SecurityPage }) {
  return <>{page.blocks.map((block, i) => <BlockFrame key={i} block={block}>
    <dl className="security-metrics">{block.markets?.length ? block.markets.map((r, j) => <div key={j}><dt>{r.market}</dt><dd>{display(r.status)}<br /><small>市场时钟：{time(r.market_time)}</small></dd></div>) : <div><dt>市场状态</dt><dd>—</dd></div>}</dl>
  </BlockFrame>)}</>;
}
export function WatchlistView({ page, onSelect }: { page: SecurityPage; onSelect: (symbol: string) => void }) {
  return <div className="security-grid">{page.blocks.length ? page.blocks.map((block, i) => <BlockFrame key={i} block={block}>
    <button className="secondary" onClick={() => onSelect(block.symbol!)}>查看 {block.symbol}</button>
    <Metrics block={block} />
  </BlockFrame>) : <p>自选列表为空 · —</p>}</div>;
}
