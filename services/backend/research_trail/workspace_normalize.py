"""Project vendor data into bounded display DTOs; absent numbers/times never become zero/now."""
from datetime import datetime, timezone
from urllib.parse import urlsplit
from pydantic import ValidationError
from .provider_errors import ProviderFault
from .provider_normalize import number
from .market import Kline
from .workspace_contracts import Metric, News, FinancialRow, TradingStatus

def text(value, limit=500):
    if value is None or value=='': return None
    if not isinstance(value,(str,int)) or isinstance(value,bool): raise ProviderFault('INVALID_RESPONSE')
    result=str(value)
    if len(result)>limit: raise ProviderFault('RESPONSE_LIMIT')
    return result

def numeric(value):
    if value is None or isinstance(value,str) and value.strip() in ('','—','--','-'): return None
    return number(value)

def timestamp(value):
    if isinstance(value,bool): raise ProviderFault('INVALID_RESPONSE')
    if value is None or value in ('',0,'0'): return None
    try:
        if isinstance(value,str) and not value.isdigit():
            dt=datetime.fromisoformat(value.replace('Z','+00:00'))
            if dt.tzinfo is None: raise ValueError()
            return dt.astimezone(timezone.utc)
        value=float(value)
        if value>1e17: value/=1e9
        elif value>1e11: value/=1000
        return datetime.fromtimestamp(value,timezone.utc)
    except (ValueError,TypeError,OverflowError,OSError): raise ProviderFault('INVALID_RESPONSE') from None

def original_url(value):
    if value is None or value=='': return None
    if not isinstance(value,str) or len(value)>2000: raise ProviderFault('INVALID_RESPONSE')
    try:
        p=urlsplit(value)
        if p.scheme not in ('https','http') or not p.hostname or p.username or p.password or '\\' in value or any(c.isspace() or ord(c)<32 for c in value): return None
        _=p.port
        return value  # Keep the provider's original path/query/fragment, never invent an article URL.
    except ValueError: return None

def object_data(data):
    if not isinstance(data,dict): raise ProviderFault('INVALID_RESPONSE')
    return data

def metrics(cap,data):
    d=object_data(data)
    if cap=='company.profile':
        name=d.get('name') or d.get('name_cn') or d.get('name_en') or d.get('name_hk')
        return [Metric(label='名称',value=text(name)),Metric(label='交易所',value=text(d.get('exchange') or d.get('primary_exchange'))),
            Metric(label='币种',value=text(d.get('currency') or d.get('currency_name'))),
            Metric(label='简介',value=text(d.get('description'),2000)),
            *[Metric(label=label,value=numeric(d.get(key))) for key,label in (
                ('eps_ttm','每股收益 TTM'),('bps','每股净资产'),('total_shares','总股数'),('circulating_shares','流通股数'))]]
    fields=(('last_price','最新价'),('previous_close','前收'),('change','涨跌额'),('change_percent','涨跌幅'),
        ('open','开盘'),('high','最高'),('low','最低'),('volume','成交量')) if cap=='market.quote' else (
        ('pe_ttm_ratio','市盈率 TTM'),('pb_ratio','市净率'),('dividend_ratio_ttm','股息率 TTM'),
        ('total_market_value','总市值'),('turnover_rate','换手率'),('ytd_change_rate','年初至今涨跌幅'))
    currency=text(d.get('currency'))
    return [Metric(label=label,value=numeric(d.get(key)),unit='%' if key in ('change_percent','dividend_ratio_ttm','turnover_rate','ytd_change_rate') else currency if key in ('last_price','previous_close','change','open','high','low') else None) for key,label in fields]

def bars(data):
    if not isinstance(data,list): raise ProviderFault('INVALID_RESPONSE')
    result=[]
    for d in data[:100]:
        d=object_data(d); t=timestamp(d.get('timestamp'))
        # A missing bar stays absent; malformed/inconsistent OHLC is an explicit error.
        values={key:numeric(d.get(key)) for key in ('open','high','low','close','volume')}
        if t is None or any(v is None for v in values.values()): continue
        try: result.append(Kline(timestamp=int(t.timestamp()),**values))
        except ValidationError: raise ProviderFault('INVALID_RESPONSE') from None
    result.sort(key=lambda r:r.timestamp)
    if len({r.timestamp for r in result})!=len(result): raise ProviderFault('INVALID_RESPONSE')
    return result

def news(data):
    if not isinstance(data,list): raise ProviderFault('INVALID_RESPONSE')
    result=[]
    for i,d in enumerate(data[:20]):
        d=object_data(d); url=original_url(d.get('url'))
        result.append(News(id=text(d.get('id')) or f'row-{i}',title=text(d.get('title')),
            summary=text(d.get('description') or d.get('summary'),2000),url=url,
            source=text(d.get('source')) or (urlsplit(url).hostname if url else None),
            published_at=timestamp(d.get('published_at'))))
    return result

def financials(data):
    d=object_data(data); groups=d.get('list',{})
    if not isinstance(groups,dict): raise ProviderFault('INVALID_RESPONSE')
    rows=[]
    for kind in ('IS','BS','CF'):
        group=object_data(groups.get(kind,{}))
        indicators=group.get('indicators',[])
        if not isinstance(indicators,list): raise ProviderFault('INVALID_RESPONSE')
        for indicator in indicators:
            indicator=object_data(indicator); accounts=indicator.get('accounts',[])
            if not isinstance(accounts,list): raise ProviderFault('INVALID_RESPONSE')
            for account in accounts:
                account=object_data(account); values=account.get('values',[])
                if not isinstance(values,list): raise ProviderFault('INVALID_RESPONSE')
                for value in values or [{}]:
                    value=object_data(value)
                    year=text(value.get('year')); period=text(value.get('period')); end=text(value.get('fp_end'))
                    rows.append(FinancialRow(statement=kind,label=text(account.get('name')) or text(account.get('field')) or '—',
                        currency=text(indicator.get('currency')),period=end or ' '.join(v for v in (year,period) if v) or None,
                        value=numeric(value.get('value'))))
                    if len(rows)>=200: return rows
    return rows

def statuses(data,market):
    rows=object_data(data).get('market_time',[])
    if not isinstance(rows,list): raise ProviderFault('INVALID_RESPONSE')
    result=[]
    for d in rows:
        d=object_data(d); label=text(d.get('market'))
        if label and label.split('.')[-1]!=market: continue
        if not label: continue
        status=text(d.get('status'))
        code=d.get('trade_status')
        if not status and code is not None:
            if not isinstance(code,int) or isinstance(code,bool): raise ProviderFault('INVALID_RESPONSE')
            status=f'状态代码 {code}（含义未知）'
        result.append(TradingStatus(market=market,status=status,market_time=timestamp(d.get('timestamp'))))
    return result
