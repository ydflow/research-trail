"""Deterministic, explicit pi model bridge proof. No real endpoint/key/config reads."""
import argparse
import json
from pathlib import Path

import httpx

from .market import FixtureMarketProvider
from .model_provider import FakeModelProvider
from .openai_provider import OpenAIModelProvider, ModelConfiguration
from .pi_model_bridge import PiModelBridge
from .tools import market_tools


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=Path, required=True)
    args = parser.parse_args()
    requests = []
    def mock(request):
        body = json.loads(request.content)
        requests.append(body)
        if len(requests) == 1:
            assert body['messages'][-1] == dict(role='user', content='查询AAPL.US行情')
            message = dict(role='assistant', content=None, tool_calls=[dict(id='offline_quote', type='function',
                function=dict(name='market_quote', arguments='{"symbol":"AAPL.US"}'))])
        else:
            assert len(requests) == 2
            result = body['messages'][-1]
            assert result['role'] == 'tool' and result['tool_call_id'] == 'offline_quote'
            data = json.loads(result['content'])['data']
            assert data['source'] == 'fixture' and data['quote']['last_price'] == 189.43
            message = dict(role='assistant', content='AAPL.US 189.43 USD；fixture 模拟数据，非实时行情。')
        return httpx.Response(200, json=dict(choices=[dict(message=message, finish_reason='tool_calls' if len(requests)==1 else 'stop')]))
    mocked = OpenAIModelProvider(ModelConfiguration('https://offline.invalid/v1', 'offline-mock', 'offline-placeholder-not-real-key'),
        transport=httpx.MockTransport(mock))
    for label, model in [('FakeModelProvider/RuleDialog', FakeModelProvider()), ('OpenAIModelProvider/MockTransport', mocked)]:
        bridge = PiModelBridge(market_tools(FixtureMarketProvider()), model, node=args.node)
        events = []
        outcome = bridge.run('查询AAPL.US行情', lambda kind,payload: events.append(dict(type=kind,payload=payload)))
        print(json.dumps(dict(scenario=label,status=outcome.status,answer=outcome.answer,
            model_calls=bridge.model_calls,tool_executions=bridge.execution_count,proof=bridge.proof,events=events),ensure_ascii=False))
        if outcome.status != 'completed' or bridge.model_calls != 2 or bridge.execution_count != 1:
            raise SystemExit(1)
    assert mocked.requests_started == len(requests) == 2


if __name__ == '__main__': main()
