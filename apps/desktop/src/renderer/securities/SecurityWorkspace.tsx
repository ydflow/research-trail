// Adapted from Folio FinanceWorkspace.tsx, SecurityHeader.tsx and Watchlist.tsx:
// security context, view navigation and add/remove rows. Local Python APIs replace atoms/client.
// https://github.com/helsome/folio; ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326.
// Source/scope declarations: docs/EVIDENCE.md §28/36. Step15 adds a contextual research entry.
import { useEffect, useRef, useState } from 'react';
import type { SecurityPage, SecurityQuery, SecurityView, WorkspaceState } from '../../workspace-types';
import { ChartView, FinancialsView, MarketStatusView, NewsView, OverviewView, QuoteView, WatchlistView } from './SecurityViews';

const views: Record<SecurityView, string> = { watchlist: '自选列表', overview: '证券概览', quote: '行情', kline: 'K线', financials: '财务报表', news: '新闻', status: '市场状态' };
const states = { ready: '数据就绪', missing: '缺失数据', partial: '部分数据缺失或失败', failed: '提供商失败' };

export function SecurityWorkspace({ available, onResearch }: { available: boolean; onResearch?: (symbol: string) => void }) {
  const [state, setState] = useState<WorkspaceState>();
  const [view, setView] = useState<SecurityView>('overview');
  const [provider, setProvider] = useState<SecurityQuery['provider']>('longbridge');
  const [mode, setMode] = useState<SecurityQuery['mode']>('simulated');
  const [period, setPeriod] = useState<NonNullable<SecurityQuery['period']>>('1d');
  const [kind, setKind] = useState<NonNullable<SecurityQuery['kind']>>('ALL');
  const [report, setReport] = useState<NonNullable<SecurityQuery['report']>>('annual');
  const [offset, setOffset] = useState(0), [input, setInput] = useState('');
  const [result, setResult] = useState<{ key: string; page: SecurityPage }>();
  const [busy, setBusy] = useState(false), [writing, setWriting] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), mounted = useRef(false), writes = useRef(Promise.resolve()), queued = useRef(0);
  useEffect(() => {
    mounted.current = true; let active = true;
    setState(undefined); setResult(undefined);
    if (available) void window.researchTrail!.workspaceState().then(next => { if (active) setState(next); })
      .catch(() => { if (active) setError('无法读取持久自选，请检查本地服务。'); });
    return () => { active = false; mounted.current = false; generation.current++; };
  }, [available]);
  const query: SecurityQuery = { view, provider, mode, symbol: state?.active_symbol ?? null, period, kind, report, offset };
  const key = JSON.stringify([query, state?.revision]);
  const keyRef = useRef(key); keyRef.current = key;
  const page = result?.key === key ? result.page : undefined;
  async function load(body: SecurityQuery, requestKey: string) {
    const id = ++generation.current; setBusy(true); setError('');
    try {
      const next = await window.researchTrail!.securityPage(body);
      if (mounted.current && id === generation.current && requestKey === keyRef.current) {
        if (next.view !== body.view || next.provider !== body.provider || next.mode !== body.mode || next.symbol !== body.symbol) throw new Error('Context mismatch');
        setResult({ key: requestKey, page: next });
      }
    } catch { if (mounted.current && id === generation.current && requestKey === keyRef.current) setError('证券页面请求失败，请检查本地服务。'); }
    finally { if (mounted.current && id === generation.current) setBusy(false); }
  }
  useEffect(() => {
    generation.current++; setResult(undefined); setBusy(false); setError('');
    if (available && state && mode === 'simulated') void load(query, key);
    return () => { generation.current++; };
    // Key includes every request input and the persisted context revision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, available]);
  function mutate(work: () => Promise<WorkspaceState>) {
    queued.current++; setWriting(true); setError('');
    generation.current++; setResult(undefined); setBusy(false);
    writes.current = writes.current.then(async () => {
      try {
        const next = await work();
        if (mounted.current) { setState(prev => !prev || next.revision >= prev.revision ? next : prev); setOffset(0); }
      } catch { if (mounted.current) setError('自选操作失败，请检查代码格式或20只上限。'); }
      finally { queued.current--; if (mounted.current && queued.current === 0) setWriting(false); }
    });
  }
  const enabled = available && !!state && !writing;
  return <section className="security-workspace" aria-label="证券工作台">
    <h2>证券工作台</h2>
    <p className="security-note">默认模拟。真实查询需要本机配置与权限；切换来源后只在点击查询时请求服务商。</p>
    <div className="security-toolbar">
      <label>证券提供商<select aria-label="证券提供商" disabled={!enabled} value={provider} onChange={e => setProvider(e.target.value as SecurityQuery['provider'])}><option value="longbridge">Longbridge</option><option value="massive">Massive（美股）</option></select></label>
      <label>证券数据模式<select aria-label="证券数据模式" disabled={!enabled} value={mode} onChange={e => setMode(e.target.value as SecurityQuery['mode'])}><option value="simulated">模拟数据</option><option value="real">真实数据</option></select></label>
      <button disabled={!enabled || busy} onClick={() => void load(query, key)}>{busy ? '读取中…' : mode === 'real' ? '查询当前视图真实数据' : '刷新模拟数据'}</button>
    </div>
    <div className="security-layout">
      <aside aria-label="持久自选" className="security-watchlist">
        <h3>我的自选 <small>{state?.entries.length ?? 0}/20</small></h3>
        <form onSubmit={e => { e.preventDefault(); const symbol = input.trim().toUpperCase(); mutate(() => window.researchTrail!.addWatch(symbol)); setInput(''); }}>
          <label>添加证券代码<input aria-label="添加证券代码" value={input} maxLength={20} required placeholder="AAPL.US" disabled={!enabled} onChange={e => setInput(e.target.value.toUpperCase())} /></label>
          <button disabled={!enabled}>加入自选</button>
        </form>
        <ul>{state?.entries.map(row => <li key={row.symbol}><button className="security-stock" disabled={!enabled} aria-pressed={state.active_symbol === row.symbol} aria-label={`选择证券 ${row.symbol}`} onClick={() => mutate(() => window.researchTrail!.selectSecurity(row.symbol))}><strong>{row.symbol}</strong><span>{row.name}</span></button>
          <button className="security-remove" aria-label={`移除证券 ${row.symbol}`} disabled={!enabled} onClick={() => mutate(() => window.researchTrail!.removeWatch(row.symbol))}>移除</button></li>)}</ul>
        {state?.entries.length === 0 ? <p>自选列表为空 · —</p> : null}
      </aside>
      <div className="security-content">
        <header className="security-header"><strong data-testid="security-symbol">{state?.active_symbol ?? '—'}</strong><span> {state?.entries.find(r => r.symbol === state.active_symbol)?.name ?? '—'}</span>
          {onResearch && <button disabled={!available || !state?.active_symbol} onClick={() => state?.active_symbol && onResearch(state.active_symbol)}>采集此股票研究数据</button>}
        </header>
        <nav className="security-tabs" aria-label="证券视图">{Object.entries(views).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id as SecurityView)}>{label}</button>)}</nav>
        {view === 'kline' ? <label>K线周期<select aria-label="证券K线周期" value={period} onChange={e => setPeriod(e.target.value as typeof period)}>{['1m','5m','15m','1h','1d','1w'].map(p => <option key={p}>{p}</option>)}</select></label> : null}
        {view === 'financials' ? <div className="security-toolbar"><label>报表类型<select aria-label="报表类型" value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="ALL">全部</option><option value="IS">利润表</option><option value="BS">资产负债表</option><option value="CF">现金流量表</option></select></label><label>报表周期<select aria-label="报表周期" value={report} onChange={e => setReport(e.target.value as typeof report)}><option value="annual">年度</option><option value="interim">半年度</option><option value="quarter">季度</option></select></label></div> : null}
        {view === 'watchlist' ? <div className="security-toolbar"><span>本页最多查询4只，每只来源独立。</span><button disabled={offset === 0 || busy} onClick={() => setOffset(Math.max(0, offset - 4))}>上一组自选</button><button disabled={offset + 4 >= (state?.entries.length ?? 0) || busy} onClick={() => setOffset(offset + 4)}>下一组自选</button></div> : null}
        <p className="security-view-state" data-testid="security-view-state">{views[view]} · {provider === 'longbridge' ? 'Longbridge' : 'Massive'} · {mode === 'simulated' ? '模拟数据' : '真实模式'} · {busy ? '读取中' : page ? states[page.status] : mode === 'real' ? '等待显式查询' : '等待数据'}</p>
        {error ? <p role="alert">{error}</p> : null}
        {page ? <div data-testid="security-view" data-view={page.view} data-status={page.status}>
          {view === 'overview' ? <OverviewView page={page} /> : view === 'quote' ? <QuoteView page={page} /> : view === 'kline' ? <ChartView page={page} period={period} /> : view === 'financials' ? <FinancialsView page={page} /> : view === 'news' ? <NewsView key={key} page={page} /> : view === 'status' ? <MarketStatusView page={page} /> : <WatchlistView page={page} onSelect={symbol => mutate(() => window.researchTrail!.selectSecurity(symbol))} />}
          {page.blocks.length === 0 ? <p>没有可查询的证券 · —</p> : null}
        </div> : null}
      </div>
    </div>
  </section>;
}
