import { lazy, Suspense } from 'react';
const Chart = lazy(() => import('./FinancialKLineChart').then(module => ({ default: module.FinancialKLineChart })));
export function FinancialKLineChart(props: Parameters<typeof Chart>[0]) {
  return <Suspense fallback={<p role="status">图表加载中…</p>}><Chart {...props} /></Suspense>;
}
