/* Layout adapted from Folio ba5dcdfd PortfolioCard / HoldingRow / ImportDraftReview.
 * Source: https://github.com/helsome/folio packages/ui/src/components/portfolio/.
 * Retains summary -> holdings -> explicit draft review; all business values come from Python.
 */
import { useEffect, useRef, useState } from 'react';
import type { ImportPreview, PortfolioInfo, PortfolioView } from '../../portfolio-types';
import './portfolio.css';

const kinds = { manual: 'CSV录入（真实性未核验）', simulated: '模拟账户', read_only: '真实账户 · 只读' };
const states = { ready: '计算完成', partial: '数据不完整', empty: '空组合', unverified: '真实查询未执行', failed: '查询失败', restricted: '权限受限', unconfigured: '未配置' };
const sources = { 'csv-snapshot': 'CSV快照（单价来自文件）', 'authored-fixture': '固定模拟样例', 'longbridge-account': 'Longbridge只读账户' };
const sample = 'record_type,symbol,currency,quantity,cost_price,market_price,amount\nholding,AAPL.US,USD,2,100,120,\ncash,,USD,,,,100';
const number = (v: string | null | undefined) => v ?? '—';

function Valuation({ value, preview = false }: { value: PortfolioView; preview?: boolean }) {
  return <div data-testid={preview ? 'portfolio-preview-values' : 'portfolio-values'} data-status={value.status}>
    <p className="portfolio-status">{states[value.status]} · 来源：{sources[value.source]}</p>
    <div className="portfolio-currencies">{value.currencies.map(c => <article key={c.currency} className="portfolio-summary" aria-label={`${c.currency}资产`}>
      <strong>{c.currency} · 资产</strong><div className="portfolio-assets" data-testid={`assets-${c.currency}`}>{number(c.assets)}</div>
      <dl><div><dt>市值</dt><dd>{number(c.market_value)}</dd></div><div><dt>成本</dt><dd>{number(c.cost)}</dd></div>
        <div><dt>未实现盈亏</dt><dd>{number(c.pnl)}</dd></div><div><dt>现金</dt><dd>{number(c.cash)}</dd></div></dl>
      <small>持仓 {c.holdings_count} · 已估值 {c.valued_count}/{c.holdings_count} · 已知市值小计 {c.known_market_value}</small>
    </article>)}</div>
    {!value.currencies.length && <p>尚无持仓与现金记录。</p>}
    <div className="portfolio-table-wrap"><table aria-label={preview ? '导入预览持仓' : '组合持仓'}><thead><tr>
      {['证券','币种','数量','成本单价','估值单价','成本','市值','未实现盈亏','盈亏%'].map(h => <th key={h}>{h}</th>)}
    </tr></thead><tbody>{value.holdings.map(h => <tr key={`${h.symbol}:${h.currency}`}>
      {[h.symbol,h.currency,h.quantity,h.cost_price,h.market_price,h.cost,h.market_value,h.pnl,h.pnl_percent].map((v,i) => <td key={i}>{number(v)}</td>)}
    </tr>)}</tbody></table></div>
    {!!value.cash_rows.length && <p>现金记录：{value.cash_rows.map(c => `${c.currency} ${number(c.amount)}`).join('；')}</p>}
    {!!value.reported_net_assets?.length && <p>提供商报告净资产（与本项目计算分开）：{value.reported_net_assets.map(c => `${c.currency} ${number(c.amount)}`).join('；')}</p>}
    <p className="timestamp">保存/查询时间：{value.updated_at ?? '—'} · 市场时间：{value.market_time ?? '—'}</p>
    {(value.provenance ?? []).map(p => <p className="timestamp" key={`${p.provider}:${p.fetched_at}`}>
      {p.provider} / {p.transport} · {p.data_label} · {p.timeliness} · {p.cached ? '缓存' : '本次查询'} · 获取 {p.fetched_at}
    </p>)}
    {value.message && <p role="status">{value.code ? `${value.code}：` : ''}{value.message}</p>}
    <ul className="portfolio-method">{value.limitations.map(t => <li key={t}>{t}</li>)}</ul>
  </div>;
}

