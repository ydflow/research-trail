import { useEffect, useRef, useState } from 'react';
import type { MarketId, MarketOverviewResult, OverviewRow } from '../../market-overview-types';
import type { ProviderProfile } from '../../provider-types';
import { StateNotice } from '../ui/Primitives';
import { MarketHeatmap } from './MarketHeatmap';
import { MARKET_NAMES, number, percent, supportedSecurity, unit, utc, visibleRows } from './overview-display';
import './market-overview.css';

export function MarketOverview({ available, onOpenSecurity }: { available: boolean; onOpenSecurity?: (symbol: string) => Promise<void> }) {
  const [market, setMarket] = useState<MarketId>('CN');
  const [mode, setMode] = useState<'simulated' | 'real'>('simulated');
  const [search, setSearch] = useState(''), [group, setGroup] = useState('all'), [sort, setSort] = useState('desc');
  const [revision, setRevision] = useState(0), [selection, setSelection] = useState<string>();
  const [response, setResponse] = useState<{ key: string; data: MarketOverviewResult }>();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [opening, setOpening] = useState(false);
  const [profiles, setProfiles] = useState<ProviderProfile[]>();
  const generation = useRef(0), pending = useRef<string | undefined>(undefined);
  const key = JSON.stringify([market, mode, revision, available]);
  const currentKey = useRef(key); currentKey.current = key;
  const result = available && response?.key === key ? response.data : undefined;
  const data = result?.ok ? result : undefined;
  const rows = visibleRows(data?.rows ?? [], search, group, sort);
  const selected = rows.find(row => row.asset.id === selection) ?? rows[0];
  const groups = [...new Set(data?.rows.flatMap(row => row.classification ? [row.classification] : []) ?? [])];

  useEffect(() => {
    const bridge = window.researchTrail;
    let active = true;
    const id = ++generation.current;
    setBusy(false); setError(''); setResponse(undefined);
    if (!available || !bridge) return;
    const requestId = crypto.randomUUID(); pending.current = requestId;
    setBusy(true);
    void bridge.marketOverview({ request_id: requestId, market, mode }).then(next => {
      if (!active || id !== generation.current || currentKey.current !== key) return;
      if (next.request_id !== requestId || next.market !== market || next.mode !== mode || next.ok && next.source !== 'authored-market-v1') throw new Error('总览响应上下文不一致');
      setResponse({ key, data: next });
    }).catch(() => { if (active && id === generation.current && currentKey.current === key) setError('总览通信失败，请检查本地连接后重试。'); })
      .finally(() => { if (active && id === generation.current) { pending.current = undefined; setBusy(false); } });
    return () => {
      active = false; generation.current++;
      if (pending.current === requestId) pending.current = undefined;
      void bridge.cancelMarketOverview(requestId).catch(() => {});
    };
    // key includes all request inputs; search/sort never cause another read.
  }, [key, available, market, mode]);

  useEffect(() => {
    let active = true; setProfiles(undefined);
    if (available && mode === 'real' && window.researchTrail) void window.researchTrail.providerProfiles()
      .then(next => { if (active) setProfiles(next); }).catch(() => {});
    return () => { active = false; };
  }, [available, mode]);

  function chooseMarket(next: MarketId) { setMarket(next); setSearch(''); setGroup('all'); setSelection(undefined); }
  function cancelRead() {
    const requestId = pending.current;
    if (!requestId || !window.researchTrail) return;
    const id = ++generation.current; pending.current = undefined; setBusy(false);
    setResponse({ key, data: { ok: false, request_id: requestId, market, mode, status: 'cancelled', code: 'CANCELLED', message: '本次总览读取已取消。', retryable: false } });
    void window.researchTrail.cancelMarketOverview(requestId).catch(() => { if (id === generation.current && currentKey.current === key) setError('取消请求未送达；本页已丢弃该次响应。'); });
  }
  async function open(row: OverviewRow) {
    const symbol = supportedSecurity(row);
    if (!symbol || !onOpenSecurity) return;
    const context = key; setOpening(true); setError('');
    try { await onOpenSecurity(symbol); }
    catch { if (currentKey.current === context) setError('无法打开证券工作台，请检查本地连接。'); }
    finally { if (currentKey.current === context) setOpening(false); }
  }

  return <section className="market-overview" aria-label="多市场总览" data-market={market} data-mode={mode} data-status={busy ? 'loading' : result?.status ?? 'unavailable'}>
    <div className="overview-toolbar">
      <nav className="overview-markets" aria-label="市场切换">{(['CN','US','CRYPTO'] as const).map(id => <button key={id} aria-pressed={market === id} onClick={() => chooseMarket(id)}>{MARKET_NAMES[id]}<small>{id === 'CN' ? '沪深市场' : id === 'US' ? 'US Market' : 'Crypto Pairs'}</small></button>)}</nav>
      <label className="overview-search"><span>搜索代码 / 名称</span><input aria-label="总览搜索" placeholder={market === 'CRYPTO' ? 'BTC/USDT、Ethereum' : '股票代码或名称'} value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label>数据模式<select aria-label="总览数据模式" value={mode} onChange={e => { setMode(e.target.value as typeof mode); setSelection(undefined); }}><option value="simulated">模拟数据</option><option value="real">真实模式（尚未开放）</option></select></label>
    </div>
    <div className="overview-source-line"><span className={mode === 'simulated' ? 'mock-badge' : 'real-badge'}>{mode === 'simulated' ? '模拟数据 · 自主离线样例' : '真实总览 · 零外部请求'}</span><span>来源：{data?.source ?? (mode === 'real' ? '尚未接入' : '自主样例')}</span><button className="secondary" disabled={!available || busy} onClick={() => setRevision(value => value+1)}>刷新总览</button>{busy && <button className="secondary" onClick={cancelRead}>取消读取</button>}</div>
    <p className="overview-note">仅展示有限样例池，不代表完整市场覆盖、真实历史或实时行情。{market === 'CRYPTO' ? '交易对以 USDT 计价，USDT 不等同 USD；涨跌采用滚动24小时基准。' : '涨跌幅按前收计算；不生成市场指数或行业归属。'}</p>
    {!available ? <StateNotice kind="info">等待后端连接后读取总览。</StateNotice> : busy ? <StateNotice kind="loading">正在读取{MARKET_NAMES[market]}样例池…</StateNotice> : null}
    {error && <StateNotice kind="error">{error}</StateNotice>}
    {result && !result.ok && <StateNotice kind="warning"><strong>{result.message}</strong> · {result.code} <span>真实失败不会自动回退模拟行情。</span></StateNotice>}
    {mode === 'real' && <section className="overview-provider-status" aria-label="总览数据源状态"><strong>数据源能力与配置</strong><p>{market === 'CRYPTO' ? '正式加密 Provider 尚未接入；暂无详情能力。' : 'Longbridge 可尝试单股查询；Massive 仅美股。现有系统没有真实批量总览能力；配置存在不代表本市场已授权。'}</p>{profiles?.filter(p => market !== 'CRYPTO' && (p.provider === 'longbridge' || market === 'US' && p.provider === 'massive')).map(p => <span key={p.provider}>{p.provider}：{p.configured ? '已配置' : '未配置'} / {p.credential_present ? '凭证已保存' : '未保存凭证'} / {p.enabled ? '启用' : '停用'} · 本市场权限未验证</span>)}</section>}
    {data && <>
      <div className="overview-stats" data-testid="overview-summary">
        <div><span>样例池标的</span><strong>{data.summary.total}<small> 个</small></strong></div>
        <div><span>样例等权平均涨跌</span><strong className={data.summary.average_change_percent === null ? '' : data.summary.average_change_percent >= 0 ? 'positive' : 'negative'}>{percent(data.summary.average_change_percent)}</strong></div>
        <div><span>上涨 / 下跌 / 平盘</span><strong><i className="positive">{data.summary.advancing}</i> / <i className="negative">{data.summary.declining}</i> / {data.summary.unchanged}</strong></div>
        <div><span>缺失涨跌依据</span><strong>{data.summary.missing}<small> 个</small></strong></div>
      </div>
      <div className="overview-distribution" aria-label="样例池涨跌分布">{[['上涨',data.summary.advancing,'gain'],['下跌',data.summary.declining,'loss'],['平盘',data.summary.unchanged,'flat'],['缺失',data.summary.missing,'missing']].map(([label,count,tone]) => <span key={label} className={`distribution-${tone}`} style={{ flexGrow: Number(count) }} hidden={!count}>{label} {count}</span>)}</div>
      <div className="overview-filter-line"><h3>{MARKET_NAMES[market]} · 样例行情</h3><label>分组<select aria-label="总览分组" value={group} onChange={e => setGroup(e.target.value)}><option value="all">全部分组</option>{groups.map(name => <option key={name}>{name}</option>)}<option value="unclassified">未分类</option></select></label><label>排序<select aria-label="总览排序" value={sort} onChange={e => setSort(e.target.value)}><option value="desc">涨跌幅降序</option><option value="asc">涨跌幅升序</option><option value="symbol">代码顺序</option></select></label><span>匹配 {rows.length} / {data.rows.length}</span></div>
      {!rows.length ? <StateNotice kind="empty">{data.rows.length ? '没有匹配的标的，调整搜索或分组。' : '样例池暂无数据。'}</StateNotice> : <>
        <MarketHeatmap rows={rows} selectedId={selected?.asset.id} onSelect={setSelection} />
        <section className="overview-list" aria-label="总览标的列表"><div className="overview-section-heading"><h3>标的列表</h3><span>{market === 'CRYPTO' ? '涨跌基准：滚动24h' : '涨跌基准：前收'} · {market === 'CN' ? 'CNY' : market === 'US' ? 'USD' : 'USDT'}</span></div><div className="overview-table-scroll"><table><thead><tr>{['代码 / 名称','最新价','涨跌幅','涨跌额','成交量','成交额','市场 / 分组'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.asset.id} data-testid="overview-row" data-symbol={row.asset.symbol} aria-selected={selected?.asset.id === row.asset.id}><td><button onClick={() => setSelection(row.asset.id)}><strong>{row.asset.symbol}</strong><small>{row.asset.name}</small></button></td><td>{number(row.last_price,6)}<small>{unit(row)}</small></td><td className={row.change_percent === null ? '' : row.change_percent >= 0 ? 'positive' : 'negative'}>{percent(row.change_percent)}</td><td>{number(row.change,6)}</td><td>{number(row.volume,2)}<small>{row.volume_unit === 'shares' ? '股' : row.volume_unit}</small></td><td>{number(row.turnover,2)}<small>{row.turnover_unit}</small></td><td>{MARKET_NAMES[row.asset.market]}<small>{row.classification ?? '未分类'}</small></td></tr>)}</tbody></table></div></section>
        {selected && <section className="overview-detail" aria-label="选中标的详情"><div><h3>{selected.asset.symbol} · {selected.asset.name}</h3><strong>{number(selected.last_price,6)} {unit(selected)}</strong><span>{percent(selected.change_percent)} · {selected.change_basis === 'rolling_24h' ? '滚动24h' : '较前收'}</span></div><p>市值：— · 分类：{selected.classification ?? '未分类'} · {selected.asset.asset_class === 'crypto_pair' ? '自主样例交易对；尚无详情页' : supportedSecurity(selected) ? '已有证券详情能力' : '证券详情尚未支持'}</p>{selected.window_start && selected.window_end && <p>涨跌窗口：{utc(selected.window_start)} → {utc(selected.window_end)}</p>}<p>市场时间：{utc(selected.market_time)} · {data.timezone}</p>{supportedSecurity(selected) && <button disabled={opening || !onOpenSecurity} onClick={() => void open(selected)}>打开证券工作台 {selected.asset.symbol}</button>}</section>}
      </>}
      <p className="overview-times" data-testid="overview-times">来源 {data.source} / {data.fixture_version} · 固定样例生成时间 {utc(data.fetched_at)}<br />本机服务时间 {utc(data.served_at)} · {data.cache_hit ? `本机缓存命中（${number(data.cache_age_seconds,1)} 秒）` : '本机样例读取'} · 时效：固定模拟样例，非实时行情</p>
    </>}
  </section>;
}
