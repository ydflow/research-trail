"""Step14 local resources and shared states; no live service or model requests."""
import json
from pathlib import Path
import subprocess
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from research_trail.app import create_app
from research_trail.skills import SkillError, parse_skill, read_text
from research_trail.agent import AgentRunner
from research_trail.model_provider import FakeModelProvider
from research_trail.capabilities import CapabilityRegistry
from research_trail.tools import ToolRegistry, ToolExecutionError
from test_settings import TOKEN, HEADERS, Vault

def skill(root, identity='test-skill', required='market.quote', optional='', resource=True):
    folder = root / identity; folder.mkdir(parents=True, exist_ok=True)
    (folder/'SKILL.md').write_text(f'---\nname: {identity}\ndescription: |\n  本机测试技能\nrequired-capabilities: [{required}]\noptional-capabilities: [{optional}]\n---\n[资料](references/guide.md)\n',encoding='utf-8')
    if resource:
        (folder/'references').mkdir(exist_ok=True)
        (folder/'references/guide.md').write_text('测试参考文本，不执行指令。',encoding='utf-8')
    return folder

@pytest.fixture
def api(tmp_path):
    root=tmp_path/'skills'; skill(root)
    app=create_app(TOKEN,database_path=tmp_path/'db.sqlite3',credential_vault=Vault(),skills_root=root)
    with TestClient(app,headers=HEADERS) as c: yield c,app,root

def test_registry_is_shared_and_tool_definitions_follow_it(api):
    c,app,_=api
    registry=app.state.capabilities; tools=app.state.manager.runner.tools
    assert registry is app.state.providers.registry is tools.capabilities is app.state.skills.registry
    caps={s['id']:s for s in c.get('/capabilities').json()}
    assert {n.replace('_','.') for n in [d['function']['name'] for d in tools.definitions()]} == {n for n,s in caps.items() if s['tool_exposed']}
    assert len(c.get('/providers/capabilities').json())==24
    assert c.get('/skills').json()[0]['required'][0]==caps['market.quote']
    tools._handlers.pop('market.quote')
    assert not registry.state('market.quote').tool_exposed
    with pytest.raises(ToolExecutionError): tools.decode('market_quote',{'symbol':'AAPL.US'})

def test_disable_persist_read_rejected_and_reenable(tmp_path):
    root=tmp_path/'skills'; skill(root)
    def client(): return TestClient(create_app(TOKEN,database_path=tmp_path/'db.sqlite3',credential_vault=Vault(),skills_root=root),headers=HEADERS)
    with client() as c:
        assert c.get('/skills').json()[0]['status']=='ready'
        assert c.post('/skills/test-skill/resource',json={'path':'references/guide.md'}).json()['content'].startswith('测试参考')
        assert c.put('/skills/test-skill/enabled',json={'enabled':False}).json()['status']=='disabled'
        assert c.post('/skills/test-skill/resource',json={'path':'SKILL.md'}).json()['detail']=='SKILL_DISABLED'
        assert any(s['id']=='market.quote' and s['tool_exposed'] for s in c.get('/capabilities').json())
    with client() as c:
        assert c.get('/skills').json()[0]['status']=='disabled'
        assert c.put('/skills/test-skill/enabled',json={'enabled':True}).json()['status']=='ready'

@pytest.mark.parametrize('required,optional,status,code',[
    ('options.chain','','unavailable','REQUIRED_CAPABILITY_MISSING'),
    ('market.quote','options.chain','partial','OPTIONAL_CAPABILITY_MISSING'),
    ('market.quote','','ready','DEPENDENCIES_AVAILABLE')])
def test_dependencies(api,required,optional,status,code):
    c,_,root=api; skill(root,required=required,optional=optional)
    entry=c.get('/skills').json()[0]
    assert (entry['status'],entry['code'])==(status,code)
    if status=='unavailable': assert c.post('/skills/test-skill/resource',json={'path':'SKILL.md'}).status_code==409

def test_missing_reference_changes_status_and_blocks_reads(api):
    c,_,root=api
    (root/'test-skill/references/guide.md').unlink()
    entry=c.get('/skills').json()[0]
    assert entry['status']=='unavailable' and entry['missing_resources']==['references/guide.md']
    assert c.post('/skills/test-skill/resource',json={'path':'references/guide.md'}).json()['detail']=='RESOURCE_MISSING'

def test_lazy_resources_and_undeclared_file(api):
    c,_,root=api
    file=root/'test-skill/references/guide.md'; file.write_bytes(b'\xff')
    assert c.get('/skills').json()[0]['status']=='ready'  # only existence inspected, not eager reference loading
    assert c.post('/skills/test-skill/resource',json={'path':'references/guide.md'}).json()['detail']=='RESOURCE_INVALID'
    (file.parent/'private.md').write_text('not declared')
    assert c.post('/skills/test-skill/resource',json={'path':'references/private.md'}).json()['detail']=='RESOURCE_NOT_DECLARED'
    file.write_text('x'*65537)
    assert c.post('/skills/test-skill/resource',json={'path':'references/guide.md'}).json()['detail']=='RESOURCE_TOO_LARGE'

