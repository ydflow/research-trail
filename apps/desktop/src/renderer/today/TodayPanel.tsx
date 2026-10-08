import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonitorRun, RuleInput, TodayView } from '../../monitoring-types';
import type { PortfolioInfo } from '../../portfolio-types';
import './today.css';

const types: Record<RuleInput['kind'],string>={price_above:'价格高于',price_below:'价格低于',new_news:'新新闻',earnings:'财报临近',
  rating_change:'评级变化',dividend:'股息临近',position_weight:'持仓权重超过',portfolio_drawdown:'组合回撤超过',
  'watchlist-daily-review':'自选每日复查','portfolio-daily-brief':'组合每日简报','weekly-thesis-review':'每周论点复审',
  'pre-earnings-research':'财报前研究入口','post-earnings-research':'财报后研究入口'};
const states:Record<MonitorRun['status'],string>={running:'执行中',triggered:'已触发',quiet:'未触发',failed:'执行失败',interrupted:'执行中断',skipped:'未执行'};
const notices:Record<MonitorRun['notification_status'],string>={none:'无需通知',pending:'等待通知',claimed:'通知已领取',shown:'系统已显示',failed:'通知失败',unsupported:'系统不支持',uncertain:'通知结果不确定',suppressed:'旧通知已抑制'};
const sources={alert:'提醒',automation:'自动化',calendar:'事件',research:'研究',report:'报告',thesis:'待复审论点',portfolio:'组合',watchlist:'自选'};

function RunRow({run,actions,busy,onResearch}:{run:MonitorRun;actions:TodayView['research_actions'];busy:boolean;onResearch:(id:string,symbol:string)=>void}) {
  const symbols=new Set<string>();
  if(run.payload.action==='explicit-research') {
    if(typeof run.payload.symbol==='string') symbols.add(run.payload.symbol);
    if(Array.isArray(run.payload.scope)) for(const s of run.payload.scope) if(typeof s==='string') symbols.add(s);
    if(Array.isArray(run.payload.events)) for(const e of run.payload.events) {
      if(e && typeof e==='object' && 'related_symbols' in e && Array.isArray(e.related_symbols)) for(const s of e.related_symbols) if(typeof s==='string') symbols.add(s);
    }
  }
  return <article className="today-run" data-testid="monitor-run" data-status={run.status} data-run-id={run.id}>
    <strong>{String(run.payload.rule_name??'监控执行')} · {states[run.status]}</strong>
    <p>{run.started_at} · {run.payload.mode==='simulated'?'模拟来源':'已保存来源'} · {notices[run.notification_status]}</p>
    <p>{run.code??String(run.payload.reason??'')} · 模型请求 {String(run.payload.model_requests??0)}</p>
    {run.status==='triggered' && [...symbols].map(symbol=>{
      const action=actions.find(a=>a.run_id===run.id && a.symbol===symbol);
      return <p key={symbol}><button disabled={busy || Boolean(action)} onClick={()=>onResearch(run.id,symbol)}>开始一次采集 {symbol}</button>
        {action && <span data-testid="monitor-research-action"> {action.status} · {action.research_id??action.code??'结果待确认'}</span>}</p>;
    })}
    <details><summary>触发来源与执行事实 {run.id}</summary><pre>{JSON.stringify(run.payload,null,2)}</pre></details>
  </article>;
}

