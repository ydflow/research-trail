"""Bounded projection of actual successful steps, never model-created fact values.

Folio core/research.ts EvidenceRef is the conceptual reference (fixed ba5dcdfd).
The Python JSON-pointer/hash binding is new; no regex metric extraction from prose.
"""
import hashlib
import json
from .report_contracts import ReportEvidence, ReportGap
from .research_strategies import COMPREHENSIVE
from .research_store import ResearchError

def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)

def result_hash(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()

def resolve_pointer(value, pointer):
    for part in pointer.split('/')[1:]:
        part=part.replace('~1','/').replace('~0','~')
        value=value[int(part)] if isinstance(value,list) else value[part]
    return value

def packet(store, identity):
    run=store.get(identity)
    if run.status=='fetching': raise ResearchError('COLLECTION_ACTIVE')
    if not run.succeeded: raise ResearchError('NO_COLLECTED_DATA')
    facts=[]; gaps=[]
    for step in run.steps:
        cap=step.capability
        if step.status!='success':
            gaps.append(ReportGap(scope='capability',key=cap,code=step.code or step.status.upper())); continue
        saved=store.data(identity,cap).result.model_dump(mode='json'); digest=result_hash(saved)
        selected=[]; inspected=0; truncated=False
        def walk(value,path,depth=0):
            nonlocal inspected,truncated
            inspected+=1
            if inspected>4096 or depth>16 or len(selected)>=24 or len(path)>600:
                truncated=True; return
            if value is None or value=='' or isinstance(value,(dict,list)) and not value:
                if len(gaps)<512: gaps.append(ReportGap(scope='field',key=cap+path,code='FIELD_MISSING'))
            elif isinstance(value,dict):
                for key,child in value.items():
                    walk(child,path+'/'+str(key).replace('~','~0').replace('/','~1'),depth+1)
                    if inspected>4096: break
            elif isinstance(value,list):
                for i,child in enumerate(value):
                    walk(child,path+'/'+str(i),depth+1)
                    if inspected>4096: break
            elif isinstance(value,(str,int,float,bool)):
                if isinstance(value,str) and (len(value)>256 or any(ord(c)<32 for c in value)):
                    truncated=True; return
                reference='ev-'+hashlib.sha256(f'{identity}\0{cap}\0{step.ordinal}\0{path}'.encode()).hexdigest()[:24]
                selected.append(ReportEvidence(id=reference,run_id=identity,capability=cap,ordinal=step.ordinal,
                    pointer=path,value=value,result_hash=digest,provider=saved['provider'],source_mode=saved['provenance']['mode'],
                    fetched_at=saved['provenance']['fetched_at']))
        walk(saved['data'],'')
        facts.extend(selected)
        if truncated: gaps.append(ReportGap(scope='projection',key=cap,code='FACT_PROJECTION_LIMIT'))
        if not selected: gaps.append(ReportGap(scope='field',key=cap,code='NO_USABLE_FACT'))
    planned={s.capability for s in run.steps}
    gaps.extend(ReportGap(scope='capability',key=c,code='NOT_PLANNED') for c in COMPREHENSIVE if c not in planned)
    gaps.extend(ReportGap(scope='skill',key=s.id,code=s.code) for s in run.plan.skills if s.status!='ready')
    if not facts: raise ResearchError('NO_USABLE_FACT')
    return dict(symbol=run.symbol,strategy=run.strategy,source_mode=run.mode,provider=run.provider,
        collection_status=run.status,source_run_id=run.id,evidence=facts,gaps=gaps)

def original(store, fact):
    run=store.get(fact.run_id)
    step=next((s for s in run.steps if s.capability==fact.capability),None)
    if not step or step.status!='success' or step.ordinal!=fact.ordinal: raise ResearchError('EVIDENCE_CHANGED')
    result=store.data(fact.run_id,fact.capability).result
    try:
        if result_hash(result.model_dump(mode='json'))!=fact.result_hash or canonical(resolve_pointer(result.data,fact.pointer))!=canonical(fact.value):
            raise ValueError()
    except Exception: raise ResearchError('EVIDENCE_CHANGED') from None
    return dict(evidence=fact,step_started_at=step.started_at.isoformat(),step_completed_at=step.completed_at.isoformat(),result=result)
