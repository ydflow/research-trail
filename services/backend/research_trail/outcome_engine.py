"""Pure Decimal calculations; Folio ba5dcdfd formulas are conceptual references.

Daily bars use UTC dates and are usable only after that date has fully closed.
All weekdays in the window must be covered; unsupported holiday gaps are unable.
"""
from datetime import datetime, timezone, timedelta, time
from decimal import Decimal, localcontext
from .outcome_contracts import OutcomeBar

ENGINE_VERSION = 'research-trail-outcome-v1'
DAYS = {'1w': 7, '1m': 30, '3m': 90}

def instant(value):
    dt = datetime.fromisoformat(value.replace('Z', '+00:00')) if isinstance(value, str) else value
    if dt.tzinfo is None: raise ValueError('时间必须包含时区')
    return dt.astimezone(timezone.utc)

def day_end(day):
    return datetime.combine(day + timedelta(days=1), time(), timezone.utc)

def window(research_at, horizon):
    end = instant(research_at) + timedelta(days=DAYS[horizon])
    return end, max(end, day_end(end.date()))

def decimal_text(value):
    return format(value, 'f') if value is not None else None

def calculate(opinion, bars, as_of):
    now = instant(as_of)
    empty = dict(exit_price=None, return_percent=None, direction_correct=None, maximum_drawdown=None)
    def unable(code): return dict(status='unable', code=code, **empty)
    if now < opinion.due_at: return dict(status='pending', code='WINDOW_NOT_DUE', **empty)
    if opinion.entry_code or opinion.entry_price is None: return unable(opinion.entry_code or 'ENTRY_MISSING')
    entry = Decimal(opinion.entry_price)
    if not entry.is_finite() or entry <= 0: return unable('ENTRY_INVALID')
    if (opinion.entry_market_at is None or opinion.entry_fetched_at is None or
        opinion.entry_market_at > opinion.research_at or opinion.entry_fetched_at > opinion.research_at):
        return unable('FUTURE_ENTRY_DATA')
    if opinion.research_at - opinion.entry_market_at > timedelta(days=7): return unable('ENTRY_STALE')
    try:
        checked = [OutcomeBar.model_validate(b) for b in bars]
        if len(checked) > 260: raise ValueError()
        stamps = [b.timestamp for b in checked]
        if len(stamps) != len(set(stamps)): return unable('DUPLICATE_MARKET_DATA')
        if any(day_end(datetime.fromtimestamp(b.timestamp, timezone.utc).date()) > now for b in checked):
            return unable('FUTURE_MARKET_DATA')
        # Entry is frozen quote evidence, never the first later daily close.
        selected = sorted((b for b in checked if opinion.research_at.date() <
            datetime.fromtimestamp(b.timestamp, timezone.utc).date() <= opinion.window_end.date()), key=lambda b:b.timestamp)
        dates = [datetime.fromtimestamp(b.timestamp, timezone.utc).date() for b in selected]
        if len(dates) != len(set(dates)): return unable('DUPLICATE_MARKET_DAY')
        expected = []
        day = opinion.research_at.date() + timedelta(days=1)
        while day <= opinion.window_end.date():
            if day.weekday() < 5: expected.append(day)
            day += timedelta(days=1)
        if not expected or any(day not in dates for day in expected): return unable('HISTORY_INCOMPLETE')
        selected = [b for b in selected if datetime.fromtimestamp(b.timestamp, timezone.utc).date() in expected]
        if not selected: return unable('HISTORY_MISSING')
    except (ValueError, TypeError, OverflowError): return unable('HISTORY_INVALID')
    with localcontext() as ctx:
        ctx.prec = 40
        exit_price = selected[-1].close
        change = (exit_price-entry)/entry*100
        correct = change > 0 if opinion.stance == 'bullish' else change < 0 if opinion.stance == 'bearish' else abs(change) <= Decimal('2')
        peak = entry; drawdown = Decimal(0)
        for bar in selected:
            peak = max(peak, bar.close)
            drawdown = max(drawdown, (peak-bar.close)/peak*100)
        return dict(status='evaluated', code=None, exit_price=decimal_text(exit_price), return_percent=decimal_text(change),
            direction_correct=correct, maximum_drawdown=decimal_text(drawdown))

def aggregate(group, parameters):
    evaluated = [a for _, a in group if a and a.status == 'evaluated']
    unable = sum(bool(a and a.status in ('unable', 'interrupted')) for _, a in group)
    pending = len(group)-len(evaluated)-unable
    n = len(evaluated); insufficient = n < parameters.min_samples
    values = dict(direction_hit_rate=None, average_return=None, unable_rate=None, historical_reliability=None,
        sample_confidence=None, adaptive_weight=None)
    if not insufficient:
        with localcontext() as ctx:
            ctx.prec = 40
            hit = Decimal(sum(a.direction_correct is True for a in evaluated))/n
            rate = Decimal(unable)/(n+unable)
            strength = min(Decimal(1), Decimal(n)/parameters.full_confidence_samples)
            weight = Decimal(1)+(hit-Decimal('0.5'))*parameters.sensitivity-min(parameters.unable_penalty,rate*parameters.unable_penalty)
            values = {k:decimal_text(v) for k,v in dict(direction_hit_rate=hit,
                average_return=sum(Decimal(a.return_percent) for a in evaluated)/n, unable_rate=rate,
                historical_reliability=hit, sample_confidence=strength,
                adaptive_weight=max(Decimal('0.75'), min(Decimal('1.25'), weight))).items()}
    probabilistic=[(o,a) for o,a in group if a and a.status=='evaluated' and o.confidence is not None and o.probability_event=='stance-match-v1']
    pn=len(probabilistic); bins=[]; brier=None
    if pn>=parameters.min_samples:
        with localcontext() as ctx:
            ctx.prec=40
            brier=decimal_text(sum((o.confidence-Decimal(int(a.direction_correct)))**2 for o,a in probabilistic)/pn)
            for index in range(5):
                bucket=[(o,a) for o,a in probabilistic if min(4,int(o.confidence*5))==index]
                count=len(bucket)
                # Small bins retain counts only; no apparent calibration from a tiny sample.
                reliable=count>=parameters.min_samples
                bins.append(dict(lower=decimal_text(Decimal(index)/5),upper=decimal_text(Decimal(index+1)/5),samples=count,
                    insufficient_data=not reliable,
                    mean_probability=decimal_text(sum(o.confidence for o,_ in bucket)/count) if reliable else None,
                    observed_frequency=decimal_text(Decimal(sum(a.direction_correct is True for _,a in bucket))/count) if reliable else None))
    return dict(samples=n, unable=unable, pending=pending, insufficient_data=insufficient,
        evaluation_ids=[a.id for a in evaluated], probability_samples=pn, probability_insufficient=pn<parameters.min_samples,
        brier_score=brier,calibration_bins=bins, **values)
