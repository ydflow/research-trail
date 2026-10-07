"""Normalize source event times without inventing occurrence or query-date times."""
from datetime import date, datetime, timezone
import hashlib
import json
import re
from zoneinfo import ZoneInfo
from .calendar_contracts import CalendarEvent, CalendarEventView, valid_zone

def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def instant(value, zone=None):
    if value is None or value=='': return None
    if isinstance(value,bool): raise ValueError('EVENT_TIME_INVALID')
    if isinstance(value,(int,float)) or isinstance(value,str) and re.fullmatch(r'[0-9]{10}(?:\.[0-9]+)?',value):
        return datetime.fromtimestamp(float(value),timezone.utc)
    if not isinstance(value,str) or 'T' not in value and ' ' not in value: raise ValueError('EVENT_TIME_INVALID')
    parsed=datetime.fromisoformat(value.replace('Z','+00:00'))
    if parsed.tzinfo:
        if zone and parsed.utcoffset()!=parsed.astimezone(ZoneInfo(zone)).utcoffset(): raise ValueError('EVENT_TIME_ZONE_MISMATCH')
        return parsed.astimezone(timezone.utc)
    if not zone: raise ValueError('EVENT_TIME_ZONE_MISSING')
    tz=ZoneInfo(zone)
    candidates={parsed.replace(tzinfo=tz,fold=f).astimezone(timezone.utc) for f in (0,1)
        if parsed.replace(tzinfo=tz,fold=f).astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None)==parsed}
    if not candidates: raise ValueError('EVENT_TIME_NONEXISTENT')
    if len(candidates)>1: raise ValueError('EVENT_TIME_AMBIGUOUS')
    return candidates.pop()

def rows(data):
    entries=data if isinstance(data,list) else data.get('list') if isinstance(data,dict) else None
    if not isinstance(entries,list): raise ValueError('CALENDAR_RESPONSE_INVALID')
    # Yield one sentinel row so the service records overflow instead of hiding it.
    for i,item in enumerate(entries[:201]):
        path=f'/{i}' if isinstance(data,list) else f'/list/{i}'
        if isinstance(item,dict) and 'infos' in item:
            if not isinstance(item['infos'],list): yield path,None
            else:
                for j,row in enumerate(item['infos'][:201]): yield path+f'/infos/{j}',row
        else: yield path,item

