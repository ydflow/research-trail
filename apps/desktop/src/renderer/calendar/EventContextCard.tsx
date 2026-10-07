import { useEffect, useRef, useState } from 'react';
import type { CalendarOriginal, EventResearchContext } from '../../calendar-types';

export const eventStatus = { announced:'来源预告',occurred:'来源标记已发生',cancelled:'来源已取消',postponed:'来源已延期',unknown:'发生状态未知' };
export const eventTiming = {upcoming:'预告时间尚未到',elapsed_unconfirmed:'已过预告时间，尚未确认发生',occurred:'来源明确标记已发生',cancelled:'已取消',postponed:'已延期',date_only:'仅日期，准确时刻未知',unknown:'事件时间未知'};

export function EventContextCard({context,available}:{context:EventResearchContext;available:boolean}) {
  const [raw,setRaw]=useState<CalendarOriginal>(),[error,setError]=useState('');
  const generation=useRef(0);
  useEffect(()=>{++generation.current;setRaw(undefined);setError('');return()=>{++generation.current;};},[context.snapshot_id,context.event.id]);
  async function read(){const ticket=++generation.current;setError('');try{
    const result=await window.researchTrail!.calendarOriginal(context.snapshot_id,context.event.read_id);
    if(ticket===generation.current)setRaw(result);
  }catch(e){if(ticket===generation.current)setError(e instanceof Error?e.message:'事件原始事实读取失败。');}}
  const event=context.event;
  return <section data-testid="event-research-context" data-event-id={event.id}>
    <h3>事件研究上下文 · {event.title}</h3><p>{event.display_time} · {eventStatus[event.occurrence_status]} · {eventTiming[event.time_relation]}</p>
    <p>{context.mode==='simulated'?'固定模拟事件':'真实来源事件'} · {context.provider} · 研究股票 {context.target_symbol} · {context.association==='source'?'来源关联股票':'用户自主选择，来源未声明股票关联'}</p>
    <p>{context.label}</p><p>快照 {context.snapshot_id} · 事件 {event.id} · 原始结果 SHA256 {context.result_hash}</p>
    <button disabled={!available} onClick={()=>void read()}>查看上下文事件原始事实</button>
    {error&&<p role="alert">{error}</p>}{raw&&<pre data-testid="event-context-original">{JSON.stringify(raw,null,2)}</pre>}
  </section>;
}