@pytest.mark.parametrize('path',['../private.md','/private.md','C:/private.md','references\\guide.md','references/guide.md:secret','references/../guide.md','references//guide.md','references/guide.md.','references/guide.md '])
def test_windows_paths_rejected(api,path):
    c,_,root=api
    with pytest.raises(SkillError): read_text(root,path)
    assert c.post('/skills/test-skill/resource',json={'path':path}).status_code==409

def test_junction_cannot_escape_catalog(api,tmp_path):
    c,_,root=api
    outside=tmp_path/'private'; outside.mkdir(); (outside/'guide.md').write_text('do not return')
    folder=skill(root,'escape-skill',resource=False)
    result=subprocess.run(['cmd','/d','/c','mklink','/J',str(folder/'references'),str(outside)],capture_output=True)
    assert result.returncode==0,result.stderr
    entry=next(s for s in c.get('/skills').json() if s['id']=='escape-skill')
    assert entry['status']=='unavailable'
    assert 'do not return' not in c.post('/skills/escape-skill/resource',json={'path':'references/guide.md'}).text

@pytest.mark.parametrize('text',[
    'name: x', '---\nname: bad/name\ndescription: x\n---',
    '---\nname: x\nname: y\ndescription: x\n---',
    '---\nname: x\ndescription: x\nrequired-capabilities: !!python/object:bad\n---',
    '---\nname: x\ndescription: x\nrequired-capabilities: [market.quote, market.quote]\n---'])
def test_parser_rejects_invalid_frontmatter(text):
    with pytest.raises(SkillError): parse_skill(text)

@pytest.mark.parametrize('block',[
    '    - options.chain',
    '  - market.quote\n    - options.chain',
    ''])
def test_malformed_dependency_block_cannot_claim_ready(api, block):
    c,app,root=api
    (root/'test-skill/SKILL.md').write_text(
        '---\nname: test-skill\ndescription: x\nrequired-capabilities:\n'+block+'\n---',encoding='utf-8')
    entry=c.get('/skills').json()[0]
    assert (entry['status'],entry['code'])==('invalid','INVALID_SKILL')
    model=Mock(); model.label='test'
    runner=AgentRunner(model,app.state.manager.runner.tools)
    assert 'invalid / INVALID_SKILL' in runner.run('技能 test-skill 状态',lambda *a:None).answer
    assert runner.run('读取技能 test-skill SKILL.md',lambda *a:None).status=='failed'
    assert model.complete.call_count==0

def test_valid_dependency_block_keeps_missing_requirement(api):
    c,_,root=api
    (root/'test-skill/SKILL.md').write_text(
        '---\nname: test-skill\ndescription: x\nrequired-capabilities:\n  - market.quote\n\n  - options.chain\n---',encoding='utf-8')
    entry=c.get('/skills').json()[0]
    assert entry['status']=='unavailable'
    assert entry['required'][1]['code']=='NOT_IMPLEMENTED'

