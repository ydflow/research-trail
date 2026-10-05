"""Three fixed Folio Massive capabilities over documented REST; header key only, no retries."""
from datetime import datetime, timedelta, timezone
import json
import httpx
from .provider_errors import ProviderFault
from .provider_normalize import number, public_json
from .provider_contracts import ReadQuery

class MassiveProvider:
    def __init__(self,transport=None): self.transport=transport

    def execute(self,snapshot,query,stop=None):
        query=ReadQuery.model_validate(query.model_dump())
        if not query.symbol or not query.symbol.endswith('.US'): raise ProviderFault('UNSUPPORTED_MARKET','unsupported')
        key=snapshot.credentials.get('api_key')
        if not key: raise ProviderFault('CREDENTIAL_MISSING','unconfigured')
        ticker=query.symbol[:-3]; cap=query.capability; params={}
        if cap=='market.quote': path='/v2/snapshot/locale/us/markets/stocks/tickers/'+ticker
        elif cap=='company.profile': path='/v3/reference/tickers/'+ticker
        elif cap=='market.kline':
            multiplier,timespan={'1m':(1,'minute'),'5m':(5,'minute'),'15m':(15,'minute'),
                '1h':(60,'minute'),'1d':(1,'day'),'1w':(1,'week')}[query.period]
            end=query.end or datetime.now(timezone.utc).date()
            start=query.start or end-timedelta(days=min(366,query.count*3))
            path=f'/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{start}/{end}'
            params={'adjusted':'false','sort':'desc','limit':query.count}
        else: raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')
        if stop and stop.is_set(): raise ProviderFault('CANCELLED','cancelled')
        try:
            with httpx.Client(timeout=snapshot.configuration.timeout_seconds,trust_env=False,follow_redirects=False,
                              transport=self.transport) as client:
                with client.stream('GET','https://api.massive.com'+path,params=params,
                                   headers={'Authorization':'Bearer '+key}) as response:
                    if response.status_code==401: raise ProviderFault('AUTH_FAILED')
                    if response.status_code==403: raise ProviderFault('ACCESS_DENIED','restricted')
                    if response.status_code==429: raise ProviderFault('RATE_LIMITED',retryable=True)
                    if response.status_code==404: raise ProviderFault('NO_DATA')
                    if response.status_code!=200: raise ProviderFault('PROVIDER_ERROR')
                    body=bytearray()
                    for chunk in response.iter_bytes():
                        if stop and stop.is_set(): raise ProviderFault('CANCELLED','cancelled')
                        body.extend(chunk)
                        if len(body)>256*1024: raise ProviderFault('RESPONSE_LIMIT')
                    try: raw=public_json(json.loads(body), (key,))
                    except ProviderFault: raise
                    except Exception: raise ProviderFault('INVALID_RESPONSE') from None
        except httpx.TimeoutException: raise ProviderFault('TIMEOUT','timed_out',True) from None
        except httpx.RequestError: raise ProviderFault('NETWORK_ERROR',retryable=True) from None
        if not isinstance(raw,dict): raise ProviderFault('INVALID_RESPONSE')
        if raw.get('status')=='NOT_AUTHORIZED': raise ProviderFault('ACCESS_DENIED','restricted')
        if raw.get('status')=='ERROR': raise ProviderFault('PROVIDER_ERROR')
        if cap=='market.quote':
            q=raw.get('ticker')
            if not isinstance(q,dict) or q.get('ticker')!=ticker: raise ProviderFault('INVALID_RESPONSE')
            trade,previous,day=q.get('lastTrade',{}),q.get('prevDay',{}),q.get('day',{})
            last,prev=number(trade.get('p')),number(previous.get('c'))
            if last is None or prev is None or not trade.get('t'): raise ProviderFault('NO_DATA')
            return {'symbol':query.symbol,'last_price':last,'previous_close':prev,'change':last-prev,
                'change_percent':(last-prev)/prev*100 if prev else None,
                'open':number(day.get('o')),'high':number(day.get('h')),'low':number(day.get('l')),
                'volume':number(day.get('v')),'timestamp':trade['t'],'price_basis':'last_trade'}
        if cap=='company.profile':
            p=raw.get('results')
            if not isinstance(p,dict) or p.get('ticker')!=ticker: raise ProviderFault('INVALID_RESPONSE')
            return {'symbol':query.symbol,**{k:p.get(k) for k in ('name','currency_name','primary_exchange','locale',
                'market','active','type','description','market_cap','total_employees','list_date')}}
        rows=raw.get('results')
        if not isinstance(rows,list) or not rows: raise ProviderFault('NO_DATA')
        if any(not isinstance(r,dict) or isinstance(r.get('t'),bool) or not isinstance(r.get('t'),int) or r['t']<=0 for r in rows):
            raise ProviderFault('INVALID_RESPONSE')
        result=[{'timestamp':r['t']//1000,**{name:number(r.get(key)) for name,key in
            [('open','o'),('high','h'),('low','l'),('close','c'),('volume','v')]}} for r in rows]
        if any(any(r[k] is None for k in ('open','high','low','close','volume')) or
               r['volume']<0 or not r['low']<=min(r['open'],r['close'])<=max(r['open'],r['close'])<=r['high'] for r in result):
            raise ProviderFault('INVALID_RESPONSE')
        result.sort(key=lambda r:r['timestamp'])
        if len(set(r['timestamp'] for r in result))!=len(result): raise ProviderFault('INVALID_RESPONSE')
        return result[-query.count:]
