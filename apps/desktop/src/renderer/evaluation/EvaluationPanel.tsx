import { useEffect, useRef, useState } from 'react';
import type { EvaluationCase, ExperimentView, ExperimentSummary, ExperimentInput, BaselineSummary, FeedbackView } from '../../evaluation-types';
import { TracingPanel } from './TracingPanel';
import './evaluation.css';

export const statusLabels: Record<string,string> = {not_run:'未执行',running:'运行中',cancelled:'已取消',run_error:'运行错误',quality_failed:'质量不达标',passed:'通过'};
const profiles: [ExperimentInput['profile'],string][] = [['baseline','确定性规则基线'],['missing-disclosure','故意缺来源声明'],['wrong-fact','故意回答错误价格'],['missing-tool','故意不调用工具'],['provider-failure','故意使提供商失败']];
const scoreText=(score:number|null|undefined)=>score==null?'无有效分数':`${(score*100).toFixed(1)}%`;

export function EvaluationPanel({available}:{available:boolean}) {
  const [cases,setCases]=useState<EvaluationCase[]>([]),[selected,setSelected]=useState<string[]>([]);
  const [history,setHistory]=useState<ExperimentSummary[]>([]),[baselines,setBaselines]=useState<BaselineSummary[]>([]);
  const [current,setCurrent]=useState<ExperimentView>(),[feedback,setFeedback]=useState<FeedbackView[]>([]);
  const [name,setName]=useState('研迹离线实验'),[profile,setProfile]=useState<ExperimentInput['profile']>('baseline');
  const [baselineId,setBaselineId]=useState(''),[reason,setReason]=useState(''),[feedbackCase,setFeedbackCase]=useState('');
  const [judgment,setJudgment]=useState<'agree'|'disagree'|'needs-review'>('needs-review');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),working=useRef(false),selection=useRef(''),generation=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
  useEffect(()=>{
    if(!available || !window.researchTrail)return;
    let active=true;const bridge=window.researchTrail;
    void Promise.all([bridge.evaluationCases(),bridge.evaluationExperiments(),bridge.evaluationBaselines()]).then(([catalog,runs,bases])=>{
      if(active){setCases(catalog);setSelected(catalog.map(c=>c.id));setHistory(runs);setBaselines(bases);}
    }).catch(e=>{if(active)setError(String(e.message));});
    return()=>{active=false;};
  },[available]);
  async function refreshLists() {
    const bridge=window.researchTrail!;
    const [runs,bases]=await Promise.all([bridge.evaluationExperiments(),bridge.evaluationBaselines()]);
    if(alive.current){setHistory(runs);setBaselines(bases);}
  }
  async function load(id:string,base=baselineId) {
    selection.current=id;const ticket=++generation.current;const bridge=window.researchTrail!;
    const [view,notes]=await Promise.all([bridge.evaluationExperiment(id,base||undefined),bridge.evaluationFeedback(id)]);
    if(alive.current && ticket===generation.current){setCurrent(view);setFeedback(notes);setFeedbackCase(view.cases[0]?.id??'');}
  }
  async function act(task:()=>Promise<void>) {
    if(working.current || !available)return;
    working.current=true;setBusy(true);setError('');
    try{await task();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'评测操作失败。');}
    finally{working.current=false;if(alive.current)setBusy(false);}
  }
  useEffect(()=>{
    if(!available || current?.status!=='running')return;
    let active=true,polling=false;const id=current.id,bridge=window.researchTrail!;
    async function poll(){
      if(polling)return;polling=true;
      try{const next=await bridge.evaluationExperiment(id,baselineId||undefined);
        if(active && selection.current===id){setCurrent(next);if(next.status!=='running')await refreshLists();}
      }catch(e){if(active)setError(e instanceof Error?e.message:'读取评测失败。');}finally{polling=false;}
    }
    const timer=setInterval(()=>{void poll();},600);void poll();
    return()=>{active=false;clearInterval(timer);};
  },[available,current?.id,current?.status,baselineId]);
  const locked=busy||!available;
  return <section className="evaluation-panel" data-testid="evaluation-panel">
    <h2>评测中心</h2>
    <p>确定性离线工程评测 · 研迹自有案例 · 假模型与固定2024年示例 · 模型请求0。</p>
    <p>分数仅表示本套工具、证据和来源断言的通过率。未执行、取消或运行错误保留诊断，实验总分为空。</p>
    {error?<p role="alert">{error}</p>:null}
    <details open><summary>案例与实验</summary>
      <p>正常、错误、恢复和回归案例均由研迹新增；Folio仅作设计参考，没有复制上游案例或结果。</p>
      <div className="eval-cases">{cases.map(c=><label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} disabled={locked} onChange={e=>setSelected(old=>e.target.checked?[...old,c.id]:old.filter(id=>id!==c.id))}/><span>{c.title} · {c.category}<small>{c.id} · {c.origin} · v{c.version} · {c.purpose}</small></span></label>)}</div>
      <label>实验名称<input value={name} maxLength={80} disabled={locked} onChange={e=>setName(e.target.value)}/></label>
      <label>离线候选配置<select aria-label="离线候选配置" value={profile} disabled={locked} onChange={e=>setProfile(e.target.value as ExperimentInput['profile'])}>{profiles.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <button disabled={locked||!selected.length||!name.trim()} onClick={()=>void act(async()=>{const view=await window.researchTrail!.createExperiment({request_id:crypto.randomUUID(),name,case_ids:selected,profile});await load(view.id,'');setBaselineId('');await refreshLists();})}>创建未执行实验</button>
      <button disabled={locked} onClick={()=>void act(refreshLists)}>刷新实验列表</button>
    </details>
    <div className="eval-history" data-testid="eval-history">{history.map(h=><button disabled={locked} key={h.id} aria-pressed={current?.id===h.id} onClick={()=>void act(()=>load(h.id))}>{h.name} · {statusLabels[h.status]} · {scoreText(h.score)}</button>)}</div>
    {current?<article data-testid="eval-experiment" data-status={current.status}>
      <h3>{current.input.name} · {statusLabels[current.status]}</h3>
      <p data-testid="eval-score">{scoreText(current.score)} · 有效性：{current.validity} · 评估器{current.evaluator_version}</p>
      <p>案例来源：{JSON.stringify(current.origin_counts)}；状态计数：{JSON.stringify(current.counts)}；失败分类：{JSON.stringify(current.failure_counts)}</p>
      <button disabled={locked||current.status!=='not_run'} onClick={()=>void act(async()=>{const view=await window.researchTrail!.startExperiment(current.id);if(alive.current)setCurrent(view);await refreshLists();})}>执行离线实验</button>
      <button disabled={locked||!['running','not_run'].includes(current.status)} onClick={()=>void act(async()=>{const view=await window.researchTrail!.cancelExperiment(current.id);if(alive.current)setCurrent(view);await refreshLists();})}>取消实验</button>
      <button disabled={locked||current.status!=='passed'||current.validity!=='valid'} onClick={()=>void act(async()=>{const base=await window.researchTrail!.saveEvaluationBaseline({request_id:crypto.randomUUID(),name:current.input.name.slice(0,70)+' 基线',experiment_id:current.id});await refreshLists();setBaselineId(base.id);await load(current.id,base.id);})}>保存通过的基线</button>
      <label>比较基线<select aria-label="比较基线" value={baselineId} disabled={locked} onChange={e=>{const id=e.target.value;setBaselineId(id);void act(()=>load(current.id,id));}}><option value="">不比较</option>{baselines.map(b=><option key={b.id} value={b.id}>{b.name} · {scoreText(b.score)}</option>)}</select></label>
      {current.comparison?<p data-testid="eval-comparison">{current.comparison.reason}{current.comparison.comparable?` 分数变化 ${((current.comparison.delta??0)*100).toFixed(1)}个百分点；退化案例 ${current.comparison.regressed_cases.join(', ')||'无'}`:''}</p>:null}
      <div className="eval-results">{current.results.map(r=><details key={r.case_id} data-testid="eval-result" data-status={r.status}>
        <summary>{r.case_id} · {statusLabels[r.status]} · {r.failure_stage??'—'} · {r.code??'—'}</summary>
        <p>实际运行：{r.observed_status??'未运行'}；工具调用{r.tool_calls}；{scoreText(r.score)}</p>
        {r.assertions.map(a=><p key={a.metric}>{a.passed?'通过':'不通过'} · {a.metric} · {a.stage} / 事件{a.sequence??'—'} · {a.reason}</p>)}
        {r.answer?<p>本地回复：{r.answer}</p>:null}
        <pre aria-label={`${r.case_id}工具调用轨迹`}>{JSON.stringify(r.trace,null,2)}</pre>
      </details>)}</div>
      <h3>人工反馈</h3><p>人工判断追加保留，自动断言和分数保持原记录；反馈文字留在本机。</p>
      <label>反馈案例<select aria-label="反馈案例" value={feedbackCase} onChange={e=>setFeedbackCase(e.target.value)}>{current.cases.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label>人工判断<select aria-label="人工判断" value={judgment} onChange={e=>setJudgment(e.target.value as typeof judgment)}><option value="needs-review">需要复审</option><option value="agree">同意自动判断</option><option value="disagree">不同意自动判断</option></select></label>
      <label>反馈理由<textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>
      <button disabled={locked||!reason.trim()} onClick={()=>void act(async()=>{await window.researchTrail!.addEvaluationFeedback(current.id,{request_id:crypto.randomUUID(),case_id:feedbackCase,judgment,reason});await load(current.id);if(alive.current)setReason('');})}>追加人工反馈</button>
      <div data-testid="eval-feedback">{feedback.map(f=><p key={f.id}>{f.case_id} · {f.judgment} · 人工 · {f.reason}</p>)}</div>
    </article>:<p>先创建实验，或选择已保存实验。</p>}
    <TracingPanel available={available} experiment={current}/>
  </section>;
}