export function TodayPanel({available}:{available:boolean}) {
  const [view,setView]=useState<TodayView>();const [portfolios,setPortfolios]=useState<PortfolioInfo[]>([]);
  const [zone,setZone]=useState('Asia/Shanghai');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [kind,setKind]=useState<RuleInput['kind']>('price_above');const [name,setName]=useState('价格提醒');
  const [symbol,setSymbol]=useState('AAPL.US');const [threshold,setThreshold]=useState('190');const [portfolio,setPortfolio]=useState('');
  const [mode,setMode]=useState<'simulated'|'real'>('simulated');const [provider,setProvider]=useState<'longbridge'|'massive'>('longbridge');
  const [cooldown,setCooldown]=useState('60');const [horizon,setHorizon]=useState('7');const [clock,setClock]=useState('16:30');
  const [enabled,setEnabled]=useState(false);const [notify,setNotify]=useState<'material-only'|'all'>('material-only');
  const [autoResearch,setAutoResearch]=useState(false);
  const ticket=useRef(0),mounted=useRef(false),operation=useRef(false),loading=useRef(false);
  const scheduled=['watchlist-daily-review','portfolio-daily-brief','weekly-thesis-review'].includes(kind);
  const needsPortfolio=['position_weight','portfolio_drawdown','portfolio-daily-brief'].includes(kind);
  const needsThreshold=['price_above','price_below','position_weight','portfolio_drawdown'].includes(kind);
  const earningsAutomation=['pre-earnings-research','post-earnings-research'].includes(kind);
  const needsSymbol=['price_above','price_below','new_news','earnings','rating_change','dividend','position_weight'].includes(kind)||earningsAutomation;
  const refresh=useCallback(async()=>{
    if(!available || loading.current) return;loading.current=true;const generation=ticket.current;
    try { const next=await window.researchTrail!.today(zone);if(mounted.current && generation===ticket.current){setView(next);setError('');} }
    catch(e){if(mounted.current && generation===ticket.current)setError(e instanceof Error?e.message:'Today读取失败。');}
    finally {loading.current=false;}
  },[available,zone]);
  useEffect(()=>{
    mounted.current=true;++ticket.current;setView(undefined);
    if(available) {
      void refresh();const generation=ticket.current;
      void window.researchTrail!.portfolioList().then(rows=>{if(mounted.current && generation===ticket.current){setPortfolios(rows);setPortfolio(p=>p||rows.find(r=>r.kind==='simulated')?.id||'');}}).catch(()=>{});
    }
    const timer=setInterval(()=>{void refresh();},3000);
    return()=>{mounted.current=false;++ticket.current;clearInterval(timer);};
  },[available,refresh]);
  async function act(work:()=>Promise<unknown>) {
    if(operation.current)return;operation.current=true;setBusy(true);setError('');
    try {await work();await refresh();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'操作失败。');}
    finally{operation.current=false;if(mounted.current)setBusy(false);}
  }
  function create() {
    const [hour,minute]=clock.split(':').map(Number);
    const input:RuleInput={request_id:crypto.randomUUID(),name,kind,enabled,mode,provider,timezone:zone,
      cooldown_minutes:Number(cooldown),horizon_days:Number(horizon),notify,auto_research:earningsAutomation&&autoResearch,
      hour:scheduled?hour:16,minute:scheduled?minute:30,days:kind==='weekly-thesis-review'?[7]:[1,2,3,4,5],
      ...(needsSymbol?{symbol}:{}),...(needsPortfolio?{portfolio_id:portfolio}:{}),...(needsThreshold?{threshold}:{})};
    return act(()=>window.researchTrail!.createMonitoringRule(input));
  }
  return <section className="today-panel" data-testid="today-panel">
    <h2>Today · 提醒与每日简报</h2>
    <p>只在应用运行时调度。关闭期间的计划未执行，不补跑；自动采集需额外开启，模型报告需显式生成。</p>
    <div className="today-controls"><label>Today时区<select aria-label="Today时区" disabled={busy} value={zone} onChange={e=>setZone(e.target.value)}>{['Asia/Shanghai','UTC','America/New_York','Asia/Hong_Kong'].map(z=><option key={z}>{z}</option>)}</select></label>
      <button disabled={!available||busy} onClick={()=>void refresh()}>刷新Today与简报</button></div>
    {error && <p role="alert">{error}</p>}
    <details><summary>新增提醒或自动化规则</summary><div className="today-controls">
      <label>规则名称<input aria-label="规则名称" maxLength={60} value={name} onChange={e=>setName(e.target.value)} /></label>
      <label>规则类型<select aria-label="规则类型" value={kind} onChange={e=>{const next=e.target.value as RuleInput['kind'];setKind(next);setName(types[next]);if(next==='weekly-thesis-review')setClock('09:00');}}>{Object.entries(types).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label>提醒数据模式<select aria-label="提醒数据模式" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="simulated">模拟来源</option><option value="real">真实来源</option></select></label>
      <label>提醒提供商<select aria-label="提醒提供商" value={provider} onChange={e=>setProvider(e.target.value as typeof provider)}><option value="longbridge">Longbridge</option><option value="massive">Massive</option></select></label>
      {needsSymbol && <label>提醒股票<input aria-label="提醒股票" value={symbol} maxLength={10} onChange={e=>setSymbol(e.target.value.toUpperCase())}/></label>}
      {needsPortfolio && <label>提醒组合<select aria-label="提醒组合" value={portfolio} onChange={e=>setPortfolio(e.target.value)}>{portfolios.map(p=><option key={p.id} value={p.id}>{p.name} · {p.kind}</option>)}</select></label>}
      {needsThreshold && <label>触发阈值<input aria-label="触发阈值" value={threshold} onChange={e=>setThreshold(e.target.value)}/></label>}
      <label>冷却分钟<input aria-label="冷却分钟" type="number" min="0" max="10080" value={cooldown} onChange={e=>setCooldown(e.target.value)}/></label>
      <label>事件提前天数<input aria-label="事件提前天数" type="number" min="1" max="30" value={horizon} onChange={e=>setHorizon(e.target.value)}/></label>
      {scheduled && <label>每日执行时间<input aria-label="每日执行时间" type="time" value={clock} onChange={e=>setClock(e.target.value)}/></label>}
      <label>通知策略<select aria-label="通知策略" value={notify} onChange={e=>setNotify(e.target.value as typeof notify)}><option value="material-only">仅实质变化</option><option value="all">全部复查</option></select></label>
      <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} aria-label="创建后启用"/>创建后启用（默认关闭）</label>
      {earningsAutomation && <label><input type="checkbox" checked={autoResearch} onChange={e=>setAutoResearch(e.target.checked)} aria-label="触发后自动采集"/>触发后自动采集一次（默认关闭，不生成模型报告）</label>}
      <button disabled={!available||busy||!name.trim()} onClick={()=>void create()}>保存规则</button>
    </div><p>价格使用严格高于/低于阈值，市场关闭不触发；组合阈值为0—1，币种分别计算。财报入口只读已保存日历快照。每日规则默认工作日，每周复审默认星期日。</p></details>
    {view && <>
      <section data-testid="daily-brief"><h3>每日简报 · {new Intl.DateTimeFormat('zh-CN',{timeZone:view.timezone,dateStyle:'full'}).format(new Date(view.generated_at))}</h3>
        <p>生成 {view.generated_at} · 有来源条目 {view.items.length} · 不代表投资预测已验证。</p>
        <p>待关注 {view.brief.attention_count} 项 · {view.brief.description}</p>
        <div className="today-items">{view.items.map(i=><article key={i.source+':'+i.source_id} data-testid="today-item" data-source={i.source}><strong>{sources[i.source]} · {i.title}</strong><p>{i.status} · {i.reason}</p><small>{i.mode??'本地保存'} · {i.provider??''} · 来源 {i.source_id}</small></article>)}</div>
      </section>
      <section data-testid="monitor-rules"><h3>已保存规则 · {view.rules.length}</h3>{view.rules.map(r=><article key={r.id}><strong>{r.input.name} · {types[r.input.kind]}</strong><p>{r.input.enabled?'启用':'关闭'} · {r.input.mode} · 冷却 {r.input.cooldown_minutes} 分钟 · {r.last_code??'尚无错误'}</p>
        <p>规则时区 {r.input.timezone} · 下次计划 {r.next_due??'事件或条件驱动'} · 上次检查 {r.last_checked_at??'未执行'} · 自动采集 {r.input.auto_research?'开启':'关闭'}</p>
        <button disabled={busy||!available} onClick={()=>void act(()=>window.researchTrail!.toggleMonitoringRule(r.id,!r.input.enabled))}>{r.input.enabled?'停用':'启用'}规则 {r.input.name}</button></article>)}</section>
      <section><h3>触发与执行记录（最近100次）</h3>{view.runs.map(r=><RunRow key={r.id} run={r} actions={view.research_actions} busy={busy||!available} onResearch={(id,s)=>void act(()=>window.researchTrail!.monitoringResearch(id,s))}/>)}</section>
      <ul>{view.limitations.map(x=><li key={x}>{x}</li>)}</ul>
    </>}
  </section>;
}
