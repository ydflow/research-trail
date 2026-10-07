"""Authored fixed examples, not real financial/macro schedules or Folio data imports."""
from copy import deepcopy
from datetime import datetime, timezone

REFERENCE_TIME = datetime(2024,1,16,21,tzinfo=timezone.utc)
ROWS = [
    dict(id='authored-aapl-earnings',kind='earnings',type='financial',title='模拟 Apple 财报预告',
         content='固定合成事件，非公司实际披露安排。',symbol='AAPL.US',timezone='America/New_York',
         scheduled_at='2024-01-16T17:00:00-05:00',status='announced',updated_at='2024-01-15T12:00:00Z'),
    dict(id='authored-hk-earnings',kind='earnings',type='financial',title='模拟港股财报日期',
         content='仅提供日期与盘后提示，不含准确披露时刻。',symbol='0700.HK',timezone='Asia/Hong_Kong',
         local_date='2024-01-17',date_type='盘后',status='announced'),
    dict(id='authored-tsla-earnings',kind='earnings',type='financial',title='模拟 Tesla 已过财报预告',
         content='预告已过，来源没有发生确认。',symbol='TSLA.US',timezone='America/New_York',
         scheduled_at='2024-01-15T17:00:00-05:00',status='announced'),
    dict(id='authored-pce',kind='macro',type='macrodata',title='模拟 PCE 发布预告',
         content='固定宏观示例，不代表真实发布日历。',timezone='America/New_York',
         scheduled_at='2024-01-18T08:30:00-05:00',status='announced'),
    dict(id='authored-macro-confirmed',kind='macro',type='macrodata',title='模拟已发布宏观事件',
         content='来源显式提供发生时刻；不是根据当前查询时刻推断。',timezone='UTC',
         scheduled_at='2024-01-16T13:30:00Z',occurred_at='2024-01-16T13:31:00Z',status='occurred'),
    dict(id='authored-fomc',kind='central-bank',type='macrodata',activity_type='central-bank',title='模拟 FOMC 决议预告',
         content='央行固定模拟示例；真实提供商独立央行覆盖尚未实现。',timezone='America/New_York',
         scheduled_at='2024-01-19T14:00:00-05:00',status='announced'),
]

def authored_calendar_data(query):
    wanted='earnings' if query.event_type=='financial' else 'macro'
    rows=[deepcopy(r) for r in ROWS if (r['kind']=='earnings')==(wanted=='earnings')]
    if query.symbol: rows=[r for r in rows if r.get('symbol')==query.symbol]
    # Duplicate provider entry deliberately exercises canonical event identity.
    if rows: rows.append(deepcopy(rows[0]))
    return {'list':rows[:query.count]}
