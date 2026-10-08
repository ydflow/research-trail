"""Application-only scheduler over existing Python services; no model or parallel fact store.

Conceptual references: fixed Folio alerts/engine, automation/scheduler and brief.
An execution claim, cursor and trigger are durable. Restart marks uncertain work
interrupted; it never retries the same scheduled occurrence or calls a report model.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import threading
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo
from sqlalchemy import select, func
from .models import MonitoringRuleRecord, MonitoringRunRecord, MonitoringResearchRecord
from .calendar_normalize import digest
from .provider_contracts import ReadQuery
from .monitoring_contracts import RuleView, MonitorRun, TodayView, TodayItem, MonitorResearchAction, MonitorResearchInput, DailyBrief
from .monitoring_schedule import SCHEDULED, next_due
from .research_store import ResearchError

class MonitoringError(ResearchError): pass

class MonitoringService:
    def __init__(self,database,registry,providers,calendar,watchlist,portfolios,research,reports,theses,
                 *,clock=None,interval_seconds=60,start=True):
        self.database,self.registry,self.providers=database,registry,providers
        self.calendar,self.watchlist,self.portfolios=calendar,watchlist,portfolios
        self.research,self.reports,self.theses=research,reports,theses
        self.clock=clock or (lambda:datetime.now(timezone.utc))
        self.stop=threading.Event(); self.lock=threading.Lock(); self.action_lock=threading.Lock(); self.thread=None
        if not 0.05<=interval_seconds<=3600: raise ValueError('调度间隔无效')
        self.interval_seconds=interval_seconds
        self.workers={}; self.workers_lock=threading.Lock()
        with database.write() as db:
            for row in db.scalars(select(MonitoringRunRecord)):
                if row.status=='running':
                    row.status='interrupted'; row.code='APPLICATION_RESTARTED'; row.completed_at=self.clock().isoformat()
                if row.notification_status=='claimed': row.notification_status='uncertain'
                elif row.notification_status=='pending': row.notification_status='suppressed'
            for row in db.scalars(select(MonitoringResearchRecord).where(MonitoringResearchRecord.status=='claimed')):
                row.status='uncertain'; row.code='APPLICATION_RESTARTED'
            for row in db.scalars(select(MonitoringRuleRecord)):
                rule=self.rule_view(row).input; state=dict(row.state); due=state.get('next_due')
                if rule.enabled and rule.kind in SCHEDULED and due and datetime.fromisoformat(due)<=self.clock():
                    first=datetime.fromisoformat(due); occurrence='daily:'+first.isoformat()
                    if not db.scalar(select(MonitoringRunRecord.id).where(MonitoringRunRecord.rule_id==row.id,
                        MonitoringRunRecord.occurrence==occurrence)):
                        db.add(MonitoringRunRecord(id=str(uuid4()),rule_id=row.id,occurrence=occurrence,
                            started_at=self.clock().isoformat(),completed_at=self.clock().isoformat(),status='skipped',
                            code='APPLICATION_CLOSED',notified=False,notification_status='none',
                            payload={'rule_name':rule.name,'kind':rule.kind,'mode':rule.mode,'provider':rule.provider,
                                'missed_from':first.isoformat(),'missed_until':self.clock().isoformat(),
                                'reason':'关闭期间未执行的计划不补跑，也没有自动研究或模型请求。','model_requests':0}))
                    state['next_due']=next_due(rule,self.clock()).isoformat(); row.state=state
        if start:
            self.thread=threading.Thread(target=self._loop,daemon=True,name='research-trail-monitoring')
            self.thread.start()

    def _loop(self):
        while not self.stop.wait(self.interval_seconds):
            try: self.tick()
            except Exception:
                # Detailed rule failures are already saved; don't leak raw provider errors.
                continue

    def close(self):
        self.stop.set()
        if self.thread: self.thread.join()

    @staticmethod
    def rule_view(row):
        return RuleView(id=row.id,created_at=row.created_at,revision=row.revision,input=row.payload,
            **{k:row.state.get(k) for k in ('last_checked_at','last_triggered_at','last_code','next_due')})

    @staticmethod
    def run_view(row):
        return MonitorRun(**{k:getattr(row,k) for k in MonitorRun.model_fields})

    @staticmethod
    def row(db,identity):
        try: identity=str(UUID(str(identity)))
        except (ValueError,TypeError): raise MonitoringError('MONITOR_RULE_NOT_FOUND') from None
        row=db.get(MonitoringRuleRecord,identity)
        if row is None: raise MonitoringError('MONITOR_RULE_NOT_FOUND')
        return row

    def rules(self):
        with self.database.sessions() as db:
            return [self.rule_view(r) for r in db.scalars(select(MonitoringRuleRecord)
                .order_by(MonitoringRuleRecord.created_at,MonitoringRuleRecord.id))]

    def create(self,body):
        raw=body.model_dump(mode='json'); fingerprint=digest(raw)
        if body.portfolio_id: self.portfolios.view(body.portfolio_id)
        with self.database.write() as db:
            old=db.scalar(select(MonitoringRuleRecord).where(MonitoringRuleRecord.request_id==str(body.request_id)))
            if old:
                if old.request_hash!=fingerprint: raise MonitoringError('MONITOR_REQUEST_CONFLICT')
                return self.rule_view(old)
            if db.scalar(select(func.count()).select_from(MonitoringRuleRecord))>=100:
                raise MonitoringError('MONITOR_RULE_LIMIT')
            if body.enabled and sum(r.payload['enabled'] for r in db.scalars(select(MonitoringRuleRecord)))>=20:
                raise MonitoringError('MONITOR_ENABLED_LIMIT')
            state={'last_success_at':self.clock().isoformat()}
            if body.kind in SCHEDULED: state['next_due']=next_due(body,self.clock()).isoformat()
            row=MonitoringRuleRecord(id=str(uuid4()),request_id=str(body.request_id),request_hash=fingerprint,
                created_at=self.clock().isoformat(),revision=0,payload=raw,state=state)
            db.add(row); db.flush(); return self.rule_view(row)

    def toggle(self,identity,enabled):
        with self.database.write() as db:
            row=self.row(db,identity)
            if row.payload['enabled']!=enabled:
                if enabled and sum(r.payload['enabled'] for r in db.scalars(select(MonitoringRuleRecord)))>=20:
                    raise MonitoringError('MONITOR_ENABLED_LIMIT')
                row.payload={**row.payload,'enabled':enabled}
                # Enabling must not reset dedup/cooldown or replay today's automation.
                if enabled and row.payload['kind'] in SCHEDULED:
                    rule=self.rule_view(row).input
                    if not row.state.get('next_due') or datetime.fromisoformat(row.state['next_due'])<=self.clock():
                        row.state={**row.state,'next_due':next_due(rule,self.clock()).isoformat()}
            return self.rule_view(row)

    def history(self):
        with self.database.sessions() as db:
            return [self.run_view(r) for r in db.scalars(select(MonitoringRunRecord)
                .order_by(MonitoringRunRecord.started_at.desc(),MonitoringRunRecord.id).limit(100))]

    def read(self,rule,capability,reads,**kwargs):
        if self.stop.is_set(): raise MonitoringError('APPLICATION_STOPPED')
        state=self.registry.state(capability,rule.mode,rule.provider)
        if not state.available: raise MonitoringError(state.code)
        key=(rule.provider,rule.mode,capability,kwargs.get('symbol'))
        with self.workers_lock:
            self.workers={k:t for k,t in self.workers.items() if t.is_alive()}
            if key in self.workers or len(self.workers)>=4: raise MonitoringError('MONITOR_EXECUTOR_DRAINING')
            done=threading.Event(); result_box=[]
            def execute():
                try:
                    result_box.append(self.providers.query(rule.provider,ReadQuery(capability=capability,mode=rule.mode,**kwargs),
                        stop=self.stop,timeout_seconds=2))
                except Exception: result_box.append(None)
                finally: done.set()
            worker=threading.Thread(target=execute,daemon=True,name='monitoring-provider-read')
            self.workers[key]=worker; worker.start()
        import time
        deadline=time.monotonic()+2.5
        while not done.wait(.02):
            if self.stop.is_set(): raise MonitoringError('APPLICATION_STOPPED')
            if time.monotonic()>=deadline: raise MonitoringError('MONITOR_READ_TIMEOUT')
        if self.stop.is_set(): raise MonitoringError('APPLICATION_STOPPED')
        result=result_box[0]
        if result is None: raise MonitoringError('INVALID_RESPONSE')
        if not result.ok: raise MonitoringError(result.code)
        if result.provenance.mode!=rule.mode: raise MonitoringError('SOURCE_MISMATCH')
        raw=result.model_dump(mode='json')
        reads.append({'capability':capability,'symbol':kwargs.get('symbol'),'provenance':raw['provenance'],
            'result_hash':digest(raw),'data':raw['data']})
        return result.data

    @staticmethod
    def number(value):
        try:
            if value is None or isinstance(value,bool): raise ValueError()
            n=Decimal(str(value))
            if not n.is_finite(): raise ValueError()
            return n
        except (InvalidOperation,ValueError,TypeError): raise MonitoringError('METRIC_MISSING') from None

    def saved_events(self,rule):
        snapshots=[s for s in self.calendar.list() if s.mode==rule.mode and s.provider==rule.provider]
        if not snapshots: raise MonitoringError('CALENDAR_SNAPSHOT_MISSING')
        page=self.calendar.view(snapshots[0].id,rule.timezone)
        if page.status not in ('completed','partial'): raise MonitoringError('CALENDAR_SOURCE_UNAVAILABLE')
        if not any(r.query.event_type=='financial' and r.status=='success' for r in page.reads):
            raise MonitoringError('CALENDAR_EARNINGS_MISSING')
        return page

    def occurrence(self,rule,state,now):
        if rule.kind in SCHEDULED:
            due=datetime.fromisoformat(state['next_due'])
            if due>now: return None
            state['next_due']=next_due(rule,now).isoformat()
            return 'daily:'+due.isoformat()
        last_checked=state.get('last_checked_at')
        if last_checked and now<=datetime.fromisoformat(last_checked): return None
        last=state.get('last_triggered_at')
        if last and now-datetime.fromisoformat(last)<timedelta(minutes=rule.cooldown_minutes): return None
        return 'tick:'+now.replace(second=0,microsecond=0).isoformat()

    def tick(self):
        if self.stop.is_set() or not self.lock.acquire(blocking=False): return self.history()
        try:
            now=self.clock().astimezone(timezone.utc)
            for view in self.rules():
                if self.stop.is_set(): break
                rule=view.input
                if not rule.enabled: continue
                with self.database.write() as db:
                    row=self.row(db,view.id)
                    if not row.payload['enabled']: continue
                    state=dict(row.state); occurrence=self.occurrence(rule,state,now)
                    if not occurrence: continue
                    if db.scalar(select(MonitoringRunRecord.id).where(MonitoringRunRecord.rule_id==view.id,
                        MonitoringRunRecord.occurrence==occurrence)): continue
                    execution=MonitoringRunRecord(id=str(uuid4()),rule_id=view.id,occurrence=occurrence,
                        started_at=now.isoformat(),status='running',notified=False,notification_status='none',payload={})
                    row.state=state
                    db.add(execution); db.flush(); run_id=execution.id
                reads=[]
                try:
                    last=state.get('last_triggered_at')
                    cooling=rule.kind in SCHEDULED and last and now-datetime.fromisoformat(last)<timedelta(minutes=rule.cooldown_minutes)
                    if cooling:
                        matched,key,payload=False,None,{'reason':'本次计划仍在冷却期，不读取来源或派发任务。'}
                    else: matched,key,payload=self.evaluate(rule,state,now,reads)
                    seen=state.get('seen',[])
                    duplicate=key is not None and key in seen
                    triggered=matched and not duplicate
                    status='triggered' if triggered else 'quiet'
                    code='DUPLICATE_EVIDENCE' if matched and duplicate else None
                    if triggered:
                        state['last_triggered_at']=now.isoformat()
                        if key: state['seen']=seen+[key]
                    payload={**payload,'reads':reads,'mode':rule.mode,'provider':rule.provider,'rule_name':rule.name,
                        'kind':rule.kind,'auto_research':rule.auto_research,'model_requests':0}
                except Exception as error:
                    status='failed'; code=error.code if isinstance(error,MonitoringError) else 'MONITOR_EXECUTION_FAILED'
                    payload={'reads':reads,'mode':rule.mode,'provider':rule.provider,'kind':rule.kind,
                        'rule_name':rule.name,'model_requests':0,'failures':getattr(error,'failures',[])}
                state.update(last_checked_at=now.isoformat(),last_code=code)
                with self.database.write() as db:
                    row=self.row(db,view.id); run=db.get(MonitoringRunRecord,run_id)
                    row.state=state
                    if self.stop.is_set(): status='interrupted'; code='APPLICATION_STOPPED'
                    run.status=status; run.code=code; run.completed_at=self.clock().isoformat(); run.payload=payload
                    run.notification_status=('pending' if row.payload['enabled'] else 'suppressed') if status=='triggered' else 'none'
                if status=='triggered' and rule.auto_research and not self.stop.is_set():
                    try: self.start_research(run_id,MonitorResearchInput(symbol=rule.symbol),automatic=True)
                    except MonitoringError:
                        # Disabled rules cannot dispatch; the saved trigger is never replayed.
                        continue
            return self.history()
        finally: self.lock.release()

    def evaluate(self,rule,state,now,reads):
        kind=rule.kind
        if kind in ('watchlist-daily-review','portfolio-daily-brief','weekly-thesis-review'):
            return self.automation(rule,state,now,reads)
        if kind in ('earnings','pre-earnings-research','post-earnings-research'):
            page=self.saved_events(rule)
            matching=[]
            for e in page.events:
                if e.kind!='earnings' or e.conflict or e.occurrence_status in ('cancelled','postponed'): continue
                if rule.symbol and rule.symbol not in e.related_symbols: continue
                if kind=='post-earnings-research':
                    due=e.occurrence_status=='occurred' and e.occurred_at is not None and timedelta(0)<=now-e.occurred_at<=timedelta(days=rule.horizon_days)
                else:
                    due=e.scheduled_at is not None and e.occurrence_status!='occurred' and timedelta(0)<=e.scheduled_at-now<=timedelta(days=rule.horizon_days)
                if due: matching.append(e)
            keys=[digest({'event':e.id,'time':str(e.occurred_at or e.scheduled_at),'kind':kind}) for e in matching]
            unseen=[e for e,k in zip(matching,keys) if k not in state.get('seen',[])]
            if unseen:
                state['seen']=state.get('seen',[])+[k for k in keys if k not in state.get('seen',[])]
            return bool(unseen),None,{'snapshot_id':page.id,'events':[e.model_dump(mode='json') for e in unseen],
                'action':'explicit-research','reason':'基于已保存财报事件；预告时间经过不等于已发生。'}
        if kind in ('position_weight','portfolio_drawdown'):
            view=self.portfolios.view(rule.portfolio_id)
            if (rule.mode=='real' and view.kind=='simulated') or (rule.mode=='simulated' and view.kind=='read_only'):
                raise MonitoringError('SOURCE_MODE_MISMATCH')
            if view.status!='ready': raise MonitoringError('PORTFOLIO_INCOMPLETE')
            values={}; matched=False; previous=dict(state.get('peaks',{}))
            for group in view.currencies:
                if kind=='position_weight':
                    value=sum(self.number(h.market_value) for h in view.holdings if h.currency==group.currency and h.symbol==rule.symbol)
                    total=self.number(group.market_value)
                    if total<=0: raise MonitoringError('PORTFOLIO_INCOMPLETE')
                    metric=value/total
                else:
                    value=self.number(group.assets)
                    peak=max(value,self.number(previous.get(group.currency,str(value))))
                    previous[group.currency]=str(peak)
                    if peak<=0: raise MonitoringError('PORTFOLIO_INCOMPLETE')
                    metric=(peak-value)/peak
                values[group.currency]=str(metric); matched|=metric>Decimal(rule.threshold)
            state['peaks']=previous
            if not values: raise MonitoringError('PORTFOLIO_INCOMPLETE')
            return matched,digest({'revision':view.revision,'values':values}),{'portfolio_id':view.id,'symbol':rule.symbol,
                'revision':view.revision,'metrics':values,'source':view.source,'reason':'分币种计算，缺失资产不估算。'}
        if kind in ('price_above','price_below'):
            market={'HK':'HK','SG':'SG','SH':'CN','SZ':'CN','HAS':'CN'}.get(rule.symbol.rsplit('.',1)[1],'US')
            market_data=self.read(rule,'market.status',reads,market=market)
            statuses=market_data.get('market_time',[]) if isinstance(market_data,dict) else market_data
            if not isinstance(statuses,list) or not statuses: raise MonitoringError('MARKET_STATUS_MISSING')
            statuses=[s for s in statuses if isinstance(s,dict) and s.get('market',market)==market]
            if not statuses or any(str(s.get('status','')).lower() not in ('open','trading','closed','halted','suspended') for s in statuses):
                raise MonitoringError('MARKET_STATUS_MISSING')
            if not any(str(s['status']).lower() in ('open','trading') for s in statuses):
                return False,None,{'reason':'市场关闭，不评估价格提醒。'}
            data=self.read(rule,'market.quote',reads,symbol=rule.symbol)
            price=self.number(data.get('last_price',data.get('last_done',data.get('price'))))
            matched=price>Decimal(rule.threshold) if kind=='price_above' else price<Decimal(rule.threshold)
            return matched,digest({'data':data,'symbol':rule.symbol}),{'symbol':rule.symbol,'price':str(price),'reason':'价格严格越过阈值。'}
        capability={'new_news':'research.news','rating_change':'company.ratings','dividend':'company.dividends'}[kind]
        data=self.read(rule,capability,reads,symbol=rule.symbol)
        if kind=='rating_change':
            current=digest(data); previous=state.get('rating'); state['rating']=current
            return previous is not None and previous!=current,current,{'symbol':rule.symbol,'previous':previous,'current':current,'reason':'首份评级仅建立基线。'}
        items=data if isinstance(data,list) else data.get('list',data.get('items',[]))
        if not isinstance(items,list): raise MonitoringError('INVALID_RESPONSE')
        eligible=[]; seen=set(state.get('seen',[]))
        for item in items:
            if not isinstance(item,dict): continue
            value=item.get('published_at',item.get('timestamp')) if kind=='new_news' else item.get('date',item.get('ex_date'))
            try:
                when=datetime.fromtimestamp(float(value),timezone.utc) if isinstance(value,(float,int)) else datetime.fromisoformat(value.replace('Z','+00:00'))
                if when.tzinfo is None: when=when.replace(tzinfo=ZoneInfo(rule.timezone))
            except (TypeError,ValueError,OverflowError,AttributeError): continue
            if kind=='new_news':
                first=datetime.fromisoformat(state['last_success_at'])
                due=first<when<=now
            else: due=timedelta(0)<=when-now<=timedelta(days=rule.horizon_days)
            key=digest(item)
            if due and key not in seen: eligible.append(item);seen.add(key)
        state['last_success_at']=now.isoformat()
        state['seen']=state.get('seen',[])+[digest(i) for i in eligible]
        return bool(eligible),None,{'symbol':rule.symbol,'items':eligible,'reason':'只显示有明确时间和未见过身份的来源。'}

    def automation(self,rule,state,now,reads):
        if rule.kind=='weekly-thesis-review':
            theses=self.theses.list()
            return bool(theses),None,{'thesis_ids':[t.id for t in theses],'evaluated':len(theses),
                'reason':'已有论点待显式复审；不自动赋予投资判断。','action':'explicit-thesis-review'}
        if rule.kind=='portfolio-daily-brief':
            view=self.portfolios.view(rule.portfolio_id)
            if (rule.mode=='real' and view.kind=='simulated') or (rule.mode=='simulated' and view.kind=='read_only'):
                raise MonitoringError('SOURCE_MODE_MISMATCH')
            if view.status not in ('ready','empty'): raise MonitoringError('PORTFOLIO_INCOMPLETE')
            return bool(view.holdings),None,{'portfolio_id':view.id,'revision':view.revision,'source':view.source,
                'currencies':[c.model_dump(mode='json') for c in view.currencies],'reason':'保存组合事实简报，币种分别列示。'}
        symbols=[rule.symbol] if rule.symbol else [s.symbol for s in self.watchlist.state().entries]
        material=[]; failures=[]
        for symbol in symbols[:20]:
            try:
                data=self.read(rule,'market.quote',reads,symbol=symbol)
                price=self.number(data.get('last_price',data.get('last_done',data.get('price'))))
                previous=self.number(data.get('previous_close',data.get('prev_close')))
                if previous<=0: raise MonitoringError('METRIC_MISSING')
                change=(price-previous)/previous
                if abs(change)>=Decimal('0.05'): material.append({'symbol':symbol,'change':str(change)})
            except MonitoringError as e: failures.append({'symbol':symbol,'code':e.code})
        if failures:
            error=MonitoringError('AUTOMATION_PARTIAL' if reads else 'AUTOMATION_FAILED');error.failures=failures
            raise error
        return bool(material) or (rule.notify=='all' and bool(symbols)),None,{'scope':symbols,'material':material,
            'evaluated':len(symbols),'analyzed':0,'action':'explicit-research','reason':'5%原始价格变化筛选；研究与模型合成需显式发起。'}

    def pending_notifications(self):
        with self.database.sessions() as db:
            return [self.run_view(r) for r in db.scalars(select(MonitoringRunRecord)
                .where(MonitoringRunRecord.status=='triggered',MonitoringRunRecord.notification_status=='pending')
                .order_by(MonitoringRunRecord.started_at,MonitoringRunRecord.id).limit(20))]

    def claim_notification(self,identity):
        with self.database.write() as db:
            try: row=db.get(MonitoringRunRecord,str(UUID(str(identity))))
            except (ValueError,TypeError): row=None
            if row is None: raise MonitoringError('MONITOR_RUN_NOT_FOUND')
            if row.status!='triggered' or row.notification_status!='pending': return None
            rule=self.row(db,row.rule_id)
            row.notification_status='claimed' if rule.payload['enabled'] else 'suppressed'
            if row.notification_status!='claimed': return None
            return self.run_view(row)

    def finish_notification(self,identity,status):
        with self.database.write() as db:
            try: row=db.get(MonitoringRunRecord,str(UUID(str(identity))))
            except (ValueError,TypeError): row=None
            if row is None: raise MonitoringError('MONITOR_RUN_NOT_FOUND')
            if row.notification_status=='claimed':
                row.notification_status=status; row.notified=status=='shown'
            return self.run_view(row)

    def actions(self):
        with self.database.sessions() as db:
            return [MonitorResearchAction(**{k:getattr(r,k) for k in MonitorResearchAction.model_fields})
                for r in db.scalars(select(MonitoringResearchRecord).limit(200))]

    def start_research(self,identity,body,*,automatic=False):
        from .research_contracts import ResearchInput
        with self.action_lock:
            with self.database.write() as db:
                try: row=db.get(MonitoringRunRecord,str(UUID(str(identity))))
                except (ValueError,TypeError): row=None
                if row is None: raise MonitoringError('MONITOR_RUN_NOT_FOUND')
                old=db.scalar(select(MonitoringResearchRecord).where(MonitoringResearchRecord.run_id==row.id,
                    MonitoringResearchRecord.symbol==body.symbol))
                if old: return MonitorResearchAction(**{k:getattr(old,k) for k in MonitorResearchAction.model_fields})
                if automatic:
                    rule=self.row(db,row.rule_id)
                    if not rule.payload['enabled'] or not rule.payload.get('auto_research') or self.stop.is_set():
                        raise MonitoringError('MONITOR_RULE_DISABLED')
                if row.status!='triggered' or row.payload.get('action')!='explicit-research':
                    raise MonitoringError('MONITOR_RESEARCH_UNAVAILABLE')
                symbols=list(row.payload.get('scope',[]))+([row.payload['symbol']] if row.payload.get('symbol') else [])
                for e in row.payload.get('events',[]): symbols.extend(e['related_symbols'])
                if body.symbol not in symbols: raise MonitoringError('MONITOR_SYMBOL_MISMATCH')
                action=MonitoringResearchRecord(id=str(uuid4()),run_id=row.id,symbol=body.symbol,status='claimed')
                db.add(action); db.flush(); action_id=action.id
                query=ResearchInput(symbol=body.symbol,mode=row.payload['mode'],provider=row.payload['provider'],
                    strategy='earnings' if row.payload['kind'] in ('pre-earnings-research','post-earnings-research','earnings') else 'comprehensive')
                if row.payload.get('snapshot_id'):
                    from .calendar_contracts import EventResearchRef
                    event=next(e for e in row.payload['events'] if body.symbol in e['related_symbols'])
                    query.event_ref=EventResearchRef(snapshot_id=row.payload['snapshot_id'],event_id=event['id'],
                        timezone=event['display_timezone'])
            try:
                result=self.research.start(query); status='dispatched'; research_id=result.id; code=None
            except Exception as error:
                status='failed'; research_id=None; code=error.code if isinstance(error,ResearchError) else 'RESEARCH_DISPATCH_FAILED'
            with self.database.write() as db:
                action=db.get(MonitoringResearchRecord,action_id)
                action.status=status; action.research_id=research_id; action.code=code
                return MonitorResearchAction(**{k:getattr(action,k) for k in MonitorResearchAction.model_fields})

    def today(self,query):
        now=self.clock(); zone=ZoneInfo(query.timezone); today=now.astimezone(zone).date()
        runs=self.history(); items=[]
        for r in runs:
            if r.started_at.astimezone(zone).date()!=today: continue
            items.append(TodayItem(source='automation' if '-' in r.payload.get('kind','') else 'alert',source_id=r.id,
                title=r.payload.get('rule_name','监控执行'),status=r.status,symbol=r.payload.get('symbol'),
                mode=r.payload.get('mode'),provider=r.payload.get('provider'),
                reason=r.code or r.payload.get('reason','来源读取记录可展开核对。')))
        event_sources=set()
        for s in self.calendar.list()[:10]:
            page=self.calendar.view(s.id,query.timezone)
            for e in page.events:
                key=(s.mode,s.provider,e.id)
                if key in event_sources: continue
                event_sources.add(key)
                if e.display_date==today: items.append(TodayItem(source='calendar',source_id=s.id+':'+e.id,
                    title=e.title,status=e.occurrence_status,mode=s.mode,provider=s.provider,
                    reason=('模拟来源' if s.mode=='simulated' else '真实来源')+' · '+page.label+' · '+e.display_time,symbol=next(iter(e.related_symbols),None)))
        for r in self.research.store.list()[:20]:
            if r.started_at.astimezone(zone).date()==today or r.status in ('fetching','partial','failed','interrupted'):
                items.append(TodayItem(source='research',source_id=r.id,title=r.symbol+' 研究',status=r.status,symbol=r.symbol,
                    mode=r.mode,provider=r.provider,
                    reason='已有采集执行状态；部分或失败不当作完整数据。'))
        for r in self.reports.store.list()[:20]:
            if datetime.fromisoformat(r.started_at).astimezone(zone).date()==today:
                items.append(TodayItem(source='report',source_id=r.id,title=r.symbol+' 报告',status=r.status,
                    mode=r.mode,symbol=r.symbol,reason='已有保存报告；事实、分析、预测仍分别核对。'))
        for t in self.theses.list()[:20]:
            saved=self.theses.get(t.id)
            if saved.current.origin=='review' and not any(r.kind=='evaluation' and r.base_version==t.current_version for r in saved.reviews): continue
            items.append(TodayItem(source='thesis',source_id=t.id,title=t.symbol+' 论点',status='review-available',
                symbol=t.symbol,reason='已有版本'+str(t.current_version)+'尚无该版本人工复审；不自动判断投资影响。'))
        for p in self.portfolios.list()[:20]:
            items.append(TodayItem(source='portfolio',source_id=p.id,title=p.name,status=p.kind,reason='已有组合；不隐式刷新真实账户。'))
        for s in self.watchlist.state().entries:
            items.append(TodayItem(source='watchlist',source_id=s.symbol,title=s.name,status='saved',symbol=s.symbol,
                reason='你保存的自选证券；不伪造今日行情。'))
        counts={}
        for item in items: counts[item.source]=counts.get(item.source,0)+1
        brief=DailyBrief(date=today.isoformat(),source_counts=counts,
            attention_count=sum(i.status in ('triggered','failed','interrupted','skipped','review-available') for i in items))
        return TodayView(generated_at=now,timezone=query.timezone,items=items[:200],runs=runs,rules=self.rules(),research_actions=self.actions(),brief=brief,
            limitations=['只在应用运行时调度；退出不会继续监控。','默认规则关闭；启用后按所选来源读取。',
                '简报是已有事实聚合，不是投资建议或预测验证。','财报前/后可显式开启自动数据采集；默认关闭，不自动生成模型报告。',
                '关闭期间错过的计划记未执行，不补跑；通知先领取，异常或重启不重复投递。',
                '最多100条规则、20条启用规则，历史最近100次；Today最多200项。'])
