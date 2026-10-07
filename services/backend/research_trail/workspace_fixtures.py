"""Offline acceptance injection only. Does not select real mode or bypass provider errors."""
from .provider_errors import ProviderFault
from .provider_service import authored_data

def fixture_executor(case):
    import threading
    lock=threading.Lock(); valuation_count=0
    def execute(query):
        nonlocal valuation_count
        if case=='report-updated' and query.capability=='company.valuation':
            with lock: valuation_count+=1; count=valuation_count
            data=authored_data(query)
            data['pe_ttm_ratio']=20 if count==1 else 25
            return data
        if case=='research-partial' and query.capability=='company.financials': raise ProviderFault('NETWORK_ERROR',retryable=True)
        if case=='research-delayed' and query.capability=='company.profile':
            import time
            time.sleep(2)
        if case=='delayed' and query.symbol=='AAPL.US' and query.capability=='company.profile':
            import time
            time.sleep(0.8)
        if case=='failure': raise ProviderFault('NETWORK_ERROR',retryable=True)
        if case=='missing':
            if query.capability in ('market.kline','research.news'): return []
            if query.capability=='company.financials': return {'list':{}}
            if query.capability=='market.status': return {'market_time':[]}
            return {}
        return authored_data(query)
    return execute
