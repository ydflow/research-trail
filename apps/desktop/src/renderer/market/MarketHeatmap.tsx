import { useState } from 'react';
import type { OverviewRow } from '../../market-overview-types';
import { colorBand, number, percent, unit, utc } from './overview-display';

const LEGEND = [['loss-3','≤ −3%'],['loss-2','(−3%, −1%]'],['loss-1','(−1%, 0)'],['flat','0%'],['gain-1','(0, +1%)'],['gain-2','[+1%, +3%)'],['gain-3','≥ +3%'],['missing','缺失']];

export function MarketHeatmap({ rows, selectedId, onSelect }: { rows: OverviewRow[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState<string>();
  const row = rows.find(item => item.asset.id === hovered);
  return <section className="overview-heatmap" aria-label="等面积热力图">
    <div className="overview-section-heading"><h3>市场表现热力图</h3><span>等面积热力格 · 不代表市值 / 成交额权重</span></div>
    <div className="heatmap-legend" aria-label="涨跌幅颜色图例">{LEGEND.map(([band,label]) => <span key={band}><i className={`heat-${band}`} />{label}</span>)}</div>
    <p className="overview-hint">绿涨 · 红跌；分档边界见悬停说明。分类仅为自主示例分组或未分类。</p>
    <div className="overview-heat-grid" data-testid="overview-heat-grid">{rows.map(item => <button key={item.asset.id}
      className={`overview-heat-tile heat-${colorBand(item.change_percent)}`} data-band={colorBand(item.change_percent)} data-weight="1"
      aria-label={`选择行情 ${item.asset.symbol} ${percent(item.change_percent)}`} aria-pressed={selectedId === item.asset.id}
      aria-describedby={row?.asset.id === item.asset.id ? 'overview-heat-tooltip' : undefined}
      onMouseEnter={() => setHovered(item.asset.id)} onMouseLeave={() => setHovered(undefined)}
      onFocus={() => setHovered(item.asset.id)} onBlur={() => setHovered(undefined)} onClick={() => onSelect(item.asset.id)}>
      <strong>{item.asset.name}</strong><span>{item.asset.symbol}</span><b>{percent(item.change_percent)}</b>
    </button>)}</div>
    <div className="overview-heat-tooltip" id="overview-heat-tooltip" role={row ? 'tooltip' : undefined}>
      {row ? <><strong>{row.asset.symbol} · {row.asset.name}</strong><span>最新价 {number(row.last_price, 6)} {unit(row)} · 涨跌额 {number(row.change, 6)} · 涨跌幅 {percent(row.change_percent)} · {row.change_basis === 'rolling_24h' ? '滚动24h' : '较前收'}</span><span>自主离线样例 · {utc(row.market_time)} · 市值 — · {row.classification ?? '未分类'}</span></> : <span>悬停或键盘聚焦查看来源与数值；点击格子选中详情。</span>}
    </div>
  </section>;
}
