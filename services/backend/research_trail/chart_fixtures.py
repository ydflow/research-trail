"""Deterministic, authored chart examples. Never historical exchange data.

Opted into only by the security workspace in simulated mode. Legacy market,
Agent and analytics fixtures retain their original ten bars. Intraday examples
use a continuous synthetic timeline, not an exchange session calendar.
"""
from datetime import datetime, timedelta, timezone

from .market import FixtureMarketProvider

LIMIT = 260


def aggregate(rows, span):
    """Aggregate actual example OHLCV by UTC bucket; never relabel daily bars."""
    buckets = {}
    for row in rows:
        bucket = row['timestamp'] // span * span
        if bucket not in buckets:
            buckets[bucket] = {**row, 'timestamp': bucket}
        else:
            bar = buckets[bucket]
            bar['high'] = max(bar['high'], row['high'])
            bar['low'] = min(bar['low'], row['low'])
            bar['close'] = row['close']
            bar['volume'] += row['volume']
    return list(buckets.values())


def authored_chart_data(query):
    snapshot = FixtureMarketProvider().snapshot(query.symbol)
    old = [bar.model_dump() for bar in snapshot.klines]
    count = min(query.count, LIMIT)
    if query.period in ('1d', '1w'):
        days = []
        cursor = datetime.fromtimestamp(old[0]['timestamp'], timezone.utc)
        while len(days) < LIMIT - len(old):
            cursor -= timedelta(days=1)
            if cursor.weekday() < 5:
                days.append(int(cursor.timestamp()))
        prefix = []
        anchor = round(old[0]['open'] * 100)
        for index, timestamp in enumerate(reversed(days)):
            closing = max(100, anchor - (len(days) - index) * 3 + (index % 23 - 11) * 8)
            opening = round(prefix[-1]['close'] * 100) if prefix else closing + 30
            prefix.append(dict(timestamp=timestamp, open=opening / 100,
                high=(max(opening, closing) + 90) / 100,
                low=(min(opening, closing) - 70) / 100, close=closing / 100,
                volume=700_000 + index % 17 * 31_000))
        rows = prefix + old
        if query.period == '1w':
            # Unix epoch is Thursday; shift to Monday UTC weekly bucket starts.
            shifted = [{**row, 'timestamp': row['timestamp'] + 3 * 86400} for row in rows]
            rows = [{**row, 'timestamp': row['timestamp'] - 3 * 86400}
                    for row in aggregate(shifted, 7 * 86400)]
        return rows[-count:]
    span = {'1m': 1, '5m': 5, '15m': 15, '1h': 60}[query.period]
    end = int(snapshot.market_time.timestamp()) // 60
    anchor = round(snapshot.quote.last_price * 100)
    def price(minute):
        distance = end - 1 - minute
        return max(100, anchor - distance // 60 + (distance % 31) * 2 - (distance % 7) * 3)
    rows = []
    for minute in range(end - LIMIT * span, end):
        opening, closing = price(minute - 1), price(minute)
        rows.append(dict(timestamp=minute * 60, open=opening / 100,
            high=(max(opening, closing) + 12) / 100,
            low=(min(opening, closing) - 10) / 100, close=closing / 100,
            volume=1000 + minute % 19 * 73))
    return aggregate(rows, span * 60)[-count:]
