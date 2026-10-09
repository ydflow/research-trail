import { useEffect, useRef, useState } from 'react';
import type { OutcomeOpinion, OutcomeView, PerformanceQuery, PerformanceSnapshot, WeightHistory } from '../../outcome-types';
import type { ReportSummary, ReportJob } from '../../report-types';
import './outcomes.css';

const states:Record<string,string>={running:'评估中',pending:'窗口未到',unable:'无法评价',evaluated:'已观察',interrupted:'执行中断'};
const origins={prospective:'报告完成时冻结',retrospective:'事后补录', 'authored-history':'原创历史夹具'};
const time=(s:string|null|undefined)=>s?new Date(s).toLocaleString('zh-CN',{hour12:false}):'—';
const value=(s:string|null|undefined)=>s??'—';
const rate=(s:string|null|undefined)=>s==null?'—':`${(Number(s)*100).toFixed(1)}%`;

export function OutcomePanel({available}:{available:boolean}) {
  const [opinions,setOpinions]=useState<OutcomeOpinion[]>([]),[reports,setReports]=useState<ReportSummary[]>([]);
  const [current,setCurrent]=useState<OutcomeView>(),[source,setSource]=useState<ReportJob>();
  const [reportId,setReportId]=useState(''),[horizon,setHorizon]=useState<'1w'|'1m'|'3m'>('1m');
  const [policies,setPolicies]=useState<WeightHistory>(),[snapshot,setSnapshot]=useState<PerformanceSnapshot>();
  const [filter,setFilter]=useState<PerformanceQuery>({horizon:'1m',source_mode:'real',analysis_mode:'real',origin:'prospective'});
  const [asOf,setAsOf]=useState(''),[snapshotId,setSnapshotId]=useState('');
  const [minimum,setMinimum]=useState(30),[full,setFull]=useState(100),[sensitivity,setSensitivity]=useState('0.5'),[penalty,setPenalty]=useState('0.05');
  const [reason,setReason]=useState(''),[rollback,setRollback]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),working=useRef(false),generation=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
  function applyPolicies(p:WeightHistory){
    setPolicies(p);const selected=p.versions.find(v=>v.version===p.current_version);
    if(selected){setMinimum(selected.parameters.min_samples??30);setFull(selected.parameters.full_confidence_samples??100);
      setSensitivity(String(selected.parameters.sensitivity??'0.5'));setPenalty(String(selected.parameters.unable_penalty??'0.05'));}
  }
  useEffect(()=>{
    if(!available || !window.researchTrail)return;
    let active=true;const bridge=window.researchTrail;
    void Promise.all([bridge.outcomeOpinions(),bridge.reportList(),bridge.outcomePolicies()]).then(([o,r,p])=>{
      if(active){setOpinions(o);setReports(r.filter(j=>j.status==='completed'));applyPolicies(p);}
    }).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};
  },[available]);
  async function act(task:()=>Promise<void>){
    if(!available || working.current)return;working.current=true;setBusy(true);setError('');
    try{await task();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'结果追踪操作失败');}
    finally{working.current=false;if(alive.current)setBusy(false);}
  }
  async function load(id:string){
    const ticket=++generation.current;const saved=await window.researchTrail!.outcomeOpinion(id);
    if(alive.current && generation.current===ticket){setCurrent(saved);setSource(undefined);}
  }
  async function refresh(){
    const bridge=window.researchTrail!;const [o,r,p]=await Promise.all([bridge.outcomeOpinions(),bridge.reportList(),bridge.outcomePolicies()]);
    if(alive.current){setOpinions(o);setReports(r.filter(j=>j.status==='completed'));applyPolicies(p);}
  }
  const attempt=current?.attempts[current.attempts.length-1];
  return <section className="outcome-panel" data-testid="outcome-panel">
    <header><div><h2>投资研究结果</h2><p>跟踪当时的判断、后续价格与历史样本；独立于评测中心。</p></div><button disabled={busy||!available} onClick={()=>void act(refresh)}>刷新已保存记录</button></header>
    <p className="outcome-boundary">工具正确率不代表盈利能力。日线价格变化不是账户收益；未计交易成本、分红及基准超额收益。技能是研究计划关联，不是因果归因。</p>
    {error&&<p role="alert">{error}</p>}{busy&&<p role="status">正在处理…</p>}
    <div className="outcome-columns">
      <aside>
        <h3>研究时点与窗口</h3><p>新报告自动冻结 30 天窗口；旧报告或追加窗口明确标为事后补录。</p>
        <label>已完成报告<select aria-label="结果来源报告" value={reportId} disabled={busy} onChange={e=>setReportId(e.target.value)}><option value="">选择报告</option>{reports.map(r=><option key={r.id} value={r.id}>{r.symbol} · #{r.version} · {r.mode==='fixed'?'假模型':'真实模型'} · {time(r.completed_at)}</option>)}</select></label>
        <label>补录窗口<select aria-label="补录窗口" value={horizon} disabled={busy} onChange={e=>setHorizon(e.target.value as typeof horizon)}><option value="1w">7 天</option><option value="1m">30 天</option><option value="3m">90 天</option></select></label>
        <button disabled={busy||!available||!reportId} onClick={()=>void act(async()=>{const o=await window.researchTrail!.captureOutcome({report_id:reportId,horizon});await refresh();await load(o.id);})}>保存窗口</button>
        <div className="outcome-opinions" data-testid="outcome-opinions">{opinions.length===0?<p>尚无结果追踪记录。完成结构化报告后会保存研究时点。</p>:opinions.map(o=><button key={o.id} disabled={busy} aria-pressed={current?.opinion.id===o.id} onClick={()=>void act(()=>load(o.id))}>{o.symbol} · {o.horizon}<small>{o.source_mode==='real'?'真实行情':'模拟行情'} / {o.analysis_mode==='real'?'真实模型':'假模型'} · {origins[o.origin]}</small></button>)}</div>
      </aside>
      <article data-testid="outcome-detail" data-status={attempt?.status??'not_run'}>
        {!current?<p>选择一条研究记录查看冻结来源和评估历史。</p>:<>
          <h3>{current.opinion.symbol} · {current.opinion.horizon} · {origins[current.opinion.origin]}</h3>
          <dl><dt>研究时点</dt><dd>{time(current.opinion.research_at)}</dd><dt>名义窗口截止</dt><dd>{time(current.opinion.window_end)}</dd><dt>可评估时间</dt><dd>{time(current.opinion.due_at)}</dd><dt>当时判断</dt><dd>{current.opinion.stance}</dd><dt>入场行情来源</dt><dd>{current.opinion.provider} · {current.opinion.source_mode==='real'?'真实行情':'模拟行情'}</dd><dt>冻结价格</dt><dd>{value(current.opinion.entry_price)} {current.opinion.entry_code}</dd><dt>行情时点 / 获取时点</dt><dd>{time(current.opinion.entry_market_at)} / {time(current.opinion.entry_fetched_at)}</dd><dt>概率置信度</dt><dd>{current.opinion.confidence==null?'未提供匹配此窗口的概率，不能从文字推测。':rate(current.opinion.confidence)+' · 主观概率，未经校准'}</dd></dl>
          <p>日线按 UTC 日期完整结束后使用；窗口内工作日日线缺失会显示无法评价，暂不推断交易所节假日。</p>
          <button disabled={busy||!available||attempt?.status==='running'||current.attempts.some(a=>a.status==='evaluated')} onClick={()=>void act(async()=>{await window.researchTrail!.evaluateOutcome(current.opinion.id,crypto.randomUUID());await load(current.opinion.id);})}>读取后续行情并评估</button>
          <button disabled={busy} onClick={()=>void act(async()=>{const r=await window.researchTrail!.report(current.opinion.report_id);if(alive.current)setSource(r);})}>查看来源报告</button>
          <p>来源报告 {current.opinion.report_id} / 版本 {current.opinion.report_version}<br/>报告摘要 {current.opinion.report_hash}<br/>证据 {current.opinion.evidence_ids.join(', ')||'缺少可用价格证据'}</p>
          {source&&<details open data-testid="outcome-source"><summary>已保存来源报告</summary><p>{source.document?.disclaimer}</p>{source.document?.synthesis.summary.map((c,i)=><p key={i}>{c.text}</p>)}</details>}
          {attempt?<><h4>{states[attempt.status]} · {attempt.code??'完整窗口观察'}</h4><dl><dt>截止价格</dt><dd>{value(attempt.exit_price)}</dd><dt>价格变化</dt><dd>{attempt.return_percent==null?'—':attempt.return_percent+'%'}</dd><dt>方向匹配</dt><dd>{attempt.direction_correct==null?'—':attempt.direction_correct?'是':'否'}</dd><dt>收盘价最大回撤</dt><dd>{attempt.maximum_drawdown==null?'—':attempt.maximum_drawdown+'%'}</dd><dt>计算版本</dt><dd>{attempt.engine_version}</dd></dl></>:<p>未执行评估，无评价。</p>}
          <h4>评估记录（{current.attempts.length}）</h4>{current.attempts.map(a=><details key={a.id}><summary>{states[a.status]} · {a.code??'完整窗口'} · {time(a.evaluated_at)}</summary><p>执行 {a.id} · 请求 {a.request_id}<br/>行情 {a.provenance?.provider??'未读取'} · 获取 {time(a.provenance?.fetched_at)}<br/>数据摘要 {a.data_hash??'无有效行情'}</p><pre>{JSON.stringify(a.bars,null,2)}</pre></details>)}
        </>}
      </article>
    </div>
    <section className="outcome-performance"><h3>技能与策略表现 · 置信度校准</h3><p>至少 30 个有效样本才计算统计与权重。样本置信度表示样本强度，非预测概率或盈利概率。不同窗口、来源、模型和录入类型分别计算。</p>
      <div className="outcome-filters"><label>统计窗口<select aria-label="表现窗口" disabled={busy} value={filter.horizon} onChange={e=>setFilter({...filter,horizon:e.target.value as PerformanceQuery['horizon']})}><option value="1w">7 天</option><option value="1m">30 天</option><option value="3m">90 天</option></select></label>
      <label>行情<select aria-label="表现行情" disabled={busy} value={filter.source_mode} onChange={e=>setFilter({...filter,source_mode:e.target.value as PerformanceQuery['source_mode']})}><option value="real">真实行情</option><option value="simulated">模拟行情</option></select></label>
      <label>模型<select aria-label="表现模型" disabled={busy} value={filter.analysis_mode} onChange={e=>setFilter({...filter,analysis_mode:e.target.value as PerformanceQuery['analysis_mode']})}><option value="real">真实模型</option><option value="fixed">假模型</option></select></label>
      <label>记录类型<select aria-label="表现记录类型" disabled={busy} value={filter.origin} onChange={e=>setFilter({...filter,origin:e.target.value as PerformanceQuery['origin']})}><option value="prospective">报告完成时冻结</option><option value="retrospective">事后补录</option><option value="authored-history">原创历史夹具</option></select></label>
      <label>统计截至时点（ISO，含时区）<input aria-label="统计截至时点" disabled={busy} placeholder="留空使用当前时钟" value={asOf} onChange={e=>setAsOf(e.target.value)}/></label></div>
      <button disabled={busy||!available} onClick={()=>void act(async()=>{const s=await window.researchTrail!.outcomePerformance({...filter,as_of:asOf||null});if(alive.current){setSnapshot(s);setSnapshotId(s.id);}})}>计算并保存统计</button>
      {snapshot?<div data-testid="outcome-performance"><p>{snapshot.filter.source_mode==='real'?'真实行情':'模拟行情'} / {snapshot.filter.analysis_mode==='real'?'真实模型':'假模型'} / {origins[snapshot.filter.origin??'prospective']} / {snapshot.filter.horizon} · 截至 {time(snapshot.as_of)} · 参数 v{snapshot.policy_version}</p><p>快照 {snapshot.id} · {snapshot.calculation_version}<br/>输入摘要 {snapshot.input_hash}</p>{snapshot.rows.length===0?<p>样本不足：该分组没有可用研究记录，无统计或权重。</p>:<div className="outcome-table"><table><thead><tr><th>关联技能／策略</th><th>有效／无法／待评</th><th>方向匹配率</th><th>平均价格变化</th><th>历史可靠度</th><th>样本置信度</th><th>参考权重</th></tr></thead><tbody>{snapshot.rows.map(r=><tr key={r.kind+r.key}><td>{r.kind==='skill'?'技能':'策略'} · {r.key}{r.insufficient_data&&<small>样本不足</small>}</td><td>{r.samples} / {r.unable} / {r.pending}</td><td>{rate(r.direction_hit_rate)}</td><td>{r.average_return==null?'—':r.average_return+'%'}</td><td>{rate(r.historical_reliability)}</td><td>{rate(r.sample_confidence)}</td><td>{value(r.adaptive_weight)}</td></tr>)}</tbody></table></div>}<section data-testid="probability-calibration"><h4>预测概率校准</h4><p>只使用冻结概率与完整到期结果；每组及每个区间至少30个有效概率样本。Brier越低表示该事件概率误差越小，不是收益。</p>{snapshot.rows.map(r=><details key={r.kind+r.key}><summary>{r.key} · 概率样本 {r.probability_samples} · {r.probability_insufficient?'样本不足':'Brier '+r.brier_score}</summary><pre>{JSON.stringify(r.calibration_bins,null,2)}</pre></details>)}</section><details><summary>统计输入执行记录</summary>{snapshot.rows.map(r=><p key={r.kind+r.key}>{r.key}: {r.evaluation_ids.join(', ')||'尚无有效评价'}</p>)}</details></div>:<p>尚未生成统计快照。真实样本未验证，不显示虚构表现。</p>}
      <label>查看已保存快照<input aria-label="保存的统计快照" disabled={busy} value={snapshotId} onChange={e=>setSnapshotId(e.target.value)}/></label><button disabled={busy||!snapshotId||!available} onClick={()=>void act(async()=>{const s=await window.researchTrail!.outcomeSnapshot(snapshotId);if(alive.current)setSnapshot(s);})}>读取统计快照</button>
    </section>
    <section className="outcome-policy" data-testid="outcome-policy"><h3>权重参数与回滚 · 当前 v{policies?.current_version??'—'}</h3><p>权重固定限制在 0.75–1.25，仅供参考；不自动改写研究计划。每次调整或回滚追加版本，旧结果不重算。</p>
      <div className="outcome-filters"><label>最低有效样本<input aria-label="最低有效样本" type="number" min="30" max="1000" disabled={busy} value={minimum} onChange={e=>setMinimum(Number(e.target.value))}/></label><label>完整样本置信门槛<input aria-label="完整样本置信门槛" type="number" min="30" max="10000" disabled={busy} value={full} onChange={e=>setFull(Number(e.target.value))}/></label><label>权重敏感度<input aria-label="权重敏感度" disabled={busy} value={sensitivity} onChange={e=>setSensitivity(e.target.value)}/></label><label>无法评价惩罚（最多 0.05）<input aria-label="无法评价惩罚" disabled={busy} value={penalty} onChange={e=>setPenalty(e.target.value)}/></label><label>调整／回滚理由<input aria-label="权重变更理由" disabled={busy} maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label></div>
      <button disabled={busy||!available||!policies||!reason.trim()} onClick={()=>void act(async()=>{await window.researchTrail!.changeOutcomePolicy({request_id:crypto.randomUUID(),expected_version:policies!.current_version,reason,parameters:{min_samples:minimum,full_confidence_samples:full,sensitivity,unable_penalty:penalty}});await refresh();})}>保存参数版本</button>
      <label>回滚目标<select aria-label="权重回滚目标" disabled={busy} value={rollback} onChange={e=>setRollback(Number(e.target.value))}>{policies?.versions.map(v=><option key={v.version} value={v.version}>v{v.version} · {v.reason}</option>)}</select></label><button disabled={busy||!available||!policies||!reason.trim()} onClick={()=>void act(async()=>{await window.researchTrail!.changeOutcomePolicy({request_id:crypto.randomUUID(),expected_version:policies!.current_version,reason,rollback_version:rollback});await refresh();})}>追加回滚版本</button>
      <details><summary>参数版本历史</summary>{policies?.versions.map(v=><p key={v.version}>v{v.version} · {time(v.created_at)} · 父版本 {v.parent_version??'无'} · 回滚来源 {v.rollback_version??'无'}<br/>{v.reason} · {v.calculation_version}<br/>{JSON.stringify(v.parameters)}</p>)}</details>
    </section>
  </section>;
}