def normalize(row,query,provider,mode,read_id,pointer):
    if not isinstance(row,dict): raise ValueError('CALENDAR_ROW_INVALID')
    kind=row.get('kind')
    if kind is None:
        kind='earnings' if row.get('type') in ('financial','report','earnings') else 'central-bank' if row.get('activity_type')=='central-bank' else 'macro' if row.get('type')=='macrodata' else None
    if kind not in ('earnings','macro','central-bank'): raise ValueError('CALENDAR_KIND_UNKNOWN')
    if (kind=='earnings')!=(query.event_type=='financial'): raise ValueError('CALENDAR_KIND_MISMATCH')
    title=row.get('title') or row.get('name') or row.get('counter_name') or row.get('content')
    if not isinstance(title,str) or not title.strip() or len(title)>300: raise ValueError('CALENDAR_TITLE_MISSING')
    ext=row.get('ext') if isinstance(row.get('ext'),dict) else {}
    symbols=row.get('related_symbols')
    if symbols is None:
        symbol=row.get('symbol')
        counter=row.get('counter_id')
        if not symbol and isinstance(counter,str):
            match=re.fullmatch(r'ST/(US|HK|SG|SH|SZ|HAS)/([A-Z0-9]{1,6})',counter)
            if match: symbol=match[2]+'.'+match[1]
        symbols=[symbol] if symbol else []
    if not isinstance(symbols,list) or len(symbols)>10 or any(not isinstance(s,str) or not re.fullmatch(r'[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)',s) for s in symbols):
        raise ValueError('CALENDAR_SYMBOL_INVALID')
    symbols=sorted(set(symbols))
    if query.symbol and symbols and query.symbol not in symbols: raise ValueError('CALENDAR_SYMBOL_MISMATCH')
    zone=row.get('timezone') or ext.get('timezone')
    if not zone and ext.get('date_zone') in ('(美东)','(香港)','(北京时间)'):
        zone={'(美东)':'America/New_York','(香港)':'Asia/Hong_Kong','(北京时间)':'Asia/Shanghai'}[ext['date_zone']]
    code=None
    if zone:
        try: zone=valid_zone(zone)
        except ValueError: zone=None; code='EVENT_TIME_ZONE_INVALID'
    local=row.get('local_date') or ext.get('local_date')
    if local is None and isinstance(row.get('date'),str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['date']): local=row['date']
    try: local=date.fromisoformat(local) if local else None
    except (ValueError,TypeError): local=None; code=code or 'EVENT_DATE_INVALID'
    report=ext.get('financial_report')
    hint=row.get('date_type') or row.get('financial_market_time') or (report.get('market_time') if isinstance(report,dict) else None)
    if hint is not None and not isinstance(hint,str): hint=None
    scheduled=occurred=updated=None
    for name,value in [('scheduled',row.get('scheduled_at')),('occurred',row.get('occurred_at')),('updated',row.get('updated_at'))]:
        if name=='scheduled' and value is None and not (local and hint in ('盘后','盘前','after','before')):
            value=row.get('datetime') if row.get('datetime') is not None else row.get('date')
            if isinstance(value,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}',value): value=None
        try: parsed=instant(value,zone if name!='updated' else None) if not code or name=='updated' else None
        except (ValueError,OverflowError,OSError) as error:
            parsed=None; code=code or (str(error) if str(error).startswith('EVENT_') else 'EVENT_TIME_INVALID')
        if name=='scheduled': scheduled=parsed
        elif name=='occurred': occurred=parsed
        else: updated=parsed
    status=row.get('status','announced' if scheduled or local else 'unknown')
    status=status if status in ('announced','occurred','cancelled','postponed','unknown') else 'unknown'
    if occurred: status='occurred'
    if not scheduled and not occurred and not local: code=code or 'EVENT_TIME_MISSING'
    source_id=row.get('id')
    source_id=str(source_id) if isinstance(source_id,(str,int)) and not isinstance(source_id,bool) and str(source_id) else None
    if source_id and len(source_id)>200: raise ValueError('CALENDAR_ID_INVALID')
    anchor=scheduled or occurred
    identity=digest([provider,mode,kind,source_id if source_id else [title,symbols,anchor.isoformat() if anchor else str(local),hint]])
    description=row.get('content','')
    description=description if isinstance(description,str) else ''
    return CalendarEvent(id=identity,source_event_id=source_id,kind=kind,title=title.strip(),description=description[:2000],
        related_symbols=symbols,scheduled_at=scheduled,occurred_at=occurred,source_date=local,source_timezone=zone,
        precision='instant' if scheduled or occurred else 'date' if local else 'unknown',schedule_label=hint,
        occurrence_status=status,updated_at=updated,time_code=code,read_id=read_id,pointer=pointer)

def project(event,zone,reference):
    value=event.occurred_at or event.scheduled_at
    if value:
        local=value.astimezone(ZoneInfo(zone)); day=local.date(); text=local.isoformat(timespec='seconds')+f' [{zone}]'
    elif event.source_date:
        day=event.source_date; text=day.isoformat()+f' · 当地日期 [{event.source_timezone or "时区未提供"}] · '+(event.schedule_label or '时刻未提供')
    else: day=None; text='事件时间未提供；不使用查询时间补齐'
    status=event.occurrence_status
    relation=status if status in ('occurred','cancelled','postponed') else ('upcoming' if value>reference else 'elapsed_unconfirmed') if value else 'date_only' if day else 'unknown'
    if event.conflict: relation='unknown'
    return CalendarEventView(**event.model_dump(),display_timezone=zone,display_time=text,display_date=day,time_relation=relation)

def merge_events(events):
    out={}; duplicates=0; conflicts=[]
    for event in events:
        old=out.get(event.id)
        if old is None: out[event.id]=event; continue
        duplicates+=1
        comparable=lambda e:e.model_dump(mode='json',exclude={'read_id','pointer','updated_at','conflict'})
        if comparable(old)==comparable(event):
            if event.updated_at and (not old.updated_at or event.updated_at>old.updated_at): out[event.id]=event
            continue
        if old.updated_at and event.updated_at and old.updated_at!=event.updated_at:
            out[event.id]=max((old,event),key=lambda e:e.updated_at); continue
        old.conflict=True; conflicts.append((event.read_id,event.pointer,'CALENDAR_EVENT_CONFLICT'))
    return list(out.values()),duplicates,conflicts
