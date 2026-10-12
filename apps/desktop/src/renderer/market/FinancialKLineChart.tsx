// Originally adapted from Folio packages/ui/src/components/chart/FinancialKLineChart.tsx.
// ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326; https://github.com/helsome/folio.
// P2-06 adds ResearchTrail controls around the existing KLineCharts engine.
// Source and license boundaries: docs/EVIDENCE.md and docs/PHASE2-SECURITY-KLINE.md.
import { useEffect, useMemo, useRef, useState } from 'react';
import { dispose, init, type Chart, type Crosshair, type DeepPartial, type KLineData, type Styles } from 'klinecharts';
import type { Kline } from '../../market-types';
import { StateNotice } from '../ui/Primitives';
import './financial-kline.css';

export type ChartPeriod = '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
export const periodNames: Record<ChartPeriod, string> = { '1m': '1分钟', '5m': '5分钟', '15m': '15分钟', '1h': '1小时', '1d': '日K线', '1w': '周K线' };

// Display-boundary validation only; prices and indicators remain Python/library owned.
function prepare(bars: Kline[]) {
  let previous = 0;
  const data: KLineData[] = [];
  for (const bar of bars) {
    if (!Number.isSafeInteger(bar.timestamp) || bar.timestamp <= previous || bar.timestamp * 1000 > 8.64e15 ||
        ![bar.open, bar.high, bar.low, bar.close].every(n => Number.isFinite(n) && n > 0) ||
        bar.low > Math.min(bar.open, bar.close) || bar.high < Math.max(bar.open, bar.close) ||
        bar.volume != null && (!Number.isSafeInteger(bar.volume) || bar.volume < 0)) {
      return { data: [], error: 'K线数据无效：时间或 OHLCV 不一致，请刷新重试。' };
    }
    previous = bar.timestamp;
    data.push({ timestamp: bar.timestamp * 1000, open: bar.open, high: bar.high, low: bar.low, close: bar.close,
      ...(bar.volume == null ? {} : { volume: bar.volume }) });
  }
  return { data, error: '' };
}

