"""Offline acceptance injection only. Does not select real mode or bypass provider errors."""
from .provider_errors import ProviderFault
from .provider_service import authored_data

def fixture_executor(case):
    def execute(query):
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