function PortfolioDetail({ info, available }: { info: PortfolioInfo; available: boolean }) {
  const [value,setValue] = useState<PortfolioView>();
  const [csv,setCsv] = useState('');
  const [preview,setPreview] = useState<ImportPreview>();
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const request=++generation.current; setBusy(true); setError('');
    if (!available) { setBusy(false); return; }
    void window.researchTrail!.portfolioView(info.id).then(next => { if (request===generation.current) setValue(next); })
      .catch(() => { if (request===generation.current) setError('组合读取失败，请检查本机服务。'); })
      .finally(() => { if (request===generation.current) setBusy(false); });
    return () => { generation.current++; };
  }, [available,info.id]);
  const run = async (task: () => Promise<void>) => {
    if (busy || !available) return;
    const request=++generation.current; setBusy(true); setError('');
    try { await task(); }
    catch (e) { if (request===generation.current) setError(e instanceof Error ? e.message : '组合操作失败。'); }
    finally { if (request===generation.current) setBusy(false); }
  };
  // Each callback checks the mounted generation before installing a response from Python.
  const install = async (request: Promise<PortfolioView>) => {
    const current=generation.current; const next=await request;
    if (current===generation.current) { setValue(next); setPreview(undefined); }
  };
  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    const current=generation.current;
    try {
      if (file.size>131072) throw new Error();
      const text=new TextDecoder('utf-8',{ fatal:true }).decode(await file.arrayBuffer());
      if (current===generation.current) { setCsv(text); setPreview(undefined); }
    } catch { if (current===generation.current) setError('文件须为UTF-8 CSV且不超过128KiB。'); }
    finally { if (fileInput.current) fileInput.current.value=''; }
  };
  return <section className="portfolio-detail" aria-label="当前组合" aria-busy={busy}>
    <h3 data-testid="portfolio-name">{info.name}</h3>
    <p className="portfolio-kind">{kinds[info.kind]}</p>
    <p className="timestamp">账户：{info.account_name} · {info.account_id}<br/>组合：{info.id}</p>
    {error && <p role="alert" className="error">{error}</p>}
    {busy && <p role="status">正在处理…</p>}
    {value && <Valuation value={value} />}
    {info.kind==='read_only' ? <button disabled={busy || !available} onClick={() => void run(() => install(window.researchTrail!.refreshPortfolio(info.id)))}>查询真实只读账户</button> : <>
      <div className="portfolio-actions"><button disabled={busy || !available || !value?.undo_batch} onClick={() => void run(() => install(window.researchTrail!.undoPortfolio(info.id,value!.undo_batch!)))}>撤销最近导入</button></div>
      <h4>标准CSV快照导入</h4>
      <p>确认后替换本组合的全部持仓与现金。CSV没有现金行时现金为—；需要零现金时请写明0。估值单价不是实时行情。</p>
      <div className="portfolio-actions"><label>选择UTF-8 CSV<input ref={fileInput} type="file" accept=".csv,text/csv" disabled={busy || !available} onChange={e => { const file=e.target.files?.[0]; void run(() => loadFile(file)); }}/></label>
        <button disabled={busy} onClick={() => { setCsv(sample); setPreview(undefined); }}>填入手算示例</button></div>
      <label>CSV内容<textarea aria-label="CSV内容" value={csv} disabled={busy} spellCheck={false} onChange={e => { setCsv(e.target.value); setPreview(undefined); }}/></label>
      <button disabled={busy || !available || !csv.trim()} onClick={() => void run(async () => {
        const current=generation.current; const next=await window.researchTrail!.previewPortfolio(info.id,csv);
        if (current===generation.current) { setPreview(next); setCsv(''); }
      })}>预览导入</button>
      {preview && <section className="portfolio-preview" aria-label="导入预览">
        <h4>导入预览 · 尚未保存</h4><p>预览有效10分钟；服务重启或组合变化后须重新预览。整批校验通过才能确认。</p>
        <ul>{preview.issues.map((i,n) => <li key={n} className="error">{i.line ? `第${i.line}行` : '整批'} · {i.code} · {i.message}</li>)}</ul>
        <Valuation value={preview.valuation} preview />
        <div className="portfolio-actions"><button disabled={busy || !preview.can_import || !preview.draft_id} onClick={() => void run(() => install(window.researchTrail!.confirmPortfolio(info.id,preview.draft_id!)))}>确认替换并保存</button>
          <button disabled={busy} onClick={() => setPreview(undefined)}>取消预览</button></div>
      </section>}
    </>}
  </section>;
}

export function PortfolioPanel({ available }: { available: boolean }) {
  const [items,setItems] = useState<PortfolioInfo[]>([]);
  const [id,setId] = useState('');
  const [name,setName] = useState('');
  const [kind,setKind] = useState<'manual' | 'simulated'>('manual');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const generation=useRef(0);
  useEffect(() => {
    const request=++generation.current;
    if (available) void window.researchTrail!.portfolioList().then(next => {
      if (request!==generation.current) return;
      setItems(next); setId(previous => next.some(p => p.id===previous) ? previous : next.find(p=>p.kind==='manual')?.id ?? next[0]?.id ?? '');
    }).catch(() => { if (request===generation.current) setError('组合列表读取失败。'); });
    return () => { generation.current++; };
  },[available]);
  const selected=items.find(p=>p.id===id);
  return <section className="portfolio-panel" aria-label="组合工作台">
    <h2>组合工作台</h2><p>账户与组合分别标识。模拟、CSV录入和真实只读账户各自保存，币种分别计算。</p>
    {!available && <p role="status">本机服务尚未就绪。</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="portfolio-layout"><aside aria-label="组合列表">
      {items.map(p => <button key={p.id} disabled={busy || !available} aria-pressed={p.id===id} onClick={() => setId(p.id)}>{p.name}<small>{kinds[p.kind]}</small></button>)}
      <form onSubmit={e => { e.preventDefault(); if (busy || !available) return;
        const request=++generation.current; setBusy(true); setError('');
        void window.researchTrail!.createPortfolio({ name,kind }).then(async created => {
          const next=await window.researchTrail!.portfolioList();
          if (request===generation.current) { setItems(next); setId(created.id); setName(''); }
        }).catch(e => { if (request===generation.current) setError(e instanceof Error ? e.message : '创建失败。'); })
          .finally(() => { if (request===generation.current) setBusy(false); });
      }}><label>新组合名称<input maxLength={40} value={name} onChange={e => setName(e.target.value)} disabled={busy}/></label>
        <label>账户类型<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)} disabled={busy}><option value="manual">CSV录入</option><option value="simulated">模拟账户</option></select></label>
        <button disabled={busy || !available || !name.trim()}>创建独立组合</button></form>
    </aside>{selected && <PortfolioDetail key={selected.id} info={selected} available={available}/>}</div>
  </section>;
}
