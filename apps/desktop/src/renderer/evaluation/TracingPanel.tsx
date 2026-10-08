import { useEffect, useRef, useState } from 'react';
import type { ExperimentView, TraceConfig, TraceConfigView, TraceProvider, TracePreview, TraceDelivery } from '../../evaluation-types';

export function TracingPanel({available,experiment}:{available:boolean;experiment?:ExperimentView}) {
  const [configs,setConfigs]=useState<TraceConfigView[]>([]),[provider,setProvider]=useState<TraceProvider>('langsmith');
  const [draft,setDraft]=useState<TraceConfig>({enabled:false,endpoint:'',project:'research-trail'});
  const [secret,setSecret]=useState(''),[publicKey,setPublicKey]=useState(''),[workspace,setWorkspace]=useState('');
  const [preview,setPreview]=useState<TracePreview>(),[confirmed,setConfirmed]=useState(false),[deliveries,setDeliveries]=useState<TraceDelivery[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),working=useRef(false),request=useRef('');
  const target=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    let active=true;
    if(available && window.researchTrail)void Promise.all([window.researchTrail.tracingConfigurations(),window.researchTrail.evaluationTraceDeliveries()]).then(([items,receipts])=>{if(active){setConfigs(items);setDeliveries(receipts);}}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[available]);
  const saved=configs.find(c=>c.provider===provider);
  useEffect(()=>{
    setDraft({enabled:saved?.enabled??false,endpoint:saved?.endpoint??'',project:saved?.project??'research-trail'});
    setSecret('');setPublicKey('');setWorkspace('');setPreview(undefined);setConfirmed(false);
  },[provider,saved?.revision]);
  useEffect(()=>{target.current++;setPreview(undefined);setConfirmed(false);},[provider,experiment?.id,experiment?.status]);
  async function refresh(){const [items,receipts]=await Promise.all([window.researchTrail!.tracingConfigurations(),window.researchTrail!.evaluationTraceDeliveries()]);if(alive.current){setConfigs(items);setDeliveries(receipts);}}
  async function act(task:()=>Promise<void>){
    if(working.current||!available)return;working.current=true;setBusy(true);setError('');
    try{await task();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'追踪操作失败。');}
    finally{working.current=false;if(alive.current)setBusy(false);}
  }
  const locked=busy||!available;
  return <details className="eval-tracing" data-testid="eval-tracing"><summary>外部追踪与脱敏预览</summary>
    <p>默认关闭。评测及保存配置都在本机；连接检查与上传分别显式执行。上传仅含案例身份、状态、工具名和断言摘要，不含提示/回复/工具参数或结果/账户/持仓/反馈文字。CI禁止真实外部连接。</p>
    {error?<p role="alert">{error}</p>:null}
    <label>追踪平台<select aria-label="追踪平台" value={provider} disabled={locked} onChange={e=>setProvider(e.target.value as TraceProvider)}><option value="langsmith">LangSmith</option><option value="langfuse">Langfuse OTLP</option></select></label>
    <p data-testid="trace-state">{saved?.enabled?'已启用':'已关闭'} · {saved?.credential_present?'本机凭证已保存':'未配置凭证'} · {saved?.code??'TRACING_DISABLED'}</p>
    <label><input type="checkbox" disabled={locked} checked={draft.enabled} onChange={e=>setDraft(d=>({...d,enabled:e.target.checked}))}/>允许显式连接和上传</label>
    <label>追踪源站<input value={draft.endpoint} disabled={locked} placeholder={provider==='langsmith'?'https://api.smith.langchain.com':'https://cloud.langfuse.com'} onChange={e=>setDraft(d=>({...d,endpoint:e.target.value}))}/></label>
    <label>项目标识<input value={draft.project} disabled={locked} maxLength={80} onChange={e=>setDraft(d=>({...d,project:e.target.value}))}/></label>
    <button disabled={locked} onClick={()=>void act(async()=>{await window.researchTrail!.saveTracingConfiguration(provider,draft);await refresh();})}>保存追踪配置</button>
    <label>{provider==='langsmith'?'LangSmith API Key':'Langfuse Secret Key'}<input type="password" autoComplete="off" value={secret} disabled={locked} onChange={e=>setSecret(e.target.value)}/></label>
    {provider==='langfuse'?<label>Langfuse Public Key<input type="password" autoComplete="off" value={publicKey} disabled={locked} onChange={e=>setPublicKey(e.target.value)}/></label>:<label>Workspace UUID（可留空）<input value={workspace} disabled={locked} onChange={e=>setWorkspace(e.target.value)}/></label>}
    <button disabled={locked||!secret.trim()||!saved} onClick={()=>void act(async()=>{await window.researchTrail!.saveTracingCredential(provider,{secret,...(publicKey?{public_key:publicKey}:{}),...(workspace?{workspace_id:workspace}:{})});if(alive.current){setSecret('');setPublicKey('');setWorkspace('');}await refresh();})}>保存到系统凭证管理器</button>
    <button disabled={locked||!saved?.credential_present} onClick={()=>void act(async()=>{await window.researchTrail!.deleteTracingCredential(provider);await refresh();})}>删除追踪凭证并关闭</button>
    <button disabled={locked||!saved?.enabled} onClick={()=>void act(async()=>{await window.researchTrail!.probeTracing(provider);await refresh();})}>真实连接检查</button>
    <button disabled={locked||!experiment||['not_run','running'].includes(experiment.status)} onClick={()=>void act(async()=>{const ticket=target.current;const next=await window.researchTrail!.previewEvaluationTrace(provider,experiment!.id);if(alive.current && ticket===target.current){setPreview(next);setConfirmed(false);request.current=crypto.randomUUID();}})}>生成脱敏预览</button>
    {preview?<div data-testid="trace-preview"><p>脱敏方案minimal-allowlist-v1 · 配置版本{preview.revision} · SHA256 {preview.digest}</p><pre>{JSON.stringify(preview.payload,null,2)}</pre>
      <label><input type="checkbox" checked={confirmed} disabled={locked} onChange={e=>setConfirmed(e.target.checked)}/>我已检查载荷并允许上传至所配置源站</label>
      <button disabled={locked||!confirmed||!saved?.enabled||!saved.credential_present} onClick={()=>void act(async()=>{await window.researchTrail!.uploadEvaluationTrace(provider,preview.experiment_id,{request_id:request.current,digest:preview.digest,confirm_upload:true});await refresh();if(alive.current)setConfirmed(false);})}>上传这份脱敏追踪</button>
    </div>:null}
    <div data-testid="trace-deliveries">{deliveries.map(d=><p key={d.id}>{d.provider} · {d.status} · {d.code} · {d.experiment_id}</p>)}</div>
    <p>领取后断线/退出记不确定，不自动重试；远程接受回执不证明控制台呈现或分析质量。</p>
  </details>;
}
