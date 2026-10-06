"""Bounded DTO serialization and neutral account projections; missing numbers stay null."""
import ast
from datetime import date, datetime, timezone
from decimal import Decimal
from functools import lru_cache
from importlib.metadata import distribution, files
import math
from pathlib import Path
from .provider_errors import ProviderFault

@lru_cache(maxsize=1)
def sdk_fields():
    # Whitelist actual installed SDK DTO annotations; never serialize Config, exceptions or __dict__.
    p = next(distribution('longbridge').locate_file(f) for f in files('longbridge') if str(f).endswith('openapi.pyi'))
    tree = ast.parse(Path(p).read_text(encoding='utf-8'))
    result = {c.name: [n.target.id for n in c.body if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name)]
            for c in tree.body if isinstance(c, ast.ClassDef) and c.name not in ('Config', 'OpenApiException')}
    # 5.2.0 exposes NewsItem at runtime but omits its declaration from openapi.pyi.
    # Runtime descriptors + official content NewsItem schema were checked in Step11.
    result['NewsItem'] = ['id','title','description','url','published_at','comments_count','likes_count','shares_count']
    return result

def public_json(value, secrets=(), depth=0):
    if depth > 16: raise ProviderFault('INVALID_RESPONSE')
    if value is None or isinstance(value, (bool, int)): return value
    if isinstance(value, (float, Decimal)):
        number = float(value)
        if not math.isfinite(number): raise ProviderFault('INVALID_RESPONSE')
        return number
    if isinstance(value, (datetime, date)):
        if isinstance(value, datetime):
            if value.tzinfo is None: raise ProviderFault('INVALID_RESPONSE')
            value = value.astimezone(timezone.utc)
        return value.isoformat()
    if isinstance(value, str):
        if len(value) > 10000: raise ProviderFault('RESPONSE_LIMIT')
        for secret in secrets:
            if secret: value = value.replace(secret, '[已脱敏]')
        return value
    if isinstance(value, (list, tuple)):
        if len(value) > 1000: raise ProviderFault('RESPONSE_LIMIT')
        return [public_json(v, secrets, depth+1) for v in value]
    if isinstance(value, dict):
        if len(value) > 200: raise ProviderFault('RESPONSE_LIMIT')
        return {public_json(k, secrets, depth+1): public_json(v, secrets, depth+1) for k,v in value.items()
                if isinstance(k,str) and not any(s in k.lower() for s in ('key','token','secret','password','authorization','credential'))}
    names = sdk_fields().get(type(value).__name__)
    if names:
        return public_json({name: getattr(value,name) for name in names}, secrets, depth+1)
    if names == []: return public_json(str(value), secrets, depth+1)  # SDK enum value
    raise ProviderFault('INVALID_RESPONSE')

def number(value):
    if value is None: return None
    if isinstance(value,bool): raise ProviderFault('INVALID_RESPONSE')
    try: result = float(value)
    except (ValueError,TypeError): raise ProviderFault('INVALID_RESPONSE') from None
    if not math.isfinite(result): raise ProviderFault('INVALID_RESPONSE')
    return result

def normalize_accounts(capability, raw):
    if capability == 'account.positions':
        if not isinstance(raw,dict) or not isinstance(raw.get('channels'),list): raise ProviderFault('INVALID_RESPONSE')
        result=[]
        for channel in raw['channels']:
            for p in channel.get('positions',[]):
                result.append({'symbol':p['symbol'],'name':p.get('symbol_name',''),'currency':p.get('currency'),
                    'quantity':number(p.get('quantity')),'available_quantity':number(p.get('available_quantity')),
                    'cost_price':number(p.get('cost_price')),'market_price':None,'market_value':None})
        return result
    if capability == 'account.assets':
        if not isinstance(raw,list): raise ProviderFault('INVALID_RESPONSE')
        return [{'currency':p.get('currency'), 'net_assets':number(p.get('net_assets')), 'total_cash':number(p.get('total_cash')),
                 'buy_power':number(p.get('buy_power')), 'risk_level':p.get('risk_level'), 'cash_infos':p.get('cash_infos',[])} for p in raw]
    if capability == 'account.cashFlow':
        if not isinstance(raw,list): raise ProviderFault('INVALID_RESPONSE')
        return [{'timestamp':p.get('business_time'), 'currency':p.get('currency'), 'amount':number(p.get('balance')),
                 'direction':p.get('direction'), 'business_type':p.get('business_type'),
                 'flow_name':p.get('transaction_flow_name'), 'symbol':p.get('symbol'), 'description':p.get('description')} for p in raw]
    return raw
