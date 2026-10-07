// Fixed Folio ba5dcdfd DiscoverView interaction reference; Python owns all rules and runs.
import { useEffect, useRef, useState } from 'react';
import type { ScreeningContext, ScreeningEvidence, ScreeningRun, ScreeningSummary, ScreeningTask } from '../../screening-types';
import './discover.css';

type Target = { symbols: string[]; mode: 'simulated' | 'real'; provider: 'longbridge' | 'massive' };
const labels = { fetching:'正在采集', completed:'筛选完成', partial:'部分失败或缺失', failed:'无法完成筛选', cancelled:'已取消', interrupted:'应用中断' };
export function DiscoverPanel({ available,onCompare,onResearch }: { available:boolean; onCompare:(target:Target)=>void; onResearch:(target:Target)=>void }) {
  const [mode,setMode]=useState<'simulated'|'real'>('simulated'), [provider,setProvider]=useState<'longbridge'|'massive'>('longbridge');
  const [strategy,setStrategy]=useState<ScreeningTask['id']>('top-gainers');
  const [pool,setPool]=useState(''), [tasks,setTasks]=useState<ScreeningTask[]>([]), [history,setHistory]=useState<ScreeningSummary[]>([]);
  const [run,setRun]=useState<ScreeningRun>(), [original,setOriginal]=useState<ScreeningEvidence>();
  const [error,setError]=useState(''), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const generation=useRef(0), evidenceGeneration=useRef(0), actionBusy=useRef(false);
  const current=tasks.find(t=>t.id===strategy), blocked=current?.capabilities.some(c=>!c.available) ?? true;
  const running=run?.status==='fetching';
  useEffect(()=>{
    let live=true; ++generation.current; ++evidenceGeneration.current;
    setTasks([]); setRun(undefined); setOriginal(undefined); setError(''); setMessage(''); setBusy(false); actionBusy.current=false;
    if(available) void Promise.all([window.researchTrail!.screeningTasks({mode,provider}),window.researchTrail!.screeningRuns()])
      .then(([catalog,rows])=>{if(live){setTasks(catalog);setHistory(rows);}})
      .catch(e=>{if(live)setError((e as Error).message);});
    return()=>{live=false; ++generation.current; ++evidenceGeneration.current;};
  },[available,mode,provider]);
  useEffect(()=>{
    let live=true; let timer:ReturnType<typeof setTimeout>;
    if(run?.status==='fetching') {
      const id=run.id, ticket=generation.current;
      const poll=async()=>{
        try {const next=await window.researchTrail!.screeningRun(id); if(!live||ticket!==generation.current)return; setRun(next);
          if(next.status==='fetching')timer=setTimeout(()=>void poll(),200);
          else {const rows=await window.researchTrail!.screeningRuns();if(live&&ticket===generation.current)setHistory(rows);}
        }catch(e){if(live&&ticket===generation.current){setError((e as Error).message);timer=setTimeout(()=>void poll(),1000);}}
      };
      timer=setTimeout(()=>void poll(),100);
    }
    return()=>{live=false;clearTimeout(timer);};
  },[run?.id,run?.status]);

  function clearResult(){++generation.current;++evidenceGeneration.current;setRun(undefined);setOriginal(undefined);setError('');setMessage('');}
  async function start(){
    if(actionBusy.current||blocked||!available)return;
    actionBusy.current=true; setBusy(true);const ticket=++generation.current;++evidenceGeneration.current;setOriginal(undefined);setError('');setMessage('');
    try {
      const universe=pool.trim()?pool.trim().split(/[\s,，]+/).map(s=>s.toUpperCase()):undefined;
      const next=await window.researchTrail!.startScreening({strategy,mode,provider,limit:20,request_id:crypto.randomUUID(),...(universe?{universe}:{})});
      if(ticket===generation.current)setRun(next);
    }catch(e){if(ticket===generation.current)setError((e as Error).message);}
    finally{if(ticket===generation.current){setBusy(false);actionBusy.current=false;}}
  }
  async function open(id:string){
    if(actionBusy.current)return; actionBusy.current=true;setBusy(true); const ticket=++generation.current; ++evidenceGeneration.current;setOriginal(undefined);setError('');setMessage('');
    try {const next=await window.researchTrail!.screeningRun(id);if(ticket===generation.current)setRun(next);}
    catch(e){if(ticket===generation.current){setRun(undefined);setError((e as Error).message);}}
    finally{if(ticket===generation.current){actionBusy.current=false;setBusy(false);}}
  }
  async function evidence(readId:string){
    if(!run)return; const id=run.id, ticket=++evidenceGeneration.current;setOriginal(undefined);
    try{const next=await window.researchTrail!.screeningEvidence(id,readId);if(ticket===evidenceGeneration.current)setOriginal(next);}
    catch(e){if(ticket===evidenceGeneration.current)setError((e as Error).message);}
  }
  async function watch(symbol:string){
    if(actionBusy.current)return;actionBusy.current=true;const ticket=generation.current;
    try{await window.researchTrail!.addWatch(symbol);if(ticket===generation.current)setMessage('已加入自选：'+symbol);}
    catch(e){if(ticket===generation.current)setError((e as Error).message);}
    finally{actionBusy.current=false;}
  }
  function target(symbol:string):Target{return {symbols:[symbol],mode:run!.input.mode,provider:run!.input.provider};}
  const context:ScreeningContext={mode,provider};
  return <section className="discover-panel" aria-label="机会发现工作台">
    <h2>机会发现</h2><p>17个固定任务 · Python确定性筛选 · 仅扫描所选股票池（最多40只） · LLM未参与筛选或评分。</p>
    <div className="discover-controls">
      <label>筛选任务<select aria-label="筛选任务" value={strategy} disabled={!available||busy||running} onChange={e=>{setStrategy(e.target.value as typeof strategy);clearResult();}}>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <label>筛选数据模式<select aria-label="筛选数据模式" value={context.mode} disabled={busy||running} onChange={e=>setMode(e.target.value as typeof mode)}><option value="simulated">模拟（默认）</option><option value="real">真实 · 只读</option></select></label>
      <label>筛选提供商<select aria-label="筛选提供商" value={context.provider} disabled={busy||running} onChange={e=>setProvider(e.target.value as typeof provider)}><option value="longbridge">Longbridge</option><option value="massive">Massive</option></select></label>
      <label>有界股票池（空白使用本地自选，空自选使用四只示例）<textarea maxLength={450} value={pool} disabled={busy||running} onChange={e=>{setPool(e.target.value);clearResult();}} placeholder="AAPL.US MSFT.US NVDA.US"/></label>
    </div>
    {current&&<div data-testid="screening-rule"><p>{current.rule}</p><p>评分：{current.score_rule}</p>{current.capabilities.map(c=><p key={c.id}>{c.id} · {c.available?'可调用':'不可用'} · {c.code}</p>)}</div>}
    <button disabled={!available||blocked||busy||running} onClick={()=>void start()}>开始筛选</button>
    {blocked&&<p role="status">必要能力不可用，不能产生候选。请到数据页检查配置、凭证及能力状态。</p>}
    {running&&<button className="secondary" onClick={()=>void window.researchTrail!.cancelScreening(run!.id).catch(e=>setError((e as Error).message))}>取消筛选</button>}
    {error&&<p role="alert" className="market-error">{error}</p>}{message&&<p role="status">{message}</p>}
    <details><summary>已保存筛选记录（最多显示100条）</summary>{history.map(r=><p key={r.id}><button disabled={busy||running} onClick={()=>void open(r.id)}>读取筛选 {r.id}</button> {r.strategy} · {labels[r.status]} · {r.candidate_count}个候选</p>)}</details>
    {run&&<div data-testid="screening-run" data-status={run.status}>
      <h3>{run.task.title} · {labels[run.status]}</h3><p>{run.label}</p>
      <p>已保存规则：{run.task.rule}<br/>评分：{run.task.score_rule}</p>
      <p>本次 {run.input.mode==='simulated'?'模拟数据':'真实只读数据'} · {run.input.provider} · 股票池来源 {run.universe_source} · {run.universe.join(' ')}<br/>参考时间 {run.reference_time} · 每项超时 {run.timeout_seconds}秒 · 并发 {run.concurrency}</p>
      <p>完成读取 {run.reads.filter(r=>r.status==='completed').length} / {run.reads.length} · 候选 {run.candidate_count}</p>
      {!(run.candidates??[]).length&&run.status!=='fetching'&&<p>没有候选。请查看未满足规则、缺失数据或失败原因。</p>}
      {(run.candidates??[]).map(c=><article className="discover-candidate" key={c.symbol} data-testid="screening-candidate" data-symbol={c.symbol}>
        <h4>{c.symbol} · {c.name} · 分数 {c.score??'—（二元规则）'}</h4>
        <ul>{(c.reasons??[]).map((reason,i)=><li key={i}>{reason}</li>)}</ul>
        {(c.metrics??[]).map((m,i)=><details key={i}><summary>{m.name} · 指标来源</summary><p>{m.value} {m.unit} · {m.formula}</p>{m.inputs.map((ref,j)=><p key={j}><button onClick={()=>void evidence(ref.read_id)}>查看指标原始事实</button> {ref.read_id} {ref.pointer}</p>)}</details>)}
        <div className="discover-actions"><button onClick={()=>void watch(c.symbol)}>加入自选 {c.symbol}</button><button onClick={()=>onCompare(target(c.symbol))}>加入对比 {c.symbol}</button><button onClick={()=>onResearch(target(c.symbol))}>发起研究 {c.symbol}</button></div>
      </article>)}
      <details><summary>全部股票的筛选结论和缺口</summary>{(run.decisions??[]).map(d=><p key={d.symbol}>{d.symbol} · {d.status} · {d.code??(d.reasons??[]).join('；')}</p>)}</details>
      <details><summary>实际能力执行记录</summary>{run.reads.map(r=><p key={r.id}>{r.symbol} · {r.query.capability} · {r.status} · {r.code??'—'} <button disabled={!r.result_hash} onClick={()=>void evidence(r.id)}>查看筛选执行事实</button></p>)}</details>
    </div>}
    {original&&<aside data-testid="screening-original"><h3>原始执行事实</h3><p>来源关联只说明使用了这些数据，不证明投资判断正确。</p><pre>{JSON.stringify(original,null,2)}</pre></aside>}
  </section>;
}
