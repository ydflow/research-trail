import { useEffect, useRef, useState } from 'react';
import type { RiskReport, Comparison } from '../../analytics-types';
import type { PortfolioInfo } from '../../portfolio-types';
import Results from './Results';

export function AnalyticsPanel({ available, initialSymbols, initialMode, initialProvider }: { available: boolean; initialSymbols?: string; initialMode?: 'simulated'|'real'; initialProvider?: 'longbridge'|'massive' }) {
  const [tab,setTab]=useState<'risk'|'compare'>(initialSymbols?'compare':'risk');
  const [portfolios,setPortfolios]=useState<PortfolioInfo[]>([]);
  const [selected,setSelected]=useState('');
  const [provider,setProvider]=useState<'longbridge'|'massive'>(initialProvider??'longbridge');
  const [mode,setMode]=useState<'simulated'|'real'>(initialMode??'simulated');
  const [symbols,setSymbols]=useState(initialSymbols??'AAPL.US MSFT.US');
  const [currency,setCurrency]=useState('USD'); const [year,setYear]=useState(2023);
  const [result,setResult]=useState<RiskReport|Comparison>();
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  useEffect(() => {
    let live=true;
    if (available) void window.researchTrail!.portfolioList().then(rows => { if(live){ setPortfolios(rows); setSelected(rows.find(p => p.kind==='simulated')?.id ?? rows[0]?.id ?? ''); } }).catch(() => { if(live) setError('无法读取组合，请检查本地服务。'); });
    return () => { live=false; };
  },[available]);
  useEffect(() => { generation.current++; setResult(undefined); setError(''); setBusy(false); return () => { generation.current++; }; },[available,tab,selected,provider,mode,symbols,currency,year]);
  async function analyze(refresh: boolean) {
    const token=++generation.current; setBusy(true); setError('');
    try {
      const common={provider,mode,refresh};
      const next=tab==='risk' ? await window.researchTrail!.portfolioRisk({...common,portfolio_id:selected}) : await window.researchTrail!.compareStocks({...common,symbols:symbols.trim().split(/[\s,，]+/),currency,report_year:year});
      if(token===generation.current) setResult(next);
    } catch(e){ if(token===generation.current) {setResult(undefined);setError((e as Error).message);} }
    finally {if(token===generation.current) setBusy(false);}
  }
  return <section className="analytics-panel" aria-label="风险与对比工作台">
    <h2>风险与对比</h2><p>Python确定性计算 · 不同币种分别计算 · 缺失值为— · 不由模型生成数值。</p>
    <nav className="view-tabs" aria-label="分析视图"><button aria-pressed={tab==='risk'} onClick={() => setTab('risk')}>组合风险</button><button aria-pressed={tab==='compare'} onClick={() => setTab('compare')}>股票对比</button></nav>
    <div className="analytics-controls">
      <label>分析提供商<select value={provider} disabled={!available} onChange={e => setProvider(e.target.value as typeof provider)}><option value="longbridge">Longbridge</option><option value="massive">Massive</option></select></label>
      <label>分析数据模式<select value={mode} disabled={!available} onChange={e => setMode(e.target.value as typeof mode)}><option value="simulated">模拟（默认）</option><option value="real">真实 · 只读查询</option></select></label>
      {tab==='risk' ? <label>风险组合<select value={selected} disabled={!available} onChange={e => setSelected(e.target.value)}>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name} · {p.kind}</option>)}</select></label> : <>
        <label>对比股票（2—4只，空格分隔）<input maxLength={60} value={symbols} onChange={e => setSymbols(e.target.value)} disabled={!available}/></label>
        <label>统一币种<input maxLength={3} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} disabled={!available}/></label>
        <label>年度报告年份<input type="number" min={1900} max={2100} value={year} onChange={e => setYear(Number(e.target.value))} disabled={!available}/></label>
      </>}
    </div>
    {tab==='risk' && selected && <p className="timestamp">组合ID {selected}<br />规则Agent输入：分析组合{selected}风险</p>}
    {mode==='real' && <p>仅主动分析才发送提供商查询。未配置、权限受限和失败会明确显示，不回退为模拟。</p>}
    <div className="analytics-actions"><button disabled={!available||busy||(tab==='risk'&&!selected)} onClick={() => void analyze(false)}>读取/分析</button><button className="secondary" disabled={!available||busy||(tab==='risk'&&!selected)} onClick={() => void analyze(true)}>重新计算快照</button></div>
    <p role="status">{busy ? '正在读取并计算…' : '相同输入复用最近30秒快照；主动重新计算产生新快照。'}</p>
    {error && <p role="alert" className="market-error">{error}</p>}
    {result && <Results report={result}/>}
  </section>;
}
