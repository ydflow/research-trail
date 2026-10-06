// Adapted accessible strategy rows from Folio StrategyPicker.tsx; Python supplies
// all eight presets instead of a renderer mirror, i18n store or TS planner.
// https://github.com/helsome/folio ba5dcdfd31b162f5edb8b908f7f099a560389326.
import type { ResearchStrategy, StrategyId } from '../../research-types';

export function StrategyPicker({ strategies, value, disabled, onChange }: {
  strategies: ResearchStrategy[]; value: StrategyId; disabled: boolean; onChange: (id: StrategyId) => void;
}) {
  return <fieldset disabled={disabled} className="strategy-picker" data-testid="strategy-picker">
    <legend>研究策略（本步仅选择数据采集计划）</legend>
    <div className="strategy-options">{strategies.map(s => <label key={s.id} className={s.id === value ? 'selected' : ''}>
      <input type="radio" name="research-strategy" value={s.id} checked={s.id === value} onChange={() => onChange(s.id)} />
      <span><strong>{s.name}</strong><small>{s.description}</small></span>
    </label>)}</div>
  </fieldset>;
}
