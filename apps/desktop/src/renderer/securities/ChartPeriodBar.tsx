import { periodNames, type ChartPeriod } from '../market/chart-periods';

export function ChartPeriodBar({ period, onChange }: { period: ChartPeriod; onChange: (value: ChartPeriod) => void }) {
  return <div className="security-period-bar" role="group" aria-label="证券K线周期切换">
    {(Object.keys(periodNames) as ChartPeriod[]).map(value => <button key={value} aria-pressed={period === value} onClick={() => onChange(value)}>{periodNames[value]}</button>)}
    <label><select aria-label="证券K线周期" value={period} onChange={e => onChange(e.target.value as ChartPeriod)}>{Object.keys(periodNames).map(value => <option key={value}>{value}</option>)}</select></label>
  </div>;
}
