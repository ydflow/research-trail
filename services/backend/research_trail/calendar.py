"""Explicit calendar refresh; sole Python snapshots reuse ProviderService and registry."""
from datetime import datetime, timedelta, timezone
import threading
from uuid import UUID, uuid4
from pydantic import TypeAdapter
from sqlalchemy import select
from .models import CalendarSnapshotRecord
from .calendar_contracts import (CalendarSource,CalendarPage,CalendarRead,CalendarIssue,CalendarEvent,
    CalendarSummary,CalendarOriginal,EventResearchContext)
from .calendar_fixtures import REFERENCE_TIME
from .calendar_normalize import digest, rows, normalize, merge_events, project
from .provider_contracts import ReadQuery, ProviderFailure, ProviderResult
from .provider_errors import MESSAGES
from .research_store import ResearchError

class CalendarError(ResearchError): pass
RESULT = TypeAdapter(ProviderResult)

class CalendarService:
    def __init__(self,database,registry,providers,*,clock=None):
        self.database,self.registry,self.providers=database,registry,providers
        self.clock=clock or (lambda:datetime.now(timezone.utc))
        self.lock=threading.RLock()

    def sources(self,selection):
        return [CalendarSource(kind=k,name=n,availability=self.registry.state('calendar.'+k,selection.mode,selection.provider),coverage=c)
            for k,n,c in [('earnings','财报','已有financial只读通道；日期/时区/发生确认取决于实际返回字段。'),
                ('macro','宏观','已有macrodata通道；不保证全部地区或指标覆盖。'),
                ('central-bank','央行','固定模拟数据可用；真实提供商独立央行事件覆盖未实现。')]]

    def payload(self,identity):
        try: identity=str(UUID(str(identity)))
        except (ValueError,TypeError): raise CalendarError('CALENDAR_NOT_FOUND') from None
        with self.database.sessions() as db:
            row=db.get(CalendarSnapshotRecord,identity)
            if row is None: raise CalendarError('CALENDAR_NOT_FOUND')
            if digest(row.payload)!=row.checksum: raise CalendarError('CALENDAR_EVIDENCE_CHANGED')
            return row.payload

    def view(self,identity,zone=None):
        saved=self.payload(identity); page=saved['page']; zone=zone or page['query']['timezone']
        from .calendar_contracts import valid_zone
        valid_zone(zone)
        reference=datetime.fromisoformat(page['reference_time'])
        events=[project(CalendarEvent.model_validate(e),zone,reference) for e in saved['events']]
        start=datetime.fromisoformat(page['query']['start']).date(); end=datetime.fromisoformat(page['query']['end']).date()
        events=[e for e in events if e.display_date is None or start<=e.display_date<=end]
        events.sort(key=lambda e:(e.display_date is None,e.display_date.isoformat() if e.display_date else '',e.display_time,e.id))
        return CalendarPage(**{**page,'events':events})

    def list(self):
        with self.database.sessions() as db:
            stored=list(db.scalars(select(CalendarSnapshotRecord).order_by(CalendarSnapshotRecord.saved_at.desc(),CalendarSnapshotRecord.id).limit(50)))
            return [CalendarSummary(id=r.id,mode=r.payload['page']['query']['mode'],provider=r.payload['page']['query']['provider'],
                status=r.payload['page']['status'],saved_at=r.saved_at,event_count=len(r.payload['events'])) for r in stored]

    def refresh(self,query):
        fingerprint=digest(query.model_dump(mode='json',exclude={'request_id'}))
        with self.lock:
            with self.database.sessions() as db:
                old=db.scalar(select(CalendarSnapshotRecord).where(CalendarSnapshotRecord.request_id==str(query.request_id)))
                if old:
                    if old.request_hash!=fingerprint: raise CalendarError('CALENDAR_REQUEST_CONFLICT')
                    return self.view(old.id)
            sources=self.sources(query); wanted={s.kind:s for s in sources if s.kind in query.kinds}
            reference=REFERENCE_TIME if query.mode=='simulated' else self.clock()
            with self.providers.settings.lock:
                revision=self.providers.settings.profile(query.provider).revision
                identity=self.providers.settings.identity(query.provider)
            reads=[]; results={}; events=[]; issues=[]
            categories=[]
            if 'earnings' in wanted and wanted['earnings'].availability.available: categories.append('financial')
            if any(wanted[k].availability.available for k in ('macro','central-bank') if k in wanted): categories.append('macrodata')
            for category in categories:
                read_id=str(uuid4())
                read_query=ReadQuery(capability='research.events',mode=query.mode,event_type=category,count=100,
                    start=query.start-timedelta(days=2),end=query.end+timedelta(days=2),use_cache=False)
                try:
                    result=RESULT.validate_python(self.providers.query(query.provider,read_query,
                        timeout_seconds=20,expected_revision=revision,expected_identity=identity))
                    if result.provider!=query.provider or result.capability!='research.events': raise ValueError()
                    if result.ok:
                        provenance=result.provenance
                        if provenance.provider!=query.provider or provenance.mode!=query.mode: raise ValueError()
                        if (provenance.transport=='fixture')!=(query.mode=='simulated'): raise ValueError()
                        if len(result.model_dump_json().encode())>270*1024: raise ValueError()
                    else:
                        if result.code not in MESSAGES: raise ValueError()
                        result.message=MESSAGES[result.code]
                except Exception:
                    result=ProviderFailure(provider=query.provider,capability='research.events',state='failed',
                        code='INVALID_RESPONSE',message=MESSAGES['INVALID_RESPONSE'])
                raw=result.model_dump(mode='json'); results[read_id]=raw
                reads.append(CalendarRead(id=read_id,query=read_query,status='success' if result.ok else 'failed',
                    code=None if result.ok else result.code,result_hash=digest(raw),fetched_at=result.provenance.fetched_at if result.ok else None))
                if not result.ok: continue
                try:
                    for index,(pointer,item) in enumerate(rows(result.data)):
                        if index>=200: issues.append(CalendarIssue(read_id=read_id,pointer=pointer,code='CALENDAR_ROW_LIMIT')); break
                        try:
                            event=normalize(item,read_query,query.provider,query.mode,read_id,pointer)
                            if event.kind not in wanted: continue
                            if not wanted[event.kind].availability.available:
                                issues.append(CalendarIssue(read_id=read_id,pointer=pointer,code='CALENDAR_KIND_UNAVAILABLE')); continue
                            if event.time_code: issues.append(CalendarIssue(read_id=read_id,pointer=pointer,code=event.time_code))
                            if event.occurred_at and event.occurred_at>reference:
                                event.conflict=True
                                issues.append(CalendarIssue(read_id=read_id,pointer=pointer,code='EVENT_OCCURRENCE_IN_FUTURE'))
                            events.append(event)
                        except (ValueError,TypeError,KeyError,AttributeError) as error:
                            code=str(error) if str(error).startswith(('CALENDAR_','EVENT_')) else 'CALENDAR_ROW_INVALID'
                            issues.append(CalendarIssue(read_id=read_id,pointer=pointer,code=code))
                except ValueError: issues.append(CalendarIssue(read_id=read_id,pointer='',code='CALENDAR_RESPONSE_INVALID'))
            events,duplicates,conflicts=merge_events(events)
            issues.extend(CalendarIssue(read_id=r,pointer=p,code=c) for r,p,c in conflicts)
            unavailable=any(not s.availability.available for s in wanted.values())
            success=sum(r.status=='success' for r in reads)
            status='unavailable' if not reads else 'failed' if not success else 'partial' if unavailable or issues or success<len(reads) else 'completed'
            snapshot_id=str(uuid4()); saved_at=self.clock().isoformat()
            page=dict(id=snapshot_id,query=query.model_dump(mode='json'),reference_time=reference.isoformat(),saved_at=saved_at,
                status=status,sources=[s.model_dump(mode='json') for s in sources],reads=[r.model_dump(mode='json') for r in reads],
                issues=[i.model_dump() for i in issues],duplicate_count=duplicates)
            payload=dict(page=page,events=[e.model_dump(mode='json') for e in events],results=results)
            if len(str(payload).encode())>4*1024*1024: raise CalendarError('CALENDAR_RESPONSE_LIMIT')
            with self.database.write() as db:
                db.add(CalendarSnapshotRecord(id=snapshot_id,request_id=str(query.request_id),request_hash=fingerprint,
                    saved_at=saved_at,payload=payload,checksum=digest(payload)))
            return self.view(snapshot_id)

    def original(self,identity,read_id):
        saved=self.payload(identity)
        read=next((r for r in saved['page']['reads'] if r['id']==str(read_id)),None)
        raw=saved['results'].get(str(read_id))
        if read is None or raw is None: raise CalendarError('CALENDAR_READ_NOT_FOUND')
        if digest(raw)!=read['result_hash']: raise CalendarError('CALENDAR_EVIDENCE_CHANGED')
        return CalendarOriginal(snapshot_id=str(identity),read=read,result=raw)

    def context(self,reference,body):
        page=self.view(reference.snapshot_id,reference.timezone)
        if page.query.mode!=body.mode or page.query.provider!=body.provider: raise CalendarError('EVENT_CONTEXT_SOURCE_MISMATCH')
        event=next((e for e in page.events if e.id==reference.event_id),None)
        if event is None: raise CalendarError('CALENDAR_EVENT_NOT_FOUND')
        if event.conflict: raise CalendarError('CALENDAR_EVENT_CONFLICT')
        if event.related_symbols and body.symbol not in event.related_symbols: raise CalendarError('EVENT_CONTEXT_SYMBOL_MISMATCH')
        original=self.original(page.id,event.read_id)
        return EventResearchContext(snapshot_id=page.id,mode=page.query.mode,provider=page.query.provider,
            target_symbol=body.symbol,association='source' if event.related_symbols else 'user-selected',reference_time=page.reference_time,
            result_hash=original.read.result_hash,event=event)
