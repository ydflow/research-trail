"""Explicit selection, same read contracts, per-capability health and revision-bound memory cache."""
from datetime import datetime, timezone
import json
import threading
import time
from .market import FixtureMarketProvider, UnknownSymbolError
from .provider_contracts import (MARKET_CAPABILITIES, ACCOUNT_CAPABILITIES, MASSIVE_CAPABILITIES,
    ReadQuery, CapabilityView, Provenance, ProviderSuccess, ProviderFailure)
from .provider_errors import ProviderFault, classify
from .provider_normalize import public_json
from .provider_process import sdk_process
from .provider_cli import execute_cli
from .provider_massive import MassiveProvider

SUPPORTED = {'longbridge':MARKET_CAPABILITIES,'longbridge-account':ACCOUNT_CAPABILITIES,'massive':MASSIVE_CAPABILITIES}
CLI_CAPABILITIES = ('account.accounts','account.portfolio')

def authored_data(query):
    if query.symbol and not query.capability.startswith('account.'):
        FixtureMarketProvider().snapshot(query.symbol)  # Unknown securities have no invented examples.
    if query.capability in ('market.quote','market.kline'):
        data=FixtureMarketProvider().snapshot(query.symbol)
        return data.quote.model_dump(mode='json') if query.capability=='market.quote' else [b.model_dump() for b in data.klines][-query.count:]
    symbol=query.symbol or 'AAPL.US'
    samples={
        'market.intraday':[{'timestamp':'2024-01-16T21:00:00+00:00','price':189.43,'volume':1900000}],
        'market.depth':{'bids':[{'position':1,'price':189.42,'volume':10}],'asks':[{'position':1,'price':189.44,'volume':10}]},
        'market.trades':[{'timestamp':'2024-01-16T21:00:00+00:00','price':189.43,'volume':1}],
        'market.capitalFlow':[{'timestamp':'2024-01-16T21:00:00+00:00','inflow':100}],
        'market.sentiment':{'market':query.market,'temperature':50},
        'market.status':{'market_time':[{'market':query.market,'status':'Closed','timestamp':'2024-01-16T21:00:00+00:00'}]},
        'company.profile':{'symbol':symbol,'name':next((s.name for s in FixtureMarketProvider().symbols() if s.symbol==symbol),'模拟证券'),'currency':'USD','exchange':'模拟交易所',
            'description':'自主编写的证券资料样例，不代表公司真实财务信息。','eps_ttm':1.5,'bps':None,'total_shares':1000},
        'company.valuation':{'symbol':symbol,'pe_ttm_ratio':20,'pb_ratio':2},
        'company.financials':{'list':{k:{'indicators':[{'currency':'USD','title':'自主编写的模拟报表',
            'accounts':[{'name':label,'field':field,'values':[{'year':2023,'period':'Annual','fp_end':'2023-12-31','value':value}]}]}]}
            for k,label,field,value in [('IS','模拟营业收入','revenue',1000),('BS','模拟总资产','assets',2000),('CF','模拟经营现金流','operating_cash_flow',0)] if query.kind in ('ALL',k)}},
        'company.dividends':{'list':[{'currency':'USD','amount':1,'date':'2024-01-16'}]},
        'company.earnings':{'items':[{'year':2024,'eps':1}]},
        'company.ratings':{'latest':{'rating':'测试评级'},'summary':{'count':1}},
        'research.news':[{'id':'authored-news-1','title':f'{symbol} 自主编写的模拟新闻','description':'示例正文，并非真实报道。',
            'url':'https://example.com/research-trail-simulated-news?symbol='+symbol,
            'source':'模拟来源（示例链接）','published_at':'2024-01-16T21:00:00+00:00'}],
        'research.events':{'date':'2024-01-16','list':[{'title':'模拟事件'}]},
        'account.accounts':[{'id':'authored-test-account','name':'模拟账户','region':'global'}],
        'account.portfolio':{'base_currency':'USD','total_assets':None,'accounts':[],'holdings':[]},
        'account.positions':[{'symbol':symbol,'name':'模拟持仓','currency':'USD','quantity':2,'available_quantity':2,
                              'cost_price':100,'market_price':None,'market_value':None}],
        'account.assets':[{'currency':'USD','net_assets':None,'total_cash':100,'cash_infos':[]}],
        'account.cashFlow':[{'timestamp':'2024-01-16T21:00:00+00:00','currency':'USD','amount':10,'flow_name':'模拟流水'}],
    }
    return samples[query.capability]

def market_time(data):
    value = (data[-1] if data else {}) if isinstance(data,list) else data
    value = value.get('timestamp',value.get('market_time')) if isinstance(value,dict) else None
    if value is None or isinstance(value,(dict,list)): return None
    if isinstance(value,bool): raise ProviderFault('INVALID_RESPONSE')
    try:
        if isinstance(value,str) and not value.isdigit():
            result=datetime.fromisoformat(value.replace('Z','+00:00'))
            if result.tzinfo is None: raise ValueError()
            return result.astimezone(timezone.utc)
        value=float(value)
        if value>1e17: value/=1e9
        elif value>1e11: value/=1000
        return datetime.fromtimestamp(value,timezone.utc)
    except Exception: raise ProviderFault('INVALID_RESPONSE') from None