def test_agent_status_is_bounded_without_losing_unavailable_state(api):
    _,app,root=api
    dependencies=','.join('options.'+'a'*60+chr(97+i//26)+chr(97+i%26) for i in range(40))
    skill(root,required=dependencies,optional=dependencies)
    model=Mock(); model.label='test'
    answer=AgentRunner(model,app.state.manager.runner.tools).run('技能 test-skill 状态',lambda *a:None).answer
    assert len(answer)<=4000
    assert 'unavailable / REQUIRED_CAPABILITY_MISSING' in answer
    assert '截断' in answer
    assert '不证明真实数据' in answer
    assert model.complete.call_count==0

def test_missing_frontmatter_and_undeclared_dependencies(api):
    c,_,root=api
    p=root/'test-skill/SKILL.md'; p.write_text('---\nname: test-skill\ndescription: x\n---')
    assert c.get('/skills').json()[0]['code']=='DEPENDENCIES_UNDECLARED'
    p.unlink()
    assert c.get('/skills').json()[0]['status']=='invalid'

def test_real_unconfigured_and_unsupported_provider(api):
    c,_,_=api
    assert c.get('/skills?mode=real').json()[0]['status']=='unavailable'
    assert c.get('/skills?mode=real').json()[0]['required'][0]['code']=='UNCONFIGURED'
    assert c.get('/skills?provider=longbridge-account').json()[0]['required'][0]['code']=='PROVIDER_UNSUPPORTED'
    assert c.get('/skills?mode=bad').status_code==422
    assert c.put('/skills/test-skill/enabled',json={'enabled':'false'}).status_code==422

def test_real_views_use_existing_health_and_config_revision(api):
    c,app,_=api
    c.put('/settings/providers/longbridge',json={'enabled':True})
    c.put('/settings/providers/longbridge/credential',json={'app_key':'invented-key','app_secret':'invented-secret','access_token':'invented-token'})
    revision=app.state.provider_settings.profile('longbridge').revision
    registry=app.state.capabilities
    assert registry.state('market.quote','real').code=='REAL_UNVERIFIED'
    app.state.providers.health[('longbridge','market.quote',revision)]={'validation':'real','code':None}
    assert registry.state('market.quote','real').available
    assert c.get('/skills?mode=real').json()[0]['status']=='ready'
    app.state.providers.health[('longbridge','market.quote',revision)]={'validation':'restricted','code':'PERMISSION_DENIED'}
    assert c.get('/skills?mode=real').json()[0]['required'][0]['code']=='PERMISSION_DENIED'
    c.put('/settings/providers/longbridge',json={'enabled':False})
    assert registry.state('market.quote','real').code=='PROVIDER_DISABLED'
    c.put('/settings/providers/longbridge',json={'enabled':True})
    assert registry.state('market.quote','real').code=='REAL_UNVERIFIED'
    c.delete('/settings/providers/longbridge/credential')
    assert registry.state('market.quote','real').code=='CREDENTIAL_MISSING'

def test_agent_uses_same_state_without_model_requests(api):
    c,app,root=api
    model=Mock(); model.label='test'; runner=AgentRunner(model,app.state.manager.runner.tools)
    events=[]; emit=lambda *a:events.append(a)
    assert 'ready' in runner.run('技能 test-skill 状态',emit).answer
    assert '测试参考文本' in runner.run('读取技能 test-skill references/guide.md',emit).answer
    c.put('/skills/test-skill/enabled',json={'enabled':False})
    answer=runner.run('技能 test-skill 状态',emit).answer
    assert 'disabled' in answer and 'SKILL_DISABLED' in answer
    assert runner.run('读取技能 test-skill SKILL.md',emit).status=='failed'
    assert '不可用' in runner.run('请使用test-skill分析股票',emit).answer
    c.put('/skills/test-skill/enabled',json={'enabled':True})
    skill(root,required='options.chain')
    assert 'NOT_IMPLEMENTED' in runner.run('技能 test-skill 状态',emit).answer
    assert runner.run('读取技能 test-skill SKILL.md',emit).status=='failed'
    assert model.complete.call_count==0
    assert '能力 options.chain 不可用' in runner.run('请使用options.chain',emit).answer
    assert '不可用 / NOT_IMPLEMENTED' in runner.run('能力 options.chain 状态',emit).answer
    assert 'unavailable' in runner.run('技能 test-skill 真实状态',emit).answer
    assert runner.run('读取真实技能 test-skill SKILL.md',emit).status=='failed'

def test_rule_scope_does_not_advertise_removed_tools(api):
    _,app,_=api
    tools=app.state.manager.runner.tools
    tools._handlers.pop('market.quote')
    answer=AgentRunner(FakeModelProvider(),tools).run('你好',lambda *a:None).answer
    assert 'market.quote' not in answer and 'market.kline' in answer

def test_baseline_resources_preserved_and_readiness(tmp_path):
    app=create_app(TOKEN,database_path=tmp_path/'db.sqlite3',credential_vault=Vault())
    with TestClient(app,headers=HEADERS) as c:
        entries={s['id']:s for s in c.get('/skills').json()}
        assert entries['longbridge-technical']['status']=='partial'
        assert entries['longbridge-technical']['code']=='OPTIONAL_RESOURCE_MISSING'
        assert entries['longbridge-market-data']['status']=='partial'
        assert sum(len(s['missing_resources']) for s in entries.values())==4
        assert c.post('/skills/longbridge-technical/resource',json={'path':'references/references/fibonacci.md'}).json()['detail']=='RESOURCE_MISSING'
        assert c.post('/skills/longbridge-technical/resource',json={'path':'references/technical.md'}).status_code==200
        assert c.get('/skills?mode=real').json()[0]['status']=='unavailable'

def test_status_context_passed_to_model(api):
    _,app,_=api
    model=Mock();model.label='test';model.complete.return_value={'role':'assistant','content':'没有声称技能就绪。'}
    assert AgentRunner(model,app.state.manager.runner.tools).run('你好',lambda *a:None).status=='completed'
    assert '不可声称' in model.complete.call_args.args[0][0]['content']
    AgentRunner(model,app.state.manager.runner.tools).run('请说明真实数据限制',lambda *a:None)
    assert 'UNCONFIGURED, real' in model.complete.call_args.args[0][0]['content'] or '(REQUIRED_CAPABILITY_MISSING, real)' in model.complete.call_args.args[0][0]['content']

def test_auth_and_catalog_limit(api):
    c,_,root=api
    assert c.get('/skills',headers={'X-ResearchTrail-Token':'wrong'}).status_code==401
    for i in range(65): (root/f'skill-{i}').mkdir()
    assert c.get('/skills').json()['detail']=='CATALOG_LIMIT'
