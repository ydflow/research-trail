"""Original authored historical samples, for isolated offline acceptance only.

These are fabricated research decisions/prices, not personal investing results,
not upstream cases. No default application database is seeded by this module.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid5, NAMESPACE_URL
from .models import ResearchRecord, ResearchStepRecord, ReportRecord, OutcomeOpinionRecord
from .outcome_engine import window
from .report_facts import result_hash
from .provider_contracts import ProviderSuccess, Provenance

RESEARCH_AT = datetime(2024, 1, 2, 21, tzinfo=timezone.utc)
AS_OF = datetime(2024, 1, 11, tzinfo=timezone.utc)

def identity(label): return str(uuid5(NAMESPACE_URL, 'research-trail-own-outcome-v1/'+label))

def history(symbol, positive=True):
    values = []
    for day in (3, 4, 5, 8, 9):
        values.append(dict(timestamp=int(datetime(2024,1,day,tzinfo=timezone.utc).timestamp()),
            close='110' if positive else '90'))
    return values

class HistoricalProvider:
    def __init__(self, clock=lambda:AS_OF, *, missing=False): self.calls = []; self.clock = clock; self.positive = True; self.missing=missing
    def query(self, provider, query, **_kwargs):
        self.calls.append(query.model_dump(mode='json'))
        return ProviderSuccess(provider=provider, capability='market.kline', data=[] if self.missing else history(query.symbol,self.positive),
            provenance=Provenance(provider=provider, transport='fixture', mode='simulated', data_label='模拟数据',
                timeliness='historical', timeliness_basis='fixture', fetched_at=self.clock(), served_at=self.clock(),
                market_time=datetime(2024,1,9,tzinfo=timezone.utc)))

def seed_history(service, count=30):
    """Append fixed labelled source snapshots. Evaluations are still explicit."""
    identities = []
    for number in range(count):
        report_id = identity('report-'+str(number)); run_id = identity('run-'+str(number))
        with service.database.write() as db:
            previous = db.query(OutcomeOpinionRecord).filter_by(report_id=report_id, horizon='1w').first()
            if previous: identities.append(previous.id); continue
            research_at = RESEARCH_AT; stamp = research_at.isoformat()
            fact_id = 'own-history-price-'+str(number)
            result = ProviderSuccess(provider='longbridge', capability='market.quote',
                data=dict(symbol='AAPL.US',last_price=100,market_time=stamp),
                provenance=Provenance(provider='longbridge',transport='fixture',mode='simulated',data_label='模拟数据',
                    timeliness='historical',timeliness_basis='fixture',fetched_at=research_at,served_at=research_at,market_time=research_at)).model_dump(mode='json')
            fact = dict(id=fact_id,run_id=run_id,capability='market.quote',ordinal=1,pointer='/last_price',value=100,
                result_hash=result_hash(result),provider='longbridge',source_mode='simulated',fetched_at=stamp)
            claim = dict(kind='analysis',text='研迹原创历史夹具判断；不是真实投资记录。',evidence_ids=[fact_id])
            document = dict(symbol='AAPL.US',strategy='comprehensive',source_mode='simulated',provider='longbridge',
                source_run_id=run_id,collection_status='collected',evidence=[fact],gaps=[],
                synthesis=dict(stance='bullish',summary=[claim],sections=[dict(key='own-history',title='原创历史夹具',claims=[claim])],
                    risks=[claim],catalysts=[claim],bull_case=[claim],bear_case=[claim]),event_context=None,
                disclaimer='原创人工历史夹具，无真实模型或行情请求，不是投资绩效。')
            plan = dict(input=dict(symbol='AAPL.US',strategy='comprehensive',mode='simulated',provider='longbridge',concurrency=1,event_ref=None),
                source='原创历史夹具',provider_revision=1,provider_identity=None,timeout_seconds=20,
                skills=[dict(id='stock-analysis',status='ready',code='READY')],reads=[],event_context=None)
            db.add(ResearchRecord(id=run_id,status='collected',plan=plan,started_at=stamp,completed_at=stamp,generation=0))
            db.flush()
            db.add(ResearchStepRecord(run_id=run_id,capability='market.quote',ordinal=1,status='success',code=None,
                started_at=stamp,completed_at=stamp,result=result))
            row = ReportRecord(id=report_id,run_id=run_id,version=1,symbol='AAPL.US',mode='fixed',status='completed',
                started_at=stamp,completed_at=stamp,document=document,requests_started=0,request_uncertain=False)
            db.add(row); db.flush()
            opinion = service.freeze(db,row,'1w','authored-history'); identities.append(opinion.id)
    return identities
