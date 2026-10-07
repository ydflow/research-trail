"""Explicit single real LLM report request on newly collected simulated public data.

Reads configured model/key through the existing readonly validation helper. Writes
only a new temporary database/export; never daily user reports, accounts or keys.
Without --run: configuration check only. No retry and no fixed fallback.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from tempfile import mkdtemp
import time
from .database import default_database_path
from .verify_live import read_configuration
from .openai_provider import OpenAIModelProvider, ModelError
from .app import create_app
from .report_contracts import ReportGenerate
from .report_output import markdown

def verify(path,execute=False):
    try: config,timeout=read_configuration(Path(path).resolve())
    except ModelError as error: return dict(real_validation='not_executed',reason=error.error.code,requests_started=0)
    if not execute: return dict(real_validation='not_executed',reason='CONFIGURED_REQUIRES_EXPLICIT_RUN',requests_started=0)
    from fastapi.testclient import TestClient
    directory=Path(mkdtemp(prefix='research-trail-report-live-qa-'))
    token='report-validation-isolated-token-'*2
    app=create_app(token,database_path=directory/'validation.sqlite3')
    with TestClient(app,headers={'X-ResearchTrail-Token':token}) as c:
        response=c.post('/research/runs',json={'symbol':'AAPL.US','strategy':'value','mode':'simulated'})
        identity=response.json()['id']; deadline=time.monotonic()+25
        while time.monotonic()<deadline:
            run=app.state.research.store.get(identity)
            if run.status!='fetching': break
            time.sleep(0.05)
        model=OpenAIModelProvider(config)
        app.state.reports.model_factory=lambda:model
        app.state.reports.timeout_seconds=min(timeout,120)
        job=app.state.reports.start(identity,ReportGenerate(mode='real')); deadline=time.monotonic()+timeout+2
        while time.monotonic()<deadline:
            job=app.state.reports.store.get(job.id)
            if job.status!='generating': break
            time.sleep(0.05)
        passed=job.status=='completed' and model.requests_started==1
        verified=0; kinds=[]; digest=None
        if passed:
            doc=job.document
            for fact in doc.evidence: app.state.reports.evidence(job.id,fact.id); verified+=1
            output=markdown(job)
            (directory/output.filename).write_text(output.content,encoding='utf-8')
            digest=sha256(output.content.encode()).hexdigest()
            groups=[doc.synthesis.summary,doc.synthesis.risks,doc.synthesis.catalysts,doc.synthesis.bull_case,doc.synthesis.bear_case]+[s.claims for s in doc.synthesis.sections]
            kinds=sorted({claim.kind for group in groups for claim in group})
        proof=dict(real_validation='passed' if passed else 'failed',run_status=job.status,reason=job.code,
            requests_started=model.requests_started,protocol=model.last_response_info,market_source='simulated',report_id=job.id,
            collection_id=identity,verified_evidence=verified,claim_kinds=kinds,markdown_sha256=digest,evidence_directory=str(directory))
        if job.status=='failed':
            draft=getattr(app.state.reports.work.synthesizer,'last_content',None)
            if isinstance(draft,str):
                # Treat this local diagnostic as private; never upload as source or evidence.
                (directory/'rejected-response.txt').write_text(draft.replace(config.api_key,'[已脱敏]'),encoding='utf-8')
        if job.code=='UNSUPPORTED_NUMERIC_CLAIM':
            # Diagnostic locations only: never output rejected prose, numbers or credentials.
            from .report_synthesis import normalize_prose, prose
            from .report_contracts import ReportSynthesis
            invalid=[]
            try:
                syn=ReportSynthesis.model_validate(app.state.reports.work.output)
                # Private local debug artifact, schema bounded and known key removed.
                # Never a successful report or tracked source; inspect before sharing.
                (directory/'rejected-draft.json').write_text(syn.model_dump_json(indent=2).replace(config.api_key,'[已脱敏]'),encoding='utf-8')
                groups={k:getattr(syn,k) for k in ('summary','risks','catalysts','bull_case','bear_case')}
                for n,s in enumerate(syn.sections): groups[f'sections[{n}]']=s.claims
                for group,claims in groups.items():
                    for n,claim in enumerate(claims):
                        if claim.kind!='fact':
                            try: prose(normalize_prose(claim.text))
                            except Exception: invalid.append(f'{group}[{n}].text')
                for n,s in enumerate(syn.sections):
                    try: prose(normalize_prose(s.title))
                    except Exception: invalid.append(f'sections[{n}].title')
            except Exception: pass
            proof['rejected_fields']=invalid
        (directory/'proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return proof

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',action='store_true',help='explicitly permit one real report request')
    args=parser.parse_args()
    result=verify(default_database_path(),args.run)
    print(json.dumps(result,ensure_ascii=False))
    return 0 if result['real_validation']!='failed' else 1

if __name__=='__main__': raise SystemExit(main())
