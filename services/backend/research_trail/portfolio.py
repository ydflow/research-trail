"""Python local portfolios, bounded transient CSV drafts, transactional imports and undo.

Folio ba5dcdfd portfolio import/account flows informed the boundaries; no TS business code imported.
Real account snapshots remain in memory; only a local alias is persisted for the configured OpenAPI account.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import threading
import time
from uuid import uuid4
from sqlalchemy import select, func
from .models import PortfolioAccountRecord, PortfolioRecord, PortfolioImportRecord
from .portfolio_contracts import (PortfolioInfo, PortfolioView, PortfolioSnapshot, HoldingInput, CashInput,
    ImportPreview, ImportIssue)
from .portfolio_csv import parse_csv, fingerprint
from .portfolio_calculate import calculate
from .provider_contracts import ReadQuery

class PortfolioError(Exception): pass

def now(): return datetime.now(timezone.utc).isoformat()

def demo():
    return PortfolioSnapshot(holdings=[HoldingInput(symbol='AAPL.US',currency='USD',quantity='2',cost_price='100',market_price='120')],
        cash=[CashInput(currency='USD',amount='100')])

LIMITS=['不同币种分别计算；没有可靠汇率，不提供跨币种合计。',
    '成本=数量×成本单价；市值=数量×估值单价；未实现盈亏=市值−成本；资产=市值+现金。',
    '未包含交易费、税、已实现收益或收益率时间序列；缺失输入保留为—。']

class PortfolioService:
    def __init__(self,database,providers,*,clock=time.monotonic):
        self.database=database; self.providers=providers; self.clock=clock
        self.lock=threading.RLock(); self.refresh_lock=threading.Lock()
        self.drafts={}; self.real={}
        with database.write() as s:
            if s.scalar(select(func.count()).select_from(PortfolioRecord))==0:
                for name,kind in [('CSV组合','manual'),('手算模拟组合','simulated'),('Longbridge只读组合','read_only')]:
                    self._create(s,name,kind)

    def close(self):
        with self.lock: self.drafts.clear(); self.real.clear()

    def _create(self,s,name,kind):
        aid=str(uuid4()); pid=str(uuid4())
        s.add(PortfolioAccountRecord(id=aid,name=('本机只读账户别名' if kind=='read_only' else name+'账户'),kind=kind))
        s.flush()
        s.add(PortfolioRecord(id=pid,account_id=aid,name=name,snapshot=(demo() if kind=='simulated' else PortfolioSnapshot()).model_dump(),
            revision=0,updated_at=None,current_batch=None))
        s.flush(); return pid

    def _records(self,s,pid):
        p=s.get(PortfolioRecord,pid)
        if p is None: raise PortfolioError('组合不存在。')
        return p,s.get(PortfolioAccountRecord,p.account_id)

    def _info(self,p,a):
        return PortfolioInfo(id=p.id,name=p.name,account_id=a.id,account_name=a.name,kind=a.kind)

    def list(self):
        with self.database.sessions() as s:
            return [self._info(p,s.get(PortfolioAccountRecord,p.account_id)) for p in s.scalars(select(PortfolioRecord).order_by(PortfolioRecord.name,PortfolioRecord.id))]

    def create(self,body):
        with self.database.write() as s:
            if s.scalar(select(func.count()).select_from(PortfolioRecord))>=20: raise PortfolioError('最多20个组合。')
            if body.kind=='read_only' and s.scalar(select(func.count()).select_from(PortfolioAccountRecord).where(PortfolioAccountRecord.kind=='read_only')):
                raise PortfolioError('当前配置对应一个只读账户别名，不能猜测其他券商账户。')
            pid=self._create(s,body.name,body.kind)
        return self.view(pid)

    def _view(self,p,a,snapshot,*,status=None,provenance=None,code=None,message=None,updated_at=None,reported_net_assets=None,source=None):
        holdings,currencies=calculate(snapshot)
        incomplete=any(v.cost is None or v.market_value is None or v.cash is None for v in currencies)
        source=source or ('longbridge-account' if a.kind=='read_only' else 'authored-fixture' if a.kind=='simulated' and p.current_batch is None else 'csv-snapshot')
        return PortfolioView(**self._info(p,a).model_dump(),revision=p.revision,
            source=source,
            status=status or ('empty' if not currencies else 'partial' if incomplete else 'ready'),
            holdings=holdings,currencies=currencies,cash_rows=snapshot.cash,updated_at=updated_at or p.updated_at,
            reported_net_assets=reported_net_assets or [],
            market_time='2024-01-16T21:00:00+00:00' if source=='authored-fixture' else None,
            provenance=provenance or [],code=code,message=message,undo_batch=p.current_batch,
            limitations=LIMITS+[{'manual':'CSV单价仅为文件中的估值输入，不等于实时行情；导入替换整个快照。',
                'simulated':'模拟账户；初始持仓为自主编写的固定手算样例，CSV导入后估值来自文件；不代表真实账户。',
                'read_only':'仅映射本机配置的OpenAPI账户；身份未独立核验。账户数据不落库，重启后需显式查询；提供商净资产单独展示，SDK缺估值单价时不猜价格。'}[a.kind]])

    def view(self,pid):
        with self.database.sessions() as s:
            p,a=self._records(s,pid)
            if a.kind!='read_only': return self._view(p,a,PortfolioSnapshot.model_validate(p.snapshot))
            revision=self.providers.settings.profile('longbridge-account').revision
            with self.lock:
                saved=self.real.get(pid)
                if saved and saved[0]==revision: return saved[1].model_copy(deep=True)
            return self._view(p,a,PortfolioSnapshot(),status='unverified',message='尚未查询真实账户。')

    def _editable(self,s,pid):
        p,a=self._records(s,pid)
        if a.kind=='read_only': raise PortfolioError('只读账户不接受CSV或模拟持仓。')
        return p,a

    def _duplicate(self,s,pid,fp):
        return bool(s.scalar(select(PortfolioImportRecord.id).where(PortfolioImportRecord.portfolio_id==pid,
            PortfolioImportRecord.fingerprint==fp,PortfolioImportRecord.active==True)))

    def preview(self,body):
        snapshot,issues=parse_csv(body.csv_text); fp=fingerprint(snapshot)
        with self.lock, self.database.sessions() as s:
            p,a=self._editable(s,body.portfolio_id); duplicate=self._duplicate(s,p.id,fp)
            if duplicate: issues.append(ImportIssue(line=0,code='DUPLICATE_IMPORT',message='相同内容已经导入此组合。'))
            current=self.clock(); self.drafts={k:v for k,v in self.drafts.items() if v['expiry']>current}
            # Replace the same portfolio's unused draft; bound memory and avoid returning old private CSV.
            self.drafts={k:v for k,v in self.drafts.items() if v['pid']!=p.id}
            did=None
            if not issues:
                if len(self.drafts)>=8: raise PortfolioError('预览数量达到上限，请等待旧预览过期。')
                did=str(uuid4()); self.drafts[did]={'pid':p.id,'revision':p.revision,'snapshot':snapshot,
                    'fingerprint':fp,'expiry':current+600}
            return ImportPreview(portfolio_id=p.id,draft_id=did,revision=p.revision,can_import=not issues,
                duplicate=duplicate,issues=issues,snapshot=snapshot,valuation=self._view(p,a,snapshot,source='csv-snapshot').model_copy(update={'updated_at':None,'undo_batch':None}))

    def confirm(self,body):
        with self.lock, self.database.write() as s:
            p,_a=self._editable(s,body.portfolio_id); draft=self.drafts.get(body.draft_id)
            if not draft or draft['pid']!=p.id or draft['expiry']<=self.clock(): raise PortfolioError('预览不存在或已过期，请重新预览。')
            if p.revision!=draft['revision']: raise PortfolioError('组合已变化，请重新预览。')
            if self._duplicate(s,p.id,draft['fingerprint']): raise PortfolioError('相同内容已导入。')
            bid=str(uuid4())
            s.add(PortfolioImportRecord(id=bid,portfolio_id=p.id,fingerprint=draft['fingerprint'],
                before_snapshot=p.snapshot,previous_batch=p.current_batch,active=True))
            p.snapshot=draft['snapshot'].model_dump(); p.current_batch=bid; p.revision+=1; p.updated_at=now()
        with self.lock: self.drafts.pop(body.draft_id,None)
        return self.view(body.portfolio_id)

    def undo(self,body):
        with self.database.write() as s:
            p,_a=self._editable(s,body.portfolio_id)
            if p.current_batch!=body.batch_id: raise PortfolioError('只能撤销当前最新导入。')
            batch=s.get(PortfolioImportRecord,body.batch_id)
            if not batch or batch.portfolio_id!=p.id or not batch.active: raise PortfolioError('导入记录不可撤销。')
            p.snapshot=batch.before_snapshot; p.current_batch=batch.previous_batch; p.revision+=1; p.updated_at=now()
            batch.active=False
        return self.view(body.portfolio_id)

    def refresh(self,pid):
        # Serialize refreshes so an older completion cannot replace a later query.
        with self.refresh_lock:
            with self.database.sessions() as s:
                p,a=self._records(s,pid)
                if a.kind!='read_only': raise PortfolioError('只有只读账户可查询真实账户。')
                revision=self.providers.settings.profile('longbridge-account').revision
                with ThreadPoolExecutor(max_workers=2) as pool:
                    futures=[pool.submit(self.providers.query,'longbridge-account',ReadQuery(capability=cap,mode='real',use_cache=False))
                        for cap in ('account.positions','account.assets')]
                    results=[f.result() for f in futures]
                failed=next((r for r in results if not r.ok),None)
                if failed:
                    result=self._view(p,a,PortfolioSnapshot(),status=failed.state if failed.state in ('restricted','unconfigured') else 'failed',
                        code=failed.code,message=failed.message)
                elif revision!=self.providers.settings.profile('longbridge-account').revision:
                    result=self._view(p,a,PortfolioSnapshot(),status='failed',code='CONFIG_CHANGED',message='查询期间账户配置已变化，请重新查询。')
                else:
                    try:
                        hs=[]; cs=[]; reported=[]; keys=set()
                        if not all(isinstance(r.data,list) for r in results) or sum(len(r.data) for r in results)>100: raise ValueError()
                        for row in results[0].data:
                            # Public adapter DTOs may be numeric; validate finite/positive precision using the same strict contract.
                            h=HoldingInput(symbol=row['symbol'],currency=row['currency'],quantity=str(row['quantity']),
                                cost_price=str(row['cost_price']) if row.get('cost_price') is not None else None,
                                market_price=None)
                            key=(h.symbol,h.currency)
                            if key in keys: raise ValueError()  # Ambiguous duplicate account channels: do not guess a merge.
                            keys.add(key); hs.append(h)
                        for row in results[1].data:
                            c=CashInput(currency=row['currency'],amount=str(row['total_cash']) if row.get('total_cash') is not None else None)
                            if c.currency in {v.currency for v in cs}: raise ValueError()
                            cs.append(c)
                            reported.append(CashInput(currency=c.currency,amount=str(row['net_assets']) if row.get('net_assets') is not None else None))
                        result=self._view(p,a,PortfolioSnapshot(holdings=hs,cash=cs),provenance=[r.provenance for r in results],updated_at=now(),reported_net_assets=reported)
                    except (ValueError,KeyError,TypeError):
                        result=self._view(p,a,PortfolioSnapshot(),status='failed',code='INVALID_RESPONSE',message='账户响应缺失必需字段或重复含糊，未猜测或混入模拟数据。')
                with self.lock: self.real[pid]=(revision,result)
                return result.model_copy(deep=True)
