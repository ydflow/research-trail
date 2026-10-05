"""Current official longbridge 5.2.0 read methods only; no vendor trading methods exposed."""
from datetime import datetime, timedelta, timezone
from .provider_contracts import ReadQuery
from .provider_errors import ProviderFault
from .provider_normalize import public_json, normalize_accounts, number

SDK_METHODS = {
    'market.quote': ('QuoteContext','quote'), 'market.kline': ('QuoteContext','candlesticks'),
    'market.intraday': ('QuoteContext','intraday'), 'market.depth': ('QuoteContext','depth'),
    'market.trades': ('QuoteContext','trades'), 'market.capitalFlow': ('QuoteContext','capital_flow'),
    'market.sentiment': ('QuoteContext','market_temperature'), 'market.status': ('MarketContext','market_status'),
    'company.profile': ('QuoteContext','static_info'), 'company.valuation': ('QuoteContext','calc_indexes'),
    'company.financials': ('FundamentalContext','financial_report'), 'company.dividends': ('FundamentalContext','dividend'),
    'company.earnings': ('FundamentalContext','forecast_eps'), 'company.ratings': ('FundamentalContext','institution_rating'),
    'research.news': ('ContentContext','news'), 'research.events': ('CalendarContext','finance_calendar'),
    'account.positions': ('TradeContext','stock_positions'), 'account.assets': ('TradeContext','account_balance'),
    'account.cashFlow': ('TradeContext','cash_flow'),
}

def execute_sdk(snapshot, query, *, sdk=None, context_factory=None):
    query = ReadQuery.model_validate(query.model_dump())
    if query.capability not in SDK_METHODS: raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')
    if query.capability=='research.events' and (query.symbol or query.event_type=='financial'):
        raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')
    if query.capability=='company.financials' and query.report not in (None,'annual','interim','quarter'):
        raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')
    credentials = snapshot.credentials
    if set(credentials) != {'app_key','app_secret','access_token'}: raise ProviderFault('CREDENTIAL_MISSING','unconfigured')
    if sdk is None:
        import longbridge.openapi as sdk
    cls, method = SDK_METHODS[query.capability]
    if not hasattr(sdk,cls) or not hasattr(getattr(sdk,cls),method): raise ProviderFault('SDK_UNAVAILABLE')
    suffix = 'cn' if snapshot.configuration.region == 'cn' else 'com'
    # Worker environment excludes LONGBRIDGE_*, proxy, dotenv, tracing and logging options.
    config = sdk.Config.from_apikey(**credentials, http_url='https://openapi.longbridge.'+suffix,
        quote_ws_url='wss://openapi-quote.longbridge.'+suffix+'/v2',
        trade_ws_url='wss://openapi-trade.longbridge.'+suffix+'/v2',
        language=sdk.Language.EN, enable_print_quote_packages=False, enable_papertrading=False)
    ctx = context_factory(cls,config) if context_factory else getattr(sdk,cls)(config)
    cap, symbol = query.capability, query.symbol
    today = datetime.now(timezone.utc).date()
    start, end = query.start or today-timedelta(days=30), query.end or today
    if cap in ('market.quote','company.profile'):
        data = getattr(ctx,method)([symbol])
    elif cap == 'market.kline':
        period = getattr(sdk.Period, {'1m':'Min_1','5m':'Min_5','15m':'Min_15','1h':'Min_60','1d':'Day','1w':'Week'}[query.period])
        if query.start:
            data = ctx.history_candlesticks_by_date(symbol, period, sdk.AdjustType.NoAdjust, start, end)[-query.count:]
        else:
            data = ctx.candlesticks(symbol,period,query.count,sdk.AdjustType.NoAdjust)
    elif cap in ('market.intraday','market.depth','market.capitalFlow','company.dividends','company.earnings','company.ratings','research.news'):
        data = getattr(ctx,method)(symbol)
    elif cap == 'market.trades': data = ctx.trades(symbol,query.count)
    elif cap == 'market.sentiment': data = ctx.market_temperature(getattr(sdk.Market,query.market))
    elif cap == 'market.status': data = ctx.market_status()
    elif cap == 'company.valuation':
        data = ctx.calc_indexes([symbol],[getattr(sdk.CalcIndex,name) for name in ('PeTtmRatio','PbRatio','DividendRatioTtm',
            'TotalMarketValue','TurnoverRate','YtdChangeRate','VolumeRatio','Amplitude')])
    elif cap == 'company.financials':
        kind = getattr(sdk.FinancialReportKind,{'IS':'IncomeStatement','BS':'BalanceSheet','CF':'CashFlow','ALL':'All'}[query.kind])
        period = getattr(sdk.FinancialReportPeriod,{'annual':'Annual','interim':'SemiAnnual','quarter':'QuarterlyFull'}[query.report]) if query.report else None
        data = ctx.financial_report(symbol,kind,period)
    elif cap == 'research.events':
        category = getattr(sdk.CalendarCategory,{'report':'Report','dividend':'Dividend',
            'ipo':'Ipo','macrodata':'MacroData','closed':'Closed'}[query.event_type])
        if symbol: raise ProviderFault('UNSUPPORTED_CAPABILITY','unsupported')  # SDK lacks baseline symbol filter.
        data = ctx.finance_calendar(category,start.isoformat(),end.isoformat(),market=query.market,count=query.count)
    elif cap == 'account.positions': data = ctx.stock_positions([symbol] if symbol else None)
    elif cap == 'account.assets': data = ctx.account_balance()
    elif cap == 'account.cashFlow':
        data = ctx.cash_flow(datetime.combine(start,datetime.min.time(),tzinfo=timezone.utc),
            datetime.combine(end,datetime.max.time(),tzinfo=timezone.utc),symbol=symbol,page=1,size=query.count)
    raw = public_json(data,tuple(credentials.values()))
    if cap in ('market.quote','company.profile','company.valuation'):
        if not isinstance(raw,list) or len(raw)!=1 or not isinstance(raw[0],dict) or raw[0].get('symbol')!=symbol: raise ProviderFault('INVALID_RESPONSE')
        raw=raw[0]
    if cap=='market.quote':
        last, previous = number(raw.get('last_done')), number(raw.get('prev_close'))
        if last is None or previous is None: raise ProviderFault('NO_DATA')
        raw={'symbol':symbol,'last_price':last,'previous_close':previous,
             'change':last-previous,'change_percent':(last-previous)/previous*100 if previous else None,
             'open':number(raw.get('open')),'high':number(raw.get('high')),'low':number(raw.get('low')),
             'volume':raw.get('volume'),'timestamp':raw.get('timestamp'),'trade_status':raw.get('trade_status')}
    if cap in ('market.kline','market.trades','market.intraday','market.capitalFlow','research.news'):
        if not isinstance(raw,list): raise ProviderFault('INVALID_RESPONSE')
        raw=raw[-query.count:] if cap=='market.kline' else raw[:query.count]
    return normalize_accounts(cap,raw)
