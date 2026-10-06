// Adapted from Folio packages/ui/src/components/chart/FinancialKLineChart.tsx:
// chart lifecycle, loader, seconds->milliseconds conversion, symbol and resize handling.
// ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326; https://github.com/helsome/folio.
// Indicator/period UI omitted for this step. Scope/license record: docs/EVIDENCE.md §8.
import { useEffect, useRef } from 'react';
import { dispose, init, type Chart, type DeepPartial, type Styles } from 'klinecharts';
import type { Kline } from '../../market-types';

function resolveColor(el: HTMLElement, name: string, fallback: string) {
  return window.getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}
export function FinancialKLineChart({ bars, symbol, period = '1d', dataLabel = '模拟' }: { bars: Kline[]; symbol: string; period?: '1m' | '5m' | '15m' | '1h' | '1d' | '1w'; dataLabel?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const barsRef = useRef(bars);
  const hasData = bars.length > 0;
  useEffect(() => {
    if (!hasData || !containerRef.current) return;
    const el = containerRef.current;
    const upColor = resolveColor(el, '--positive', '#14685a');
    const downColor = resolveColor(el, '--negative', '#a24333');
    const mutedColor = resolveColor(el, '--text-muted', '#67736e');
    const styles: DeepPartial<Styles> = {
      grid: { horizontal: { color: '#e6ece9' }, vertical: { color: '#f3f5f4' } },
      candle: { bar: { upColor, downColor, noChangeColor: upColor, upBorderColor: upColor,
        downBorderColor: downColor, noChangeBorderColor: upColor, upWickColor: upColor,
        downWickColor: downColor, noChangeWickColor: upColor } },
      xAxis: { tickText: { color: mutedColor } }, yAxis: { tickText: { color: mutedColor } },
    };
    const chart = init(el, { styles, timezone: 'UTC' });
    if (!chart) return;
    chartRef.current = chart;
    const fitExample = () => {
      chart.setBarSpace(Math.min(50, Math.max(16, (el.clientWidth - 120) / barsRef.current.length)));
      chart.setOffsetRightDistance(36);
      chart.scrollToRealTime(0);
    };
    chart.setDataLoader({ getBars: ({ callback }) => {
      const data = barsRef.current.map((bar) => ({ ...bar, timestamp: bar.timestamp * 1000 }));
      callback(data, false);
      fitExample();
      // Evidence reads the chart's accepted data, rather than merely the React props.
      const loaded = chart.getDataList();
      el.dataset.loadedSymbol = chart.getSymbol()?.ticker || '';
      el.dataset.loadedClose = String(loaded.at(-1)?.close ?? '');
      el.dataset.loadedCount = String(loaded.length);
      el.dataset.loadedPeriod = JSON.stringify(chart.getPeriod());
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (chartRef.current !== chart) return;
        const range = chart.getVisibleRange();
        el.dataset.visibleFrom = String(range.from);
        el.dataset.visibleTo = String(range.to);
        const point = chart.convertToPixel({ dataIndex: loaded.length - 1, value: loaded.at(-1)?.close });
        if (!Array.isArray(point)) {
          el.dataset.lastX = String(point.x);
          el.dataset.lastY = String(point.y);
        }
      }));
    } });
    const observer = new ResizeObserver(() => { chart.resize(); fitExample(); });
    observer.observe(el);
    return () => { observer.disconnect(); dispose(el); chartRef.current = null; };
  }, [hasData]);
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    barsRef.current = bars;
    chart.setSymbol({ exchange: '', shortName: symbol.split('.')[0], ticker: symbol });
    chart.setPeriod(period === '1d' ? { type: 'day', span: 1 } : period === '1w' ? { type: 'week', span: 1 } : { type: 'minute', span: period === '1h' ? 60 : Number(period.slice(0, -1)) });
    chart.resetData();
  }, [symbol, bars, period]);
  return <div ref={containerRef} data-testid="chart-canvas" className="chart-canvas" aria-label={`${symbol} ${dataLabel}${period === '1d' ? '日K线' : period + ' K线'}`} />;
}
