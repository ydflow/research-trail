export type ChartPeriod = '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
export const periodNames: Record<ChartPeriod, string> = { '1m': '1分钟', '5m': '5分钟', '15m': '15分钟', '1h': '1小时', '1d': '日K线', '1w': '周K线' };
