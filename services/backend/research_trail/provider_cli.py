"""Only baseline reads missing SDK parity. No arbitrary args, shell, login or trading."""
from pathlib import Path
import time
from .provider_contracts import ReadQuery
from .provider_errors import ProviderFault
from .provider_normalize import public_json, number
from .provider_process import run_process, safe_environment

def arguments(query):
    query=ReadQuery.model_validate(query.model_dump())
    if query.capability=='account.accounts': return ['auth','status','--format','json']
    if query.capability=='account.portfolio': return ['portfolio','--format','json']
    if query.capability=='company.financials':
        args=['financial-report',query.symbol,'--kind',query.kind]
        if query.report: args += ['--report',query.report]
        return args+['--format','json']
    if query.capability=='research.events':
        args=['finance-calendar',query.event_type,'--count',str(query.count)]
        if query.symbol: args += ['--symbol',query.symbol]
        if query.start: args += ['--start',query.start.isoformat(),'--end',query.end.isoformat()]
        return args+['--format','json']
    raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')

def execute_cli(snapshot,query,stop=None,*,executor=run_process):
    args=arguments(query)
    path=Path(snapshot.configuration.cli_path)
    if not snapshot.configuration.cli_path or not path.is_file(): raise ProviderFault('CLI_UNAVAILABLE','unconfigured')
    env=safe_environment()
    env['LONGBRIDGE_REGION']=snapshot.configuration.region
    deadline=time.monotonic()+snapshot.configuration.timeout_seconds
    if query.capability!='account.accounts':
        status=executor([str(path),'auth','status','--format','json'],timeout=snapshot.configuration.timeout_seconds,stop=stop,env=env)
        if not isinstance(status,dict) or not isinstance(status.get('account'),dict) or not status['account'].get('account_no'):
            raise ProviderFault('CLI_AUTH_REQUIRED','unconfigured')
    remaining=deadline-time.monotonic()
    if remaining<=0: raise ProviderFault('TIMEOUT','timed_out',True)
    raw=public_json(executor([str(path),*args],timeout=remaining,stop=stop,env=env),
                    tuple(snapshot.credentials.values()))
    if query.capability=='account.accounts':
        if not isinstance(raw,dict) or not isinstance(raw.get('account'),dict): raise ProviderFault('CLI_AUTH_REQUIRED','unconfigured')
        account=raw['account']; identity=account.get('account_no')
        if not identity: raise ProviderFault('CLI_AUTH_REQUIRED','unconfigured')
        return [{'id':str(identity),'name':account.get('name',''),'region':account.get('region')}]
    if query.capability=='account.portfolio':
        if not isinstance(raw,dict): raise ProviderFault('INVALID_RESPONSE')
        # Project only documented data sections, never raw auth/config/debug fields.
        overview=raw.get('overview')
        if not isinstance(overview,dict) or not isinstance(raw.get('holdings'),list): raise ProviderFault('INVALID_RESPONSE')
        accounts=raw.get('market_accounts',{})
        if not isinstance(accounts,dict) or any(not isinstance(v,dict) for v in accounts.values()) or any(not isinstance(v,dict) for v in raw['holdings']):
            raise ProviderFault('INVALID_RESPONSE')
        return {'base_currency':overview.get('currency'),'total_assets':number(overview.get('total_asset')),
            'cash':number(overview.get('total_cash')),'market_value':number(overview.get('market_cap')),
            'total_pnl':number(overview.get('total_pl')),'today_pnl':number(overview.get('total_today_pl')),
            'accounts':[{'market':market,'currency':p.get('currency'),**{k:number(p.get(k)) for k in
                ('net_assets','market_value','balance','pl','today_pl','frozen_cash','withdraw_cash')}} for market,p in sorted(accounts.items())],
            'holdings':[{'symbol':p.get('symbol'),'name':p.get('name'),'currency':p.get('currency'),**{k:number(p.get(k)) for k in
                ('quantity','available_quantity','cost_price','market_price','market_value','prev_close')}} for p in raw['holdings']]}
    if query.capability=='company.financials':
        if not isinstance(raw,dict) or not isinstance(raw.get('list'),dict): raise ProviderFault('INVALID_RESPONSE')
        if raw.get('symbol',query.symbol)!=query.symbol: raise ProviderFault('INVALID_RESPONSE')
        statements={}
        for kind,statement in raw['list'].items():
            if kind.upper() not in ('IS','BS','CF'): continue
            if not isinstance(statement,dict) or not isinstance(statement.get('indicators'),list): raise ProviderFault('INVALID_RESPONSE')
            indicators=[]
            for indicator in statement['indicators']:
                if not isinstance(indicator,dict): raise ProviderFault('INVALID_RESPONSE')
                accounts=[]
                for account in indicator.get('accounts',[]):
                    if not isinstance(account,dict): raise ProviderFault('INVALID_RESPONSE')
                    values=[]
                    for value in account.get('values',[]):
                        if not isinstance(value,dict): raise ProviderFault('INVALID_RESPONSE')
                        values.append({k:value.get(k) for k in ('fp_end','period','ratio','value','year','yoy')})
                    accounts.append({**{k:account.get(k) for k in ('field','name','percent','tip','ranking_code','industry_ranking')},'values':values})
                indicators.append({**{k:indicator.get(k) for k in ('currency','has_yoy','periods','short_title','title')},'accounts':accounts})
            statements[kind.upper()]={'indicators':indicators}
        return {'symbol':query.symbol,'report':raw.get('report'),'list':statements}
    if not isinstance(raw,dict) or not isinstance(raw.get('list'),list): raise ProviderFault('INVALID_RESPONSE')
    events=[]
    for group in raw['list']:
        if not isinstance(group,dict) or not isinstance(group.get('infos'),list): raise ProviderFault('INVALID_RESPONSE')
        for info in group['infos']:
            if not isinstance(info,dict): raise ProviderFault('INVALID_RESPONSE')
            events.append({k:info.get(k) for k in ('id','datetime','type','activity_type','counter_id','counter_name','market','currency','content')})
    return events[:query.count]
