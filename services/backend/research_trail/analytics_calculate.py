"""Pure Decimal calculations adapted in Python from Folio ba5dcdfd risk/compare methods.

Source: https://github.com/helsome/folio packages/shared/src/portfolio-risk/service.ts
and compare/service.ts. Missing inputs never shrink the portfolio denominator.
"""
from datetime import datetime, timezone
from decimal import Decimal, localcontext
from .portfolio_contracts import decimal_text
from .analytics_contracts import Allocation, RiskGroup, RiskSignal, SeriesStats

def number(value):
    if value is None or value in ('', '—', '--'): return None
    if isinstance(value, bool) or not isinstance(value, (int, float, str, Decimal)): raise ValueError('INVALID_NUMBER')
    result = Decimal(str(value))
    if not result.is_finite() or abs(result) > Decimal('1e60'): raise ValueError('INVALID_NUMBER')
    return result

def output(value):
    if value is None: return None
    with localcontext() as ctx:
        ctx.prec = 80
        return decimal_text(value.quantize(Decimal('0.00000001')))

def time_text(t): return datetime.fromtimestamp(t, timezone.utc).isoformat()

def series(data):
    if not isinstance(data, list) or len(data) > 260: raise ValueError('INVALID_SERIES')
    rows = []
    for row in data:
        if not isinstance(row, dict): raise ValueError('INVALID_SERIES')
        from .workspace_normalize import timestamp
        dt = timestamp(row.get('timestamp'))
        close, high = number(row.get('close')), number(row.get('high'))
        # Never discard a broken bar and bridge a gap as a daily return.
        if dt is None or close is None or high is None or close <= 0 or high < close: raise ValueError('INVALID_SERIES')
        rows.append((int(dt.timestamp()), close, high))
    rows.sort()
    if len(set(t for t, _, _ in rows)) != len(rows): raise ValueError('DUPLICATE_TIME')
    if len({time_text(t)[:10] for t, _, _ in rows}) != len(rows): raise ValueError('NOT_DAILY')
    if any(rows[i][0]-rows[i-1][0] > 7*86400 for i in range(1,len(rows))): raise ValueError('GAPPED_HISTORY')
    return rows

def volatility(values):
    if len(values) < 2: return None
    with localcontext() as ctx:
        ctx.prec = 80
        mean = sum(values) / len(values)
        return (sum((v-mean)**2 for v in values) / (len(values)-1)).sqrt()

def stats(symbol, rows, window=30):
    rows = rows[-window:]
    r = [rows[i][1]/rows[i-1][1]-1 for i in range(1, len(rows))]
    vol = volatility(r)
    peak = max((h for _, _, h in rows[-20:]), default=None)
    drawdown = max(Decimal(0), (peak-rows[-1][1])/peak) if peak else None
    return SeriesStats(symbol=symbol, status='ready' if vol is not None else 'missing', bars=len(rows), returns=len(r),
        start=time_text(rows[0][0]) if rows else None, end=time_text(rows[-1][0]) if rows else None,
        daily_volatility=output(vol), annualized_volatility=output(vol*Decimal(252).sqrt()) if vol is not None else None,
        drawdown=output(drawdown), reason=None if vol is not None else 'INSUFFICIENT_BARS: 至少3根日K线计算样本波动率。')

def risk_group(currency, holdings, histories):
    with localcontext() as ctx:
        ctx.prec = 80
        active = [h for h in holdings if number(h.quantity) > 0]
        values = [number(h.market_value) for h in active]
        complete = all(v is not None for v in values)
        total = sum(values) if complete else None
        usable = total is not None and total > 0
        alloc = [Allocation(symbol=h.symbol, quantity=h.quantity, price=h.market_price, market_value=h.market_value,
            weight=output(number(h.market_value)/total) if usable else None) for h in active]
        alloc.sort(key=lambda a: (-(number(a.weight) or 0), a.symbol))
        weights = sorted([v/total for v in values], reverse=True) if usable else []
        unavailable = []
        if not active: unavailable.append('EMPTY: 没有正数量持仓；现金不进入持仓风险分母。')
        elif not complete: unavailable.append('MISSING_PRICE: 存在缺失估值，全部权重和集中度为—，未改用已知子集归一化。')
        elif not usable: unavailable.append('ZERO_VALUE: 持仓市值合计为0，权重和集中度无定义。')
        signals = []
        if weights:
            if weights[0] > Decimal('.2'): signals.append(RiskSignal(kind='concentration', severity='high' if weights[0] > Decimal('.3') else 'medium', detail=f'Top1持仓权重 {output(weights[0])}（比例）。'))
            for a in alloc:
                w = number(a.weight)
                if w > Decimal('.15'): signals.append(RiskSignal(kind='large_position', severity='high' if w > Decimal('.25') else 'medium', symbol=a.symbol, detail=f'单仓权重 {a.weight}（比例）。'))
        summaries = []
        for a in alloc:
            if a.symbol not in histories:
                summaries.append(SeriesStats(symbol=a.symbol, status='missing', reason='行情失败/受限/缺失，或超过20只行情分析上限。'))
                continue
            s = stats(a.symbol, histories[a.symbol]); summaries.append(s)
            d = number(s.drawdown)
            if d is not None and d > Decimal('.2'): signals.append(RiskSignal(kind='drawdown', severity='high' if d > Decimal('.35') else 'medium', symbol=a.symbol, detail=f'最新收盘距至多20根日K线最高价回撤 {s.drawdown}（比例）。'))
        port = SeriesStats(symbol='组合', status='missing', reason='需要全部正持仓同币种、完整估值和严格相同的日K线时点；不填补缺失交易日。')
        aligned = [histories.get(a.symbol, [])[-30:] for a in alloc]
        if usable and aligned and len(aligned[0]) >= 3 and all([t for t, _, _ in rows] == [t for t, _, _ in aligned[0]] for rows in aligned):
            exact_weights = [number(a.market_value)/total for a in alloc]
            returns = [sum(w*(rows[i][1]/rows[i-1][1]-1) for w, rows in zip(exact_weights, aligned)) for i in range(1, len(aligned[0]))]
            vol = volatility(returns)
            port = SeriesStats(symbol='组合', status='ready', bars=len(aligned[0]), returns=len(returns),
                start=time_text(aligned[0][0][0]), end=time_text(aligned[0][-1][0]), daily_volatility=output(vol),
                annualized_volatility=output(vol*Decimal(252).sqrt()))
        if port.status != 'ready': unavailable.append('PORTFOLIO_VOLATILITY: '+port.reason)
        return RiskGroup(currency=currency, status='empty' if not active else 'partial' if not usable or port.status!='ready' else 'ready',
            total_market_value=decimal_text(total), allocation=alloc, top1_weight=output(weights[0]) if weights else None,
            top5_weight=output(sum(weights[:5])) if weights else None, herfindahl=output(sum(w*w for w in weights)) if weights else None,
            series=summaries, portfolio_volatility=port, signals=signals, unavailable=unavailable)

def period_return(rows, sessions):
    if len(rows) <= sessions: return None
    with localcontext() as ctx:
        ctx.prec = 80
        return (rows[-1][1]/rows[-1-sessions][1]-1)*100
