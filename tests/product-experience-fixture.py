"""Test-process injection only: real-mode SDK boundary, no network or OS secrets."""
import json
import os
import threading
call_lock = threading.Lock()
from dataclasses import replace
from pathlib import Path
from research_trail.provider_service import ProviderService, authored_data
from research_trail.provider_settings import ProviderSettings
from research_trail.provider_errors import ProviderFault
from research_trail.chart_fixtures import authored_chart_data

assert os.environ.get('RESEARCH_TRAIL_OFFLINE') == '1'
database = Path(os.environ['RESEARCH_TRAIL_DB_PATH'])
assert database.resolve().is_relative_to(Path(os.environ['TEMP']).resolve())
original_snapshot = ProviderSettings.snapshot
original_init = ProviderService.__init__

def snapshot(self, provider):
    return replace(original_snapshot(self, provider), credentials=dict(app_key='test-key', app_secret='test-secret', access_token='test-token'))

def execute(snapshot, query, stop):
    with call_lock, Path(str(database) + '.calls').open('a', encoding='utf-8') as output:
        output.write(json.dumps(dict(symbol=query.symbol, capability=query.capability, period=query.period, mode=query.mode)) + '\n')
    if Path(str(database) + '.fail').exists():
        raise ProviderFault('NETWORK_ERROR')
    if query.capability == 'market.kline':
        return authored_chart_data(query)
    data = authored_data(query)
    if query.capability == 'market.quote':
        data['last_price'] = 321.23
    if query.capability == 'research.news':
        data = [dict(data[0], id=f'news-{i}', description='离线受控新闻摘要。' * 100) for i in range(20)]
    if query.capability == 'company.financials':
        for group in data['list'].values():
            for indicator in group['indicators']:
                indicator['accounts'][0]['values'] *= 40
    return data

def initialize(self, *args, **kwargs):
    kwargs['sdk_executor'] = execute
    kwargs['cli_executor'] = execute
    original_init(self, *args, **kwargs)

ProviderSettings.snapshot = snapshot
ProviderService.__init__ = initialize