class ProviderService:
    def __init__(self,settings,*,sdk_executor=None,massive_transport=None,cli_executor=None,clock=time.monotonic,simulated_executor=None):
        self.settings=settings
        self.sdk_executor=sdk_executor or sdk_process
        self.cli_executor=cli_executor or execute_cli
        self.massive=MassiveProvider(massive_transport) if massive_transport is not None else None
        self.simulated_executor=simulated_executor or authored_data
        self.clock=clock; self.stop=threading.Event(); self.lock=threading.RLock()
        self.cache={}; self.health={}; self.generations={p:0 for p in SUPPORTED}

    def invalidate(self, provider):
        with self.lock:
            self.generations[provider] += 1
            self.cache = {k:v for k,v in self.cache.items() if k[0]!=provider}
            self.health = {k:v for k,v in self.health.items() if k[0]!=provider}

    def close(self):
        self.stop.set()
        with self.lock: self.cache.clear()

    def capabilities(self):
        profiles={p.provider:p.revision for p in self.settings.profiles()}
        with self.lock:
            return [CapabilityView(provider=p,capability=c,transport='http' if p=='massive' else 'cli' if c in CLI_CAPABILITIES else 'sdk',
                    **self.health.get((p,c,profiles[p]),{})) for p,capabilities in SUPPORTED.items() for c in capabilities]

    def query(self,provider,query):
        query=ReadQuery.model_validate(query.model_dump())
        cap=query.capability; revision=0
        with self.lock: generation=self.generations.get(provider,0)
        try:
            if provider not in SUPPORTED or cap not in SUPPORTED[provider]: raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')
            if self.stop.is_set(): raise ProviderFault('CANCELLED','cancelled')
            cached=False; transport='fixture'; config=None; secrets=()
            if query.mode=='simulated':
                revision=self.settings.profile(provider).revision
                try: data=self.simulated_executor(query)
                except UnknownSymbolError: raise ProviderFault('NO_DATA') from None
            else:
                snapshot=self.settings.snapshot(provider); config=snapshot.configuration; revision=snapshot.revision
                secrets=tuple(snapshot.credentials.values())
                cli = cap in CLI_CAPABILITIES or (cap=='research.events' and (query.symbol is not None or query.event_type=='financial')) or (cap=='company.financials' and query.report not in (None,'annual','interim','quarter'))
                if not cli:
                    expected={'api_key'} if provider=='massive' else {'app_key','app_secret','access_token'}
                    if not snapshot.credentials: raise ProviderFault('CREDENTIAL_MISSING','unconfigured')
                    if set(snapshot.credentials)!=expected: raise ProviderFault('CREDENTIAL_INVALID','unconfigured')
                key=(provider,generation,revision,json.dumps(query.model_dump(mode='json',exclude={'use_cache'}),sort_keys=True))
                if not cap.startswith('account.') and query.use_cache and config.cache_ttl_seconds:
                    with self.lock:
                        entry=self.cache.get(key)
                        if entry and self.clock()<entry[0]:
                            result=entry[1].model_copy(deep=True)
                            result.provenance.cached=True; result.provenance.served_at=datetime.now(timezone.utc)
                            return result
                transport='cli' if cli else 'http' if provider=='massive' else 'sdk'
                if cli: data=self.cli_executor(snapshot,query,self.stop)
                elif provider=='massive' and self.massive: data=self.massive.execute(snapshot,query,self.stop)
                else: data=self.sdk_executor(snapshot,query,self.stop)
            if self.stop.is_set(): raise ProviderFault('CANCELLED','cancelled')
            data=public_json(data,secrets)
            if len(json.dumps(data,ensure_ascii=False,allow_nan=False).encode())>256*1024: raise ProviderFault('RESPONSE_LIMIT')
            now=datetime.now(timezone.utc)
            historical=cap=='market.kline'
            timing='historical' if historical else config.timeliness if config else 'historical'
            basis='fixture' if query.mode=='simulated' else 'historical-request' if historical else 'user-declared' if timing!='unknown' else 'unknown'
            labels={'unknown':'真实数据（延迟未知）','realtime':'真实数据','delayed':'延迟行情','historical':'历史行情'}
            result=ProviderSuccess(provider=provider,capability=cap,data=data,provenance=Provenance(provider=provider,
                transport=transport,mode=query.mode,data_label='模拟数据' if query.mode=='simulated' else
                    '真实数据' if cap.startswith('account.') else labels[timing],timeliness=timing,timeliness_basis=basis,
                fetched_at=now,served_at=now,market_time=market_time(data),
                permission='unknown' if query.mode=='simulated' else 'request-succeeded',
                credential_source='none' if query.mode=='simulated' else 'external-cli-session' if transport=='cli' else 'system-store'))
            if query.mode=='real' and not cap.startswith('account.') and config.cache_ttl_seconds:
                with self.lock:
                    if generation==self.generations[provider]:
                        if len(self.cache)>=128: self.cache.pop(next(iter(self.cache)))
                        self.cache[key]=(self.clock()+config.cache_ttl_seconds,result.model_copy(deep=True))
            validation=query.mode
        except Exception as error:
            safe=classify(error)
            if provider in SUPPORTED and safe.code in ('CREDENTIAL_MISSING','CREDENTIAL_INVALID','VAULT_UNAVAILABLE'):
                self.invalidate(provider)
                with self.lock: generation=self.generations[provider]
            result=ProviderFailure(provider=provider,capability=cap,state=safe.state,code=safe.code,message=str(safe),retryable=safe.retryable)
            validation='restricted' if safe.state=='restricted' else 'unverified' if safe.state in ('unconfigured','disabled') else 'failed'
            try: revision=self.settings.profile(provider).revision
            except Exception: pass
        with self.lock:
            if generation==self.generations.get(provider,0):
                self.health[(provider,cap,revision)]={'validation':validation,'code':result.code if not result.ok else None,
                                                   'checked_at':datetime.now(timezone.utc)}
        return result
