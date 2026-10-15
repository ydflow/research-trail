// Adapted from Folio FinanceWorkspace.tsx, SecurityHeader.tsx and Watchlist.tsx:
// security context, view navigation and add/remove rows. Local Python APIs replace atoms/client.
// https://github.com/helsome/folio; ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326.
// Source/scope declarations: docs/EVIDENCE.md §28/36. Step15 adds a contextual research entry.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SecurityPage, SecurityQuery, SecurityView, WorkspaceState } from '../../workspace-types';
import { ChartView, FinancialsView, MarketStatusView, NewsView, QuoteView, WatchlistView } from './SecurityViews';
import { SectionHeader, StateNotice } from '../ui/Primitives';
import { SecuritySnapshots } from './security-snapshots';
import { SecurityOverview } from './SecurityOverview';
import { ChartPeriodBar } from './ChartPeriodBar';

const views: Record<SecurityView, string> = { watchlist: '自选列表', overview: '证券概览', quote: '行情', kline: 'K线', financials: '财务报表', news: '新闻', status: '市场状态' };
const states = { ready: '数据就绪', missing: '缺失数据', partial: '部分数据缺失或失败', failed: '提供商失败' };

export function SecurityWorkspace({ available, onResearch, snapshots }: { available: boolean; snapshots: SecuritySnapshots; onResearch?: (symbol: string) => void }) {
  const [state, setState] = useState<WorkspaceState>();
  const [view, setView] = useState<SecurityView>(snapshots.controls.view);
  const [provider, setProvider] = useState<SecurityQuery['provider']>(snapshots.controls.provider);
  const [mode, setMode] = useState<SecurityQuery['mode']>(snapshots.controls.mode);
  const [period, setPeriod] = useState<NonNullable<SecurityQuery['period']>>(snapshots.controls.period);
  const [kind, setKind] = useState<NonNullable<SecurityQuery['kind']>>(snapshots.controls.kind);
  const [report, setReport] = useState<NonNullable<SecurityQuery['report']>>(snapshots.controls.report);
  const [offset, setOffset] = useState(snapshots.controls.offset), [input, setInput] = useState('');
  useSyncExternalStore(snapshots.subscribe, snapshots.snapshot);
  const [result, setResult] = useState<{ key: string; page: SecurityPage }>();
  const [busy, setBusy] = useState(false), [writing, setWriting] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), mounted = useRef(false), writes = useRef(Promise.resolve()), queued = useRef(0);
  useEffect(() => {
    mounted.current = true; let active = true;
    setState(undefined); setResult(undefined);
    if (!available) snapshots.clear();
    if (available) void Promise.all([window.researchTrail!.workspaceState(), window.researchTrail!.providerProfiles()]).then(([next, profiles]) => {
      if (active) { for (const p of profiles) snapshots.version(p.provider, p.revision, p.configured, p.credential_present); setState(next); }
    })
      .catch(() => { if (active) setError('无法读取持久自选，请检查本地服务。'); });
    return () => { active = false; mounted.current = false; generation.current++; };
  }, [available]);
  const query: SecurityQuery = { view, provider, mode, symbol: state?.active_symbol ?? null, period, kind, report, offset };
  snapshots.controls = { view, provider, mode, period, kind, report, offset };
  const watchlist = state?.entries.map(e => e.symbol).join(',') ?? '';
  const key = snapshots.key(query, watchlist);
  const cached = state ? snapshots.get(key) : undefined;
  const keyRef = useRef(key); keyRef.current = key;
  const snapshotError = [query, ...(view === 'overview' ? (['quote','kline','financials','news'] as const).map(view => ({ ...query, view })) : [])].map(q => snapshots.error(snapshots.key(q, watchlist))).find(Boolean);
  const page = cached ?? (result?.key === key ? result.page : undefined);
  async function load(body: SecurityQuery, requestKey: string, refresh = false) {
    const id = ++generation.current; setBusy(true); setError('');
    const bodies = body.view === 'overview' && body.symbol ? [body, ...(['quote', 'kline', 'financials', 'news'] as const).map(view => ({ ...body, view }))] : [body];
    const results = await Promise.allSettled(bodies.map(async q => {
      const next = await snapshots.read(q, snapshots.key(q, watchlist), refresh);
      if (mounted.current && id === generation.current && requestKey === keyRef.current) {
        if (q.view === body.view) setResult({ key: requestKey, page: next });
      }
    }));
    if (mounted.current && id === generation.current && requestKey === keyRef.current) {
      if (results.some(r => r.status === 'rejected')) setError('刷新失败；已成功获取的上次查询快照保留，请显式刷新重试。');
      setBusy(false);
    }
  }
  useEffect(() => {
    generation.current++; setResult(undefined); setBusy(false); setError('');
    if (available && state && mode === 'simulated') void load(query, key);
    return () => { generation.current++; };
    // Full request identity excludes selection-only revision, so returning to a symbol reuses its snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, available, !!state]);
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
  const securityNavigation = <nav className="security-tabs" aria-label="证券视图">{Object.entries(views).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id as SecurityView)}>{label}</button>)}</nav>;
  return <section className="security-workspace" aria-label="证券工作台">
        <header className="security-header"><strong data-testid="security-symbol">{state?.active_symbol ?? '—'}</strong><span className="security-name">{state?.entries.find(r => r.symbol === state.active_symbol)?.name ?? '—'}</span><span className="security-market">{state?.active_symbol?.split('.').at(-1) ?? '—'} 市场</span>
          <SectionHeader title="证券工作台"><span className={mode === 'simulated' ? 'mock-badge' : 'real-badge'}>{mode === 'simulated' ? '模拟数据' : '真实数据 · 显式查询'}</span></SectionHeader>
          {onResearch && <button disabled={!available || writing || !state?.active_symbol || !['AAPL.US','MSFT.US','NVDA.US','TSLA.US'].includes(state.active_symbol)} onClick={() => !writing && state?.active_symbol && onResearch(state.active_symbol)}>采集此股票研究数据</button>}
        </header>
    <div className="security-toolbar">
      <label>证券提供商<select aria-label="证券提供商" disabled={!enabled} value={provider} onChange={e => setProvider(e.target.value as SecurityQuery['provider'])}><option value="longbridge">Longbridge</option><option value="massive">Massive（美股）</option></select></label>
      <label>证券数据模式<select aria-label="证券数据模式" disabled={!enabled} value={mode} onChange={e => setMode(e.target.value as SecurityQuery['mode'])}><option value="simulated">模拟数据</option><option value="real">真实数据</option></select></label>
      <button disabled={!enabled || busy} onClick={() => { void load(query, key, true); }}>{busy ? '读取中…' : mode === 'real' ? '查询当前视图真实数据' : '刷新模拟数据'}</button>
      <details className="security-guidance"><summary>数据说明</summary><p className="security-note">默认模拟；真实模式仅显式查询。概览组合已有报价、所选周期K线、财报和新闻，逐项保留来源与失败状态。合成分钟样例不代表交易日历。</p></details>
    </div>
      <div className="security-content">
        {state && !state.active_symbol && <StateNotice kind="empty">没有选中的证券 · —。请在自选区域添加证券。</StateNotice>}
        {view !== 'overview' || !page ? securityNavigation : null}
        {view === 'kline' ? <ChartPeriodBar period={period} onChange={setPeriod} /> : null}
        {view === 'financials' ? <div className="security-toolbar"><label>报表类型<select aria-label="报表类型" value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="ALL">全部</option><option value="IS">利润表</option><option value="BS">资产负债表</option><option value="CF">现金流量表</option></select></label><label>报表周期<select aria-label="报表周期" value={report} onChange={e => setReport(e.target.value as typeof report)}><option value="annual">年度</option><option value="interim">半年度</option><option value="quarter">季度</option></select></label></div> : null}
        {view === 'watchlist' ? <div className="security-toolbar"><span>本页最多查询4只，每只来源独立。</span><button disabled={offset === 0 || busy} onClick={() => setOffset(Math.max(0, offset - 4))}>上一组自选</button><button disabled={offset + 4 >= (state?.entries.length ?? 0) || busy} onClick={() => setOffset(offset + 4)}>下一组自选</button></div> : null}
        <p className="security-view-state" data-testid="security-view-state">{views[view]} · {provider === 'longbridge' ? 'Longbridge' : 'Massive'} · {mode === 'simulated' ? '模拟数据' : '真实模式'} · {busy ? '读取中' : page ? `${view === 'overview' ? '基础资料：' : ''}${states[page.status]}` : mode === 'real' ? '等待显式查询' : '等待数据'}{cached?.blocks.some(b => b.status === 'ready') && <span className="snapshot-notice"> · 上次查询快照（非实时）</span>}</p>
        {error || snapshotError ? <StateNotice kind="error">{error || snapshotError}</StateNotice> : null}
        {page ? <div data-testid="security-view" data-view={page.view} data-status={page.status}>
          {view === 'overview' ? <SecurityOverview page={page} data={Object.fromEntries((['quote','kline','financials','news'] as const).map(view => [view, { page: snapshots.get(snapshots.key({ ...query, view }, watchlist)), error: snapshots.error(snapshots.key({ ...query, view }, watchlist)) }]))} period={period} onPeriodChange={setPeriod} allowReal={true} navigation={securityNavigation} /> : view === 'quote' ? <QuoteView page={page} /> : view === 'kline' ? <ChartView page={page} period={period} /> : view === 'financials' ? <FinancialsView page={page} /> : view === 'news' ? <NewsView key={key} page={page} /> : view === 'status' ? <MarketStatusView page={page} /> : <WatchlistView page={page} onSelect={symbol => mutate(() => window.researchTrail!.selectSecurity(symbol))} />}
          {page.blocks.length === 0 ? <p>没有可查询的证券 · —</p> : null}
        </div> : null}
      </div>
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
  </section>;
}
