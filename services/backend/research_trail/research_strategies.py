"""Fixed Folio strategy mapping, expressed in Python without a TS business kernel.

Source: https://github.com/helsome/folio ba5dcdfd31b162f5edb8b908f7f099a560389326
packages/shared/src/strategies/presets.ts; Chinese labels: i18n/zh-CN/research.ts.
Skills are references to the existing catalog, never duplicated prompts or code.
"""
from .research_contracts import ResearchStrategy

COMPREHENSIVE = ('market.quote', 'market.kline', 'market.intraday', 'market.depth', 'market.trades',
    'market.capitalFlow', 'market.sentiment', 'market.status', 'company.profile', 'company.valuation',
    'company.financials', 'company.dividends', 'company.earnings', 'company.ratings', 'research.news', 'research.events')

_PRESETS = (
    ('comprehensive', '全面', '覆盖市场、公司与研究数据。',
     ('longbridge', 'longbridge-market-data', 'longbridge-technical', 'longbridge-fundamentals', 'longbridge-quant',
      'longbridge-research', 'longbridge-derivatives', 'longbridge-earnings', 'longbridge-intel', 'longbridge-content',
      'longbridge-portfolio', 'longbridge-value-investing', 'longbridge-watchlist'), COMPREHENSIVE),
    ('value', '价值投资', '采集公司资料、估值、财务与股息历史。',
     ('longbridge-fundamentals', 'longbridge-value-investing'),
     ('company.profile', 'company.valuation', 'company.financials', 'company.dividends')),
    ('growth', '成长', '采集估值、财务与盈利数据。', ('longbridge-earnings', 'longbridge-fundamentals'),
     ('company.valuation', 'company.financials', 'company.earnings')),
    ('technical', '技术面', '采集日K线、盘中、盘口、成交与市场温度。', ('longbridge-technical',),
     ('market.kline', 'market.intraday', 'market.depth', 'market.trades', 'market.sentiment')),
    ('earnings', '财报', '采集盈利、新闻与财报事件。', ('longbridge-earnings',),
     ('company.earnings', 'research.news', 'research.events')),
    ('event-driven', '事件驱动', '采集股息、评级、新闻与事件。', ('longbridge-content', 'longbridge-research'),
     ('company.dividends', 'company.ratings', 'research.news', 'research.events')),
    ('risk-review', '风险复核', '采集价格趋势、财务、评级与新闻。', ('longbridge-research', 'longbridge-fundamentals'),
     ('market.kline', 'company.financials', 'company.ratings', 'research.news')),
    ('income', '稳健收益', '采集公司资料、财务、股息与盈利。', ('longbridge-fundamentals',),
     ('company.profile', 'company.financials', 'company.dividends', 'company.earnings')),
)

def strategies():
    return [ResearchStrategy(id=i, name=n, description=d, skill_ids=list(s), capability_ids=list(c))
            for i, n, d, s, c in _PRESETS]
