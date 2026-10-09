import json
import threading
import time
import httpx
import pytest
from research_trail.openai_provider import ModelConfiguration, OpenAIModelProvider, ModelError

@pytest.mark.parametrize('host,effort,expected', [
    ('https://example.com/v1','default',{}),
    ('https://example.com/v1','low',{'reasoning_effort':'low'}),
    ('https://api.deepseek.com','none',{'thinking':{'type':'disabled'}}),
])
def test_reasoning_parameters_are_explicit_and_default_keeps_existing_protocol(host,effort,expected):
    sent=[]
    def respond(request):
        sent.append(json.loads(request.content))
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':'hello'}}]})
    provider=OpenAIModelProvider(lambda:ModelConfiguration(host,'synthetic-model','synthetic-key',30,effort),transport=httpx.MockTransport(respond))
    provider.complete([{'role':'user','content':'hello'}],[],threading.Event(),time.monotonic()+10)
    options={k:v for k,v in sent[0].items() if k in ('reasoning_effort','thinking')}
    assert options==expected

def test_unsupported_deepseek_effort_rejects_before_any_request():
    provider=OpenAIModelProvider(lambda:ModelConfiguration('https://api.deepseek.com','synthetic','synthetic-key',30,'low'))
    with pytest.raises(ModelError) as error:
        provider.complete([],[],threading.Event(),time.monotonic()+10)
    assert error.value.error.code=='MODEL_REASONING_UNSUPPORTED'
    assert provider.requests_started==0
