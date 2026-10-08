"""CLI used by deterministic offline CI. A fresh Temp DB; no remote exporter."""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import time
from uuid import uuid4
from .database import Database
from .evaluation import EvaluationService
from .evaluation_cases import CASES
from .evaluation_contracts import ExperimentInput

def main():
    if os.environ.get('RESEARCH_TRAIL_OFFLINE')!='1':raise SystemExit('Offline evaluation requires RESEARCH_TRAIL_OFFLINE=1')
    with TemporaryDirectory(prefix='research-trail-ci-eval-') as work:
        db=Database(Path(work)/'evaluation.sqlite3');db.migrate();service=EvaluationService(db)
        try:
            view=service.create(ExperimentInput(request_id=uuid4(),name='ResearchTrail deterministic CI',case_ids=[c.id for c in CASES]))
            service.start(view.id);deadline=time.monotonic()+30
            while time.monotonic()<deadline:
                view=service.get(view.id)
                if view.status!='running':break
                time.sleep(.02)
            if view.status!='passed' or view.validity!='valid' or view.score!=1:raise RuntimeError('Offline evaluation failed: '+json.dumps(view.failure_counts))
            print(json.dumps({'suite':'research-trail-own-v1','cases':len(view.cases),'counts':view.counts,'score':view.score,'validity':view.validity,'model_requests':0,'external_uploads':0},ensure_ascii=False))
        finally:service.close();db.close()

if __name__=='__main__':main()
