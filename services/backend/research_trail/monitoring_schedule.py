"""Pure timezone scheduling. ISO weekdays; nonexistent DST wall times are skipped."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SCHEDULED={'watchlist-daily-review','portfolio-daily-brief','weekly-thesis-review'}

def next_due(rule,after):
    zone=ZoneInfo(rule.timezone); local=after.astimezone(zone)
    for offset in range(15):
        day=local.date()+timedelta(days=offset)
        if day.isoweekday() not in rule.days: continue
        wall=datetime(day.year,day.month,day.day,rule.hour,rule.minute,tzinfo=zone,fold=0)
        instant=wall.astimezone(timezone.utc)
        if instant.astimezone(zone).replace(tzinfo=None)!=wall.replace(tzinfo=None): continue
        if instant>after: return instant
    raise ValueError('没有有效下次计划')
