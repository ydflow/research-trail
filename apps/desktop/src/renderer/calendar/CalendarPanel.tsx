// EventsView.tsx is a fixed Folio conceptual reference (ba5dcdfd). Python owns all event normalization/time/state.
import { useEffect, useRef, useState } from 'react';
import type { CalendarEventView, CalendarOriginal, CalendarPage, CalendarSource, CalendarSummary, EventResearchTarget } from '../../calendar-types';
import { eventStatus,eventTiming } from './EventContextCard';
import './calendar.css';

const kinds={earnings:'财报',macro:'宏观','central-bank':'央行'};
const statuses={completed:'读取完成',partial:'部分完成／存在缺口',failed:'全部读取失败',unavailable:'来源不可用'};
const zones=['Asia/Shanghai','America/New_York','UTC','Asia/Hong_Kong','Europe/London','Pacific/Kiritimati'];

function EventRow({event,page,disabled,onResearch,onOriginal}:{event:CalendarEventView;page:CalendarPage;disabled:boolean;onResearch:(target:EventResearchTarget)=>void;onOriginal:(id:string)=>void}) {
  const [symbol,setSymbol]=useState(event.related_symbols[0]??'AAPL.US');
  const valid=/^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$/.test(symbol);
  return <article className="calendar-row" data-testid="calendar-event" data-event-id={event.id} data-source-id={event.source_event_id??''} data-kind={event.kind}>
    <div><strong>{kinds[event.kind]} · {event.title}</strong><p data-testid="calendar-event-time">{event.display_time}</p><p>{eventStatus[event.occurrence_status]} · {eventTiming[event.time_relation]}</p>
      <p>{event.description}</p><p>来源时区 {event.source_timezone??'未提供'} · 更新时刻 {event.updated_at??'来源未提供'} · 精度 {event.precision}</p>
      {event.time_code&&<p role="status">时间缺口：{event.time_code}</p>}{event.conflict&&<p role="alert">事件来源或时间存在冲突，研究跳转已阻止。</p>}
      <details><summary>事件身份与来源</summary><p>{event.id} · 读取 {event.read_id} · JSON Pointer {event.pointer}</p><button disabled={disabled} onClick={()=>onOriginal(event.read_id)}>查看事件原始事实 {event.source_event_id??event.id}</button></details>
    </div>
    <div className="calendar-action">{event.related_symbols.length>0?<label>来源关联股票<select aria-label={`事件研究股票 ${event.source_event_id??event.id}`} disabled={disabled} value={symbol} onChange={e=>setSymbol(e.target.value)}>{event.related_symbols.map(s=><option key={s}>{s}</option>)}</select></label>:<label>自主选择研究股票<input aria-label={`事件研究股票 ${event.source_event_id??event.id}`} disabled={disabled} value={symbol} maxLength={10} onChange={e=>setSymbol(e.target.value.toUpperCase())}/></label>}
      {event.related_symbols.length===0&&<p>来源没有关联股票，研究对象由你选择。</p>}
      <button disabled={disabled||!valid||event.conflict} onClick={()=>onResearch({symbol,mode:page.query.mode??'simulated',provider:page.query.provider??'longbridge',event_ref:{snapshot_id:page.id,event_id:event.id,timezone:event.display_timezone}})}>带事件研究 {event.source_event_id??event.id}</button>
    </div>
  </article>;
}

