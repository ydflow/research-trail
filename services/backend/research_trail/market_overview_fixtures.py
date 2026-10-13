"""Original deterministic overview examples. No vendor, original chart or Agent fixtures used."""
from datetime import datetime, timedelta, timezone
from .market_overview_contracts import EquityAsset, CryptoPairAsset, OverviewRow

FETCHED_AT = datetime(2024, 1, 16, 21, 5, tzinfo=timezone.utc)
TIMEZONES = {'CN':'Asia/Shanghai', 'US':'America/New_York', 'CRYPTO':'UTC'}
MARKET_TIMES = {'CN':datetime(2024,1,16,7,tzinfo=timezone.utc),
                'US':datetime(2024,1,16,21,tzinfo=timezone.utc),
                'CRYPTO':datetime(2024,1,16,21,tzinfo=timezone.utc)}
# (symbol, name, reference, last, volume). These numbers are authored, not actual historical prices.
EXAMPLES = {
    'CN': [('600519.SH','贵州茅台',1600,1632,1230000), ('601318.SH','中国平安',40,39.2,3420000),
           ('600036.SH','招商银行',30,30,2110000), ('000001.SZ','平安银行',10,10.35,9800000),
           ('000858.SZ','五粮液',150,148.95,None), ('300750.SZ','宁德时代',None,188.2,2860000)],
    'US': [('AAPL.US','Apple',188,189.43,1900000), ('MSFT.US','Microsoft',410,412.6,1680000),
           ('NVDA.US','NVIDIA',876,880.12,3240000), ('TSLA.US','Tesla',178,175.22,None)],
    'CRYPTO': [('BTC/USDT','Bitcoin',42000,42756,28400), ('ETH/USDT','Ethereum',2500,2557.5,14700),
               ('SOL/USDT','Solana',100,103.5,41000), ('BNB/USDT','BNB',310,310,28800),
               ('XRP/USDT','XRP',.56,.5544,None), ('ADA/USDT','Cardano',None,.48,30700)],
}


async def overview_rows(market):
    rows = []
    for index, (symbol, name, reference, last, volume) in enumerate(EXAMPLES[market]):
        crypto = market == 'CRYPTO'
        asset = CryptoPairAsset(id=f'crypto_pair:fixture:{symbol}', symbol=symbol, name=name, base_asset=symbol.split('/')[0]) if crypto else EquityAsset(id=f'equity:{market}:{symbol}', market=market, symbol=symbol, name=name, currency='CNY' if market == 'CN' else 'USD')
        change = None if reference is None else last-reference
        unit = asset.quote_asset if crypto else asset.currency
        rows.append(OverviewRow(asset=asset, last_price=last, reference_price=reference, change=change,
            change_percent=None if change is None else change/reference*100,
            change_basis='rolling_24h' if crypto else 'previous_close',
            window_start=MARKET_TIMES[market]-timedelta(hours=24) if crypto else None,
            window_end=MARKET_TIMES[market] if crypto else None, market_time=MARKET_TIMES[market],
            volume=volume, volume_unit=asset.base_asset if crypto else 'shares',
            # A separate explicitly authored amount, never inferred from latest price * volume.
            turnover=None if volume is None or index == len(EXAMPLES[market])-1 else (index+1)*1_200_000,
            turnover_unit=unit,
            classification='示例分组一' if index < 2 else None,
            classification_kind='watch_group' if index < 2 else 'unclassified',
            classification_source='authored-example-group' if index < 2 else None,
            detail_target='security' if market == 'US' else None,
            security_symbol=symbol if market == 'US' else None))
    return rows
