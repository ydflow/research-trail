import { useEffect, useState, type ReactNode } from 'react';
import type { SecurityPage, SecurityQuery } from '../../workspace-types';
import { FinancialKLineChart } from '../market/FinancialKLineChart';
import { SurfaceCard, StateNotice } from '../ui/Primitives';
import { BlockFrame, OverviewView, FinancialsView, NewsView, Source, display } from './SecurityViews';
import './security-overview.css';

const reads = ['quote', 'kline', 'financials', 'news'] as const;
type ReadView = typeof reads[number];
type ReadState = { page?: SecurityPage; error?: string };

// Compose only existing DTO reads. No financial calculations or new API.
// Each response belongs to the full symbol/provider/mode/revision context.
export function SecurityOverview({ page, requestKey, allowReal, navigation }: {
  page: SecurityPage; requestKey: string; allowReal: boolean; navigation: ReactNode;
}) {
  const [data, setData] = useState<Partial<Record<ReadView, ReadState>>>({});
  const symbol = page.symbol, provider = page.provider, mode = page.mode;
  const requestedAt = page.requested_at;
  useEffect(() => {
    let active = true;
    setData({});
    if (!symbol || mode === 'real' && !allowReal) return;
    for (const view of reads) {
      const body: SecurityQuery = { symbol, provider, mode, view, period: '1d', kind: 'ALL', report: 'annual', offset: 0 };
      void window.researchTrail!.securityPage(body).then(next => {
        if (!active) return;
        if (next.symbol !== symbol || next.provider !== provider || next.mode !== mode || next.view !== view) throw new Error('Context mismatch');
        setData(previous => ({ ...previous, [view]: { page: next } }));
      }).catch(() => { if (active) setData(previous => ({ ...previous, [view]: { error: '读取未完成，请刷新重试。' } })); });
    }
    return () => { active = false; };
  }, [symbol, provider, mode, requestedAt, requestKey, allowReal]);

  const quote = data.quote?.page?.blocks[0];
  const metric = (label: string) => quote?.metrics?.find(m => m.label === label);
  const change = metric('涨跌额');
  const lastPrice = metric('最新价')?.value;
  const direction = change?.value == null ? '' : Number(change.value) >= 0 ? 'positive' : 'negative';
  const signed = (value: string | number | null | undefined) => value == null ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}`;
  function pending(view: ReadView) {
    return <StateNotice kind={data[view]?.error ? 'error' : mode === 'real' && !allowReal ? 'info' : 'loading'}>
      {data[view]?.error ?? (mode === 'real' && !allowReal ? '等待显式查询，不自动请求真实数据。' : '读取已有证券数据…')}
    </StateNotice>;
  }
  if (!symbol) return <StateNotice kind="empty">没有选中的证券 · —。请在下方自选区域添加证券。</StateNotice>;
  return <div className="security-overview" data-testid="security-overview">
    <section className="security-quote-band" aria-label="证券报价摘要">
      {quote ? <>
        <div className="security-price-primary">
          <strong className={direction} data-testid="security-overview-price">{lastPrice == null ? '—' : Number(lastPrice).toFixed(2)}</strong>
          <span>{metric('最新价')?.unit || '币种未提供'}</span>
          <span className={direction} data-testid="security-overview-change">{signed(change?.value)} {change?.unit} · {signed(metric('涨跌幅')?.value)}{metric('涨跌幅')?.unit}</span>
        </div>
        <dl className="security-quote-metrics">{['开盘', '最高', '最低', '前收', '成交量'].map(label => <div key={label}><dt>{label}</dt><dd>{display(metric(label)?.value)}{metric(label)?.value != null && metric(label)?.unit ? ` ${metric(label)?.unit}` : ''}</dd></div>)}</dl>
        {quote.status !== 'ready' && <StateNotice kind={quote.status === 'missing' ? 'empty' : 'error'}>{quote.status === 'missing' ? '报价暂无数据' : '报价未就绪'} · {quote.code} · {quote.message}</StateNotice>}
        <Source block={quote} />
      </> : pending('quote')}
    </section>
    {navigation}
    <div className="security-overview-grid">
      <SurfaceCard className="security-overview-chart">
        <div className="overview-card-heading"><h3>价格走势 · 日K线</h3><span>{mode === 'simulated' ? '固定模拟日线' : '已有日线数据'}</span></div>
        {data.kline?.page ? data.kline.page.blocks.map((block, i) => <div key={i}>
          {block.bars?.length ? <FinancialKLineChart bars={block.bars} symbol={symbol!} dataLabel={mode === 'simulated' ? '模拟' : '真实'} /> : <StateNotice kind={block.status === 'missing' ? 'empty' : 'error'}>暂无K线 · — {block.code} {block.message}</StateNotice>}
          <Source block={block} />
        </div>) : pending('kline')}
      </SurfaceCard>
      <div className="security-overview-facts"><OverviewView page={{ ...page, blocks: page.blocks.filter(block => block.capability === 'company.valuation') }} /></div>
    </div>
    <div className="security-overview-secondary">
      <SurfaceCard className="security-overview-financials"><h3>财务报表</h3>{data.financials?.page ? <FinancialsView page={data.financials.page} /> : pending('financials')}</SurfaceCard>
      <SurfaceCard className="security-overview-news"><h3>新闻线索</h3>{data.news?.page ? <NewsView page={data.news.page} /> : pending('news')}</SurfaceCard>
      <div className="security-overview-profile"><OverviewView page={{ ...page, blocks: page.blocks.filter(block => block.capability !== 'company.valuation') }} /></div>
    </div>
  </div>;
}
