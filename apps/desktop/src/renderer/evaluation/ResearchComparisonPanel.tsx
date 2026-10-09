import { useEffect, useRef, useState } from 'react';
import type { ResearchComparisonView, ResearchQualityInput, ResearchRubric } from '../../evaluation-types';
import type { ResearchSummary } from '../../research-types';

const names:Record<string,string>={not_run:'未执行',running:'运行中',cancelled:'取消',run_error:'运行错误',completed:'报告生成完成',not_reviewed:'未人工评审',invalid:'无效',passed:'质量通过',quality_failed:'质量不达标'};
const percent=(n:number|null|undefined)=>n==null?'无评分':`${(n*100).toFixed(1)}%`;

export function ResearchComparisonPanel({available}:{available:boolean}) {
  const [runs,setRuns]=useState<ResearchSummary[]>([]),[history,setHistory]=useState<ResearchComparisonView[]>([]);
  const [current,setCurrent]=useState<ResearchComparisonView>(),[rubric,setRubric]=useState<ResearchRubric>();
  const [runId,setRunId]=useState(''),[first,setFirst]=useState(''),[second,setSecond]=useState('');
  const [mode,setMode]=useState<'offline'|'real'>('offline'),[consent,setConsent]=useState(false);
  const [reasoning,setReasoning]=useState<'default'|'low'|'medium'|'high'>('default');
  const [candidate,setCandidate]=useState(0),[ratings,setRatings]=useState<ResearchQualityInput['ratings']>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),working=useRef(false),ticket=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;ticket.current++;};},[]);
  async function refresh(){
    const bridge=window.researchTrail!;
    const [r,h,q]=await Promise.all([bridge.researchRuns(),bridge.researchComparisons(),bridge.researchQualityRubric()]);
    if(alive.current){setRuns(r.filter(x=>x.succeeded>0&&x.status!=='fetching'));setHistory(h);setRubric(q);}
  }
  useEffect(()=>{if(available)void refresh().catch(e=>{if(alive.current)setError(e.message);});},[available]);
  async function act(task:()=>Promise<void>){
    if(working.current||!available)return;working.current=true;setBusy(true);setError('');
    try{await task();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'研究对比操作失败');}
    finally{working.current=false;if(alive.current)setBusy(false);}
  }
  function select(view:ResearchComparisonView){ticket.current++;setCurrent(view);setCandidate(0);setRatings({});}
  useEffect(()=>{
    if(!available||current?.status!=='running')return;
    let active=true,polling=false;const id=current.id,generation=ticket.current;
    async function poll(){
      if(polling)return;polling=true;
      try{const v=await window.researchTrail!.researchComparison(id);
        if(active&&generation===ticket.current){setCurrent(v);if(v.status!=='running')await refresh();}
      }catch(e){if(active)setError(e instanceof Error?e.message:'读取实验失败');}finally{polling=false;}
    }
    const timer=setInterval(()=>void poll(),700);void poll();return()=>{active=false;clearInterval(timer);};
  },[available,current?.id,current?.status]);
  const locked=busy||!available;
  const selected=current?.candidates[candidate];
  function update(key:string,part:Partial<ResearchQualityInput['ratings'][string]>){
    setRatings(r=>({...r,[key]:{...r[key],...part}}));
  }
  return <section data-testid="research-comparison-panel">
    <h3>研究质量与模型 A/B</h3><p>冻结同一份采集事实，分别合成报告。离线模式使用固定合成器，模型名称只作为对比标签；真实模式使用当前模型连接的同一服务与凭证，替换模型 ID，每个模型只请求一次。不会更改你的默认模型。</p>
    <p>创建与读取不调用模型；只有显式启动才执行。重启不会补跑。未评审不产生质量分数，比较结果不表示投资收益。</p>
    {error&&<p role="alert">{error}</p>}
    <label>研究对比来源<select aria-label="研究对比来源" disabled={locked} value={runId} onChange={e=>setRunId(e.target.value)}><option value="">选择已采集研究</option>{runs.map(r=><option key={r.id} value={r.id}>{r.symbol} · {r.strategy} · {r.mode} · {r.started_at}</option>)}</select></label>
    <label>对比执行模式<select aria-label="对比执行模式" disabled={locked} value={mode} onChange={e=>{setMode(e.target.value as typeof mode);setConsent(false);}}><option value="offline">确定性离线演示</option><option value="real">真实模型（可能收费）</option></select></label>
    <label>模型 A ID<input aria-label="模型 A ID" disabled={locked} maxLength={80} value={first} onChange={e=>setFirst(e.target.value)}/></label>
    <label>模型 B ID<input aria-label="模型 B ID" disabled={locked} maxLength={80} value={second} onChange={e=>setSecond(e.target.value)}/></label>
    {mode==='real'&&<label>实验思考强度<select aria-label="实验思考强度" disabled={locked} value={reasoning} onChange={e=>setReasoning(e.target.value as typeof reasoning)}><option value="default">当前连接默认</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select>仅影响此实验，服务是否支持需实际验证。</label>}
    {mode==='real'&&<label><input type="checkbox" disabled={locked} checked={consent} onChange={e=>setConsent(e.target.checked)}/>同意向已配置模型服务发送此研究数据及承担两次请求费用</label>}
    <button disabled={locked||!runId||!first||!second||first===second||(mode==='real'&&!consent)} onClick={()=>void act(async()=>{
      const v=await window.researchTrail!.createResearchComparison({request_id:crypto.randomUUID(),run_id:runId,mode,models:[first,second],consent,reasoning_effort:reasoning});
      if(alive.current)select(v);await refresh();
    })}>保存研究对比实验</button>
    <button disabled={locked} onClick={()=>void act(refresh)}>刷新研究对比记录</button>
    <div>{history.map(v=><button key={v.id} disabled={locked} onClick={()=>void act(async()=>{const read=await window.researchTrail!.researchComparison(v.id);if(alive.current)select(read);})}>{v.input.models.join(' / ')} · {v.input.mode} · {names[v.status]}</button>)}</div>
    {current&&<article data-testid="research-comparison" data-status={current.status}>
      <p>{current.label}</p><p>{names[current.status]} · {current.source_mode} · 来源 SHA256 {current.source_hash}<br/>实验 {current.id} · {current.rubric_version}</p>
      <p>请求思考强度：{current.input.reasoning_effort??'default'}</p>
      <button disabled={locked||current.status!=='not_run'} onClick={()=>void act(async()=>{const v=await window.researchTrail!.startResearchComparison(current.id);if(alive.current)setCurrent(v);})}>启动研究对比</button>
      <button disabled={locked||!['not_run','running'].includes(current.status)} onClick={()=>void act(async()=>{const v=await window.researchTrail!.cancelResearchComparison(current.id);if(alive.current)setCurrent(v);await refresh();})}>取消研究对比</button>
      <p>人工质量：{names[current.quality_status]} · B−A：{current.quality_delta==null?'尚无有效比较':(current.quality_delta*100).toFixed(1)+' 个百分点'}</p>
      {current.candidates.map((c,index)=><details key={c.model} open data-testid="research-candidate"><summary>{index===0?'A':'B'} · {c.model} · {names[c.status]}</summary><p>请求 {c.requests_started} · {c.failure_stage} · {c.code} {c.request_uncertain&&'请求可能已发出，未确认完成'}</p>
        <p>工程检查：{c.engineering_checks?.join('，')||'尚无通过记录'}；不等于人工质量验收。</p>
        {c.response_diagnostics&&<p>响应终止原因：{String(c.response_diagnostics.finish_reason)} · 正文：{c.response_diagnostics.content_present?'存在':'缺失'}</p>}
        {c.document&&<><p>{c.document.disclaimer}</p><p>立场 {c.document.synthesis.stance} · 概率 {c.document.synthesis.forecast?percent(c.document.synthesis.forecast.probability)+' / '+c.document.synthesis.forecast.horizon:'未提供'}</p><pre>{JSON.stringify(c.document,null,2)}</pre></>}
        <p>人工评审版本 {c.reviews?.length??0} · {percent(c.reviews?.at(-1)?.score)}</p><details><summary>评审历史</summary><pre>{JSON.stringify(c.reviews,null,2)}</pre></details>
      </details>)}
      {current.status==='completed'&&rubric&&<section><h4>人工研究质量量表</h4><p>{rubric.scale}</p>
        <label>评审候选<select aria-label="评审候选" disabled={locked} value={candidate} onChange={e=>{setCandidate(Number(e.target.value));setRatings({});}}><option value={0}>A</option><option value={1}>B</option></select></label>
        {Object.entries(rubric.dimensions).map(([key,label])=><fieldset key={key}><legend>{label}</legend>
          <label>评分 {key}<select aria-label={`评分 ${key}`} disabled={locked} value={ratings[key]?.score??''} onChange={e=>update(key,{score:Number(e.target.value)})}><option value="">未评审</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
          <label>理由 {key}<textarea aria-label={`理由 ${key}`} disabled={locked} minLength={10} maxLength={600} value={ratings[key]?.reason??''} onChange={e=>update(key,{reason:e.target.value})}/></label>
          <label>证据 {key}<select aria-label={`证据 ${key}`} disabled={locked} value={ratings[key]?.evidence_ids?.[0]??''} onChange={e=>update(key,{evidence_ids:e.target.value?[e.target.value]:[]})}><option value="">选择依据</option>{selected?.document?.evidence.map(f=><option key={f.id} value={f.id}>{f.capability}{f.pointer} = {JSON.stringify(f.value)}</option>)}</select></label>
        </fieldset>)}
        <button disabled={locked||Object.keys(rubric.dimensions).some(k=>!ratings[k]?.score||(ratings[k]?.reason?.trim().length??0)<10||!ratings[k]?.evidence_ids?.length)} onClick={()=>void act(async()=>{const v=await window.researchTrail!.reviewResearchComparison(current.id,{request_id:crypto.randomUUID(),candidate,expected_version:selected?.reviews?.length??0,ratings});if(alive.current){setCurrent(v);setRatings({});}await refresh();})}>追加完整人工评审版本</button>
      </section>}
    </article>}
  </section>;
}