function color(el: HTMLElement, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

export function FinancialKLineChart({ bars, symbol, period = '1d', dataLabel = '模拟', professional = false, currency }: {
  bars: Kline[]; symbol: string; period?: ChartPeriod; dataLabel?: string; professional?: boolean; currency?: string;
}) {
  const prepared = useMemo(() => prepare(bars), [bars]);
  const dataRef = useRef(prepared.data); dataRef.current = prepared.data;
  const selectionContext = { data: prepared.data, symbol, period };
  const selectionContextRef = useRef(selectionContext); selectionContextRef.current = selectionContext;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<(typeof selectionContext) & { timestamp: number }>();
  const [initError, setInitError] = useState('');
  const [averages, setAverages] = useState([5, 10, 20]);
  const [volume, setVolume] = useState(true);
  const hasData = prepared.data.length > 0;
  const completeVolume = hasData && prepared.data.every(bar => bar.volume != null);

  useEffect(() => {
    if (!hasData || !containerRef.current) return;
    const el = containerRef.current;
    const upColor = color(el, '--positive', '#14685a'), downColor = color(el, '--negative', '#a24333');
    const styles: DeepPartial<Styles> = {
      grid: { horizontal: { color: '#e6ece9' }, vertical: { color: '#f3f5f4' } },
      candle: { tooltip: professional ? { showRule: 'none' } : {}, bar: { upColor, downColor, noChangeColor: upColor, upBorderColor: upColor,
        downBorderColor: downColor, noChangeBorderColor: upColor, upWickColor: upColor,
        downWickColor: downColor, noChangeWickColor: upColor } },
      indicator: { bars: [{ upColor, downColor, noChangeColor: upColor }] },
      xAxis: { tickText: { color: color(el, '--text-muted', '#67736e'), size: 10 } },
      yAxis: { tickText: { color: color(el, '--text-muted', '#67736e'), size: 10 } },
    };
    const chart = init(el, { styles, timezone: 'UTC', locale: 'zh-CN' });
    if (!chart) { setInitError('图表初始化失败，请离开页面后重试。'); return; }
    setInitError(''); chartRef.current = chart;
    let disposed = false;
    const frames = new Set<number>();
    const events = { zoom: 0, scroll: 0, resize: 0 };
    function later(callback: () => void) {
      const id = requestAnimationFrame(() => { frames.delete(id); if (!disposed) callback(); }); frames.add(id);
    }
    function inspect() {
      if (disposed) return;
      const loaded = chart!.getDataList(), range = chart!.getVisibleRange();
      el.dataset.loadedSymbol = chart!.getSymbol()?.ticker || '';
      el.dataset.loadedClose = String(loaded.at(-1)?.close ?? '');
      el.dataset.loadedCount = String(loaded.length);
      el.dataset.loadedPeriod = JSON.stringify(chart!.getPeriod());
      el.dataset.visibleFrom = String(range.from); el.dataset.visibleTo = String(range.to);
      const point = chart!.convertToPixel({ dataIndex: loaded.length - 1, value: loaded.at(-1)?.close });
      if (!Array.isArray(point)) { el.dataset.lastX = String(point.x); el.dataset.lastY = String(point.y); }
    }
    // Read-only evidence from the live engine, not a duplicate of React props.
    // No mutation API or business/bridge state is exposed here.
    Object.defineProperty(el, 'chartEvidence', { configurable: true, get: () => disposed ? { disposed: true } : ({
      disposed: false, data: chart.getDataList(), symbol: chart.getSymbol(), period: chart.getPeriod(),
      range: chart.getVisibleRange(), barSpace: chart.getBarSpace().bar, events: { ...events },
      indicators: chart.getIndicators().map(i => ({ name: i.name, paneId: i.paneId, params: i.calcParams, result: i.result })),
    }) });
    const reset = () => {
      chart.setBarSpace(professional ? Math.min(30, Math.max(6, (el.clientWidth - 80) / Math.min(dataRef.current.length, 80))) :
        Math.min(50, Math.max(16, (el.clientWidth - 120) / dataRef.current.length)));
      chart.setOffsetRightDistance(36); chart.scrollToRealTime(0); later(() => later(inspect));
    };
    resetRef.current = reset;
    chart.setDataLoader({ getBars: ({ type, callback }) => {
      callback(type === 'init' ? dataRef.current : [], false);
      if (type === 'init') { setSelected(undefined); reset(); inspect(); }
    } });
    const crosshair = (value?: unknown) => {
      const cursor = value as Crosshair | undefined;
      // v10 emits pane-local coordinates, not necessarily the enriched kLineData.
      const converted = cursor?.x == null ? undefined : chart.convertFromPixel([{ x: cursor.x, y: cursor.y ?? 0 }], { paneId: cursor.paneId });
      const point = Array.isArray(converted) ? converted[0] : converted;
      const bar = cursor?.kLineData ?? (point?.dataIndex != null ? chart.getDataList()[point.dataIndex] : undefined);
      const context = selectionContextRef.current;
      setSelected(previous => bar ? previous?.timestamp === bar.timestamp && previous.data === context.data &&
        previous.symbol === context.symbol && previous.period === context.period ? previous :
        { ...context, timestamp: bar.timestamp } : undefined);
    };
    const zoom = () => { events.zoom++; later(inspect); };
    const scroll = () => { events.scroll++; later(inspect); };
    chart.subscribeAction('onCrosshairChange', crosshair);
    chart.subscribeAction('onZoom', zoom); chart.subscribeAction('onScroll', scroll);
    chart.subscribeAction('onVisibleRangeChange', inspect);
    const observer = new ResizeObserver(() => { events.resize++; chart.resize(); later(inspect); });
    observer.observe(el);
    return () => {
      disposed = true; observer.disconnect(); frames.forEach(cancelAnimationFrame);
      chart.unsubscribeAction('onCrosshairChange', crosshair);
      chart.unsubscribeAction('onZoom', zoom); chart.unsubscribeAction('onScroll', scroll);
      chart.unsubscribeAction('onVisibleRangeChange', inspect);
      dispose(el); chartRef.current = null; resetRef.current = null;
    };
  }, [hasData, professional]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setSymbol({ exchange: '', shortName: symbol.split('.')[0], ticker: symbol });
    chart.setPeriod(period === '1d' ? { type: 'day', span: 1 } : period === '1w' ? { type: 'week', span: 1 } :
      { type: 'minute', span: period === '1h' ? 60 : Number(period.slice(0, -1)) });
    chart.resetData();
  }, [symbol, prepared.data, period]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !professional) return;
    chart.removeIndicator({ name: 'MA' }); chart.removeIndicator({ name: 'VOL' });
    const params = averages.filter(p => prepared.data.length >= p);
    if (params.length) chart.createIndicator({ name: 'MA', paneId: 'candle_pane', calcParams: params });
    if (volume && completeVolume) {
      chart.createIndicator({ name: 'VOL', paneId: 'volume_pane', calcParams: [] });
      chart.setPaneOptions({ id: 'volume_pane', height: 64, minHeight: 50, dragEnabled: false });
    }
  }, [hasData, professional, prepared.data, averages, volume, completeVolume]);

  // Resolve OHLCV from this batch, never from a cached candle. This also guards
  // the render before resetData effects and the no-data/disposed-chart path.
  const bar = (selected?.data === prepared.data && selected.symbol === symbol && selected.period === period ?
    prepared.data.find(row => row.timestamp === selected.timestamp) : undefined) ?? prepared.data.at(-1);
  const number = (value?: number) => value == null ? '未提供' : value.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  return <div className={professional ? 'professional-chart' : 'basic-chart'}>
    {professional && <>
      <div className="chart-controls" aria-label="K线图表工具栏">
        <span className="chart-period-label">{periodNames[period]} · {prepared.data.length} 根 · UTC{currency ? ` · ${currency}` : ''}</span>
        <div className="chart-actions">
          <button disabled={!hasData} aria-label="放大K线" onClick={() => chartRef.current?.zoomAtCoordinate(.3)}>＋</button>
          <button disabled={!hasData} aria-label="缩小K线" onClick={() => chartRef.current?.zoomAtCoordinate(-.3)}>−</button>
          <button disabled={!hasData} onClick={() => resetRef.current?.()}>图表复位</button>
        </div>
        <div className="chart-indicators">{[5, 10, 20].map(p => <label key={p}><input type="checkbox" aria-label={`MA${p}`} checked={averages.includes(p) && prepared.data.length >= p} disabled={prepared.data.length < p} onChange={e => setAverages(prev => e.target.checked ? [...prev, p].sort((a, b) => a - b) : prev.filter(n => n !== p))} />MA{p}</label>)}
          <label><input type="checkbox" aria-label="成交量指标" checked={volume && completeVolume} disabled={!completeVolume} onChange={e => setVolume(e.target.checked)} />成交量</label>
        </div>
      </div>
      <div className="chart-readout" data-testid="chart-readout" data-timestamp={bar?.timestamp ?? ''}>
        <time>{bar ? new Date(bar.timestamp).toISOString().replace('T', ' ').slice(0, 16) : '暂无数据'} UTC</time>
        <span>开 <b>{number(bar?.open)}</b></span><span>高 <b>{number(bar?.high)}</b></span>
        <span>低 <b>{number(bar?.low)}</b></span><span>收 <b>{number(bar?.close)}</b></span><span>量 <b>{number(bar?.volume)}</b></span>
      </div>
    </>}
    {prepared.error ? <StateNotice kind="error">{prepared.error}</StateNotice> : !hasData ? <StateNotice kind="empty">暂无K线数据</StateNotice> : null}
    {initError && <StateNotice kind="error">{initError}</StateNotice>}
    {hasData && <div ref={containerRef} data-testid="chart-canvas" className="chart-canvas" aria-label={`${symbol} ${dataLabel}${period === '1d' ? '日K线' : period + ' K线'}`} />}
    {professional && hasData && (!completeVolume || prepared.data.length < 20) && <p className="chart-limits">
      {!completeVolume ? '成交量未完整提供，已隐藏量柱，不补零。' : ''}{prepared.data.length < 20 ? ' 样本不足的 MA 指标不绘制。' : ''}
    </p>}
  </div>;
}