export function CalendarPanel({available,onResearch}:{available:boolean;onResearch:(target:EventResearchTarget)=>void}) {
  const [mode,setMode]=useState<'simulated'|'real'>('simulated'),[provider,setProvider]=useState<'longbridge'|'massive'>('longbridge');
  const [zone,setZone]=useState('Asia/Shanghai'),[start,setStart]=useState('2024-01-15'),[end,setEnd]=useState('2024-01-25');
  const [kind,setKind]=useState<'all'|CalendarEventView['kind']>('all');
  const [sources,setSources]=useState<CalendarSource[]>([]),[history,setHistory]=useState<CalendarSummary[]>([]);
  const [page,setPage]=useState<CalendarPage>(),[original,setOriginal]=useState<CalendarOriginal>();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const generation=useRef(0),rawGeneration=useRef(0),activeOperation=useRef(false);
  const disabled=!available||busy;
  const canRead=sources.some(s=>(kind==='all'||s.kind===kind)&&s.availability.available);
  useEffect(()=>{
    const ticket=++generation.current;let active=true;++rawGeneration.current;setPage(undefined);setOriginal(undefined);setSources([]);setError('');
    if(available)void Promise.all([window.researchTrail!.calendarSources({mode,provider}),window.researchTrail!.calendarHistory()]).then(([states,rows])=>{
      if(active&&ticket===generation.current){setSources(states);setHistory(rows);}
    }).catch(e=>{if(active&&ticket===generation.current)setError(e instanceof Error?e.message:'事件来源读取失败。');});
    return()=>{active=false;++generation.current;++rawGeneration.current;};
  },[available,mode,provider]);
  async function refresh(){
    if(activeOperation.current)return;activeOperation.current=true;const ticket=++generation.current;setBusy(true);setError('');setOriginal(undefined);++rawGeneration.current;
    try{const next=await window.researchTrail!.refreshCalendar({mode,provider,timezone:zone,start,end,kinds:kind==='all'?['earnings','macro','central-bank']:[kind],request_id:crypto.randomUUID()});
      if(ticket===generation.current){setPage(next);const rows=await window.researchTrail!.calendarHistory();if(ticket===generation.current)setHistory(rows);}
    }catch(e){if(ticket===generation.current)setError(e instanceof Error?e.message:'事件刷新失败。');}
    finally{activeOperation.current=false;setBusy(false);}
  }
  async function view(id:string,nextZone=zone){
    if(activeOperation.current)return;activeOperation.current=true;const ticket=++generation.current;setBusy(true);setError('');setOriginal(undefined);++rawGeneration.current;
    try{const next=await window.researchTrail!.calendarView(id,nextZone);if(ticket===generation.current){setPage(next);setZone(nextZone);}}
    catch(e){if(ticket===generation.current)setError(e instanceof Error?e.message:'已保存事件读取失败。');}
    finally{activeOperation.current=false;setBusy(false);}
  }
  async function raw(readId:string){if(!page)return;const ticket=++rawGeneration.current,id=page.id;setError('');setOriginal(undefined);
    try{const next=await window.researchTrail!.calendarOriginal(id,readId);if(ticket===rawGeneration.current)setOriginal(next);}
    catch(e){if(ticket===rawGeneration.current)setError(e instanceof Error?e.message:'事件事实读取失败。');}
  }
  function clear(){++generation.current;++rawGeneration.current;setPage(undefined);setOriginal(undefined);setError('');}
  return <section className="calendar-panel" aria-label="事件日历" aria-busy={busy}>
    <h2>事件与催化日历</h2><p>先看来源、事件时区与发生状态。固定模拟参考时刻为2024-01-16 21:00 UTC；获取时间独立记录，预告经过不表示发生。</p>
    <div className="calendar-toolbar">
      <label>事件数据模式<select aria-label="事件数据模式" disabled={disabled} value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="simulated">固定模拟事件</option><option value="real">真实（需已有验证）</option></select></label>
      <label>事件提供商<select aria-label="事件提供商" disabled={disabled} value={provider} onChange={e=>setProvider(e.target.value as typeof provider)}><option value="longbridge">Longbridge</option><option value="massive">Massive</option></select></label>
      <label>事件类别<select aria-label="事件类别" disabled={disabled} value={kind} onChange={e=>{clear();setKind(e.target.value as typeof kind);}}><option value="all">全部三类</option>{Object.entries(kinds).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label>显示时区<select aria-label="事件显示时区" disabled={disabled} value={zone} onChange={e=>{const next=e.target.value;setZone(next);if(page)void view(page.id,next);}}>{zones.map(z=><option key={z}>{z}</option>)}</select></label>
      <label>起始日期<input aria-label="事件起始日期" type="date" disabled={disabled} value={start} onChange={e=>{clear();setStart(e.target.value);}}/></label>
      <label>结束日期<input aria-label="事件结束日期" type="date" disabled={disabled} value={end} onChange={e=>{clear();setEnd(e.target.value);}}/></label>
      <button disabled={disabled||!canRead} onClick={()=>void refresh()}>刷新事件并保存快照</button>
    </div>
    <ul data-testid="calendar-sources">{sources.map(s=><li key={s.kind}>{s.name} · {s.availability.available?'可读取':'不可用'} · {s.availability.code} · {s.coverage}</li>)}</ul>
    {busy&&<p role="status">事件读取中…</p>}{error&&<p role="alert">{error}</p>}
    {page&&<section data-testid="calendar-page" data-status={page.status} data-snapshot-id={page.id}>
      <h3>{statuses[page.status]} · {page.events.length}个可显示事件</h3><p>{page.label}</p>
      <p>{page.query.mode==='simulated'?'固定模拟事件':'真实来源'} · 快照保存 {page.saved_at} · 参考时刻 {page.reference_time} · 合并重复 {page.duplicate_count}</p>
      <p>快照原查询窗口 {page.query.start} — {page.query.end}；控件用于下一次显式刷新。</p>
      <ul>{page.reads.map(r=><li key={r.id}>{r.query.event_type} · {r.status} · {r.code??'读取成功'} · 来源获取 {r.fetched_at??'没有成功结果'}</li>)}</ul>
      {page.events.map(e=><EventRow key={e.id} event={e} page={page} disabled={disabled} onResearch={onResearch} onOriginal={id=>void raw(id)}/>)}
      {page.events.length===0&&<p>本快照没有可显示事件；不代表市场没有事件，也不会回退到模拟来源。</p>}
      {page.issues.length>0&&<details><summary>事件来源与时间缺口</summary><ul>{page.issues.map((i,n)=><li key={n}>{i.code} · {i.read_id}{i.pointer}</li>)}</ul></details>}
    </section>}
    {original&&<pre data-testid="calendar-original">{JSON.stringify(original,null,2)}</pre>}
    <details><summary>已保存事件快照（最多50份，不重新查询）</summary>{history.map(r=><p key={r.id}>{r.saved_at} · {r.mode} · {r.provider} · {r.status} · <button disabled={disabled} onClick={()=>void view(r.id)}>读取事件快照 {r.id}</button></p>)}</details>
  </section>;
}
