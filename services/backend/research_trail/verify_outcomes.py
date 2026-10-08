"""Reproducible offline investment-observation acceptance, separate from Eval."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4
from .database import Database
from .outcomes import OutcomeService
from .outcome_contracts import OutcomeRequest, PerformanceQuery
from .outcome_fixtures import AS_OF, HistoricalProvider, seed_history

def verify(path):
    db = Database(path); db.migrate()
    try:
        provider = HistoricalProvider()
        service = OutcomeService(db,provider,None,clock=lambda:AS_OF)
        ids = seed_history(service)
        for index, identity in enumerate(ids):
            provider.positive = index < 18
            result = service.evaluate(identity,OutcomeRequest(request_id=str(uuid4())))
            assert result.status == 'evaluated' and result.return_percent == ('10.0' if index < 18 else '-10.0')
        snapshot = service.performance(PerformanceQuery(horizon='1w',source_mode='simulated',analysis_mode='fixed',origin='authored-history'))
        for row in snapshot.rows:
            assert row.samples == 30 and row.direction_hit_rate == '0.6' and row.average_return == '2.0'
            assert row.adaptive_weight == '1.05' and row.sample_confidence == '0.3'
        calls = len(provider.calls)
        restarted = OutcomeService(db,provider,None,clock=lambda:AS_OF)
        for identity in ids: assert restarted.evaluate(identity,OutcomeRequest(request_id=str(uuid4()))).status == 'evaluated'
        assert len(provider.calls) == calls == 30
        service.close()
        return [dict(kind=r.kind,key=r.key,samples=r.samples,hit=r.direction_hit_rate,mean=r.average_return,weight=r.adaptive_weight) for r in snapshot.rows]
    finally: db.close()

def main():
    with TemporaryDirectory(prefix='research-trail-own-outcomes-') as temp:
        first = verify(Path(temp)/'first.sqlite3'); second = verify(Path(temp)/'second.sqlite3')
        assert first == second
        print(json.dumps(dict(suite='research-trail-own-outcomes-v1',authored_samples=30,reproducible=True,
            source='simulated/authored-history',rows=first,real_model_requests=0,real_provider_requests=0),ensure_ascii=False))

if __name__ == '__main__': main()
