"""All seven views use ProviderService. Up to four independent reads, no account or model calls."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from .provider_contracts import ReadQuery
from .provider_errors import ProviderFault
from .workspace_contracts import SecurityBlock, SecurityPage
from . import workspace_normalize as normalize

class SecurityWorkspace:
    def __init__(self,watchlist,providers):
        self.watchlist,self.providers=watchlist,providers

    def _block(self,body,symbol,cap,title):
        market={'SH':'CN','SZ':'CN','HAS':'CN'}.get(symbol.split('.')[-1],symbol.split('.')[-1])
        result=self.providers.query(body.provider,ReadQuery(capability=cap,mode=body.mode,
            symbol=None if cap=='market.status' else symbol,period=body.period,
            kind=body.kind if cap=='company.financials' else 'ALL',
            report=body.report if cap=='company.financials' else None,count=20,market=market))
        block=SecurityBlock(title=title,capability=cap,symbol=symbol,status='missing')
        if not result.ok:
            block.status='missing' if result.code=='NO_DATA' else result.state
            block.code=result.code; block.message=result.message
            return block
        block.provenance=result.provenance.model_copy(deep=True)
        try:
            data=result.data
            if isinstance(data,dict) and data.get('symbol') not in (None,symbol):
                raise ProviderFault('INVALID_RESPONSE')
            if cap in ('company.profile','company.valuation','market.quote'):
                block.metrics=normalize.metrics(cap,data)
                present=any(m.value is not None for m in block.metrics)
            elif cap=='market.kline':
                block.bars=normalize.bars(data); present=bool(block.bars)
            elif cap=='research.news':
                block.news=normalize.news(data); present=bool(block.news)
            elif cap=='company.financials':
                block.financials=normalize.financials(data); present=any(r.value is not None for r in block.financials)
            else:
                block.markets=normalize.statuses(data,market); present=any(r.status is not None for r in block.markets)
                # This page's market time is the selected market clock, never a quote timestamp.
                if len(block.markets)==1: block.provenance.market_time=block.markets[0].market_time
            block.status='ready' if present else 'missing'
        except ProviderFault as error:
            block=SecurityBlock(title=title,capability=cap,symbol=symbol,status=error.state,
                code=error.code,message=str(error),provenance=result.provenance)
        return block

    def page(self,body):
        state=self.watchlist.state(); symbol=body.symbol or state.active_symbol
        if body.view=='watchlist':
            requests=[(r.symbol,'market.quote',r.name) for r in state.entries[body.offset:body.offset+4]]
        elif symbol is None:
            requests=[]
        elif body.view=='overview':
            requests=[(symbol,'company.profile','证券资料'),(symbol,'company.valuation','估值指标')]
        else:
            cap,title={'quote':('market.quote','行情'),'kline':('market.kline','K线'),
                'financials':('company.financials','财务报表'),'news':('research.news','新闻'),
                'status':('market.status','市场状态')}[body.view]
            requests=[(symbol,cap,title)]
        requested_at=datetime.now(timezone.utc)
        with ThreadPoolExecutor(max_workers=4,thread_name_prefix='security-view') as pool:
            futures=[pool.submit(self._block,body,*r) for r in requests]
            blocks=[f.result() for f in futures]
        states=[b.status for b in blocks]
        status='ready' if states and all(s=='ready' for s in states) else 'missing' if not states or all(s=='missing' for s in states) else 'failed' if all(s not in ('ready','missing') for s in states) else 'partial'
        return SecurityPage(view=body.view,symbol=symbol,provider=body.provider,mode=body.mode,
            status=status,requested_at=requested_at,blocks=blocks)
