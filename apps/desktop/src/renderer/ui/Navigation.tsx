// Original code-native line icons; no external assets or icon dependency.
const paths = {
  market: 'M3 17V7m0 10h18M6 13l4-4 4 3 6-7',
  securities: 'M3 10l9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  portfolios: 'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',
  analytics: 'M3 21V3m0 18h18M7 17V9m5 8V5m5 12v-6',
  research: 'M6 4h12v17H6zM9 4V2h6v2M9 9h6m-6 4h6m-6 4h4',
  theses: 'M3 4h18v13H9l-6 4zM7 8h10m-10 4h6',
  discover: 'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
  calendar: 'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16m-12 4h2m4 0h2',
  today: 'M4 5h16v16H4zM8 2v6m8-6v6M8 14l3 3 5-6',
  evaluation: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6',
  outcomes: 'M3 21V3m0 18h18M6 16l4-5 4 2 6-8',
  skills: 'M12 2l9 5v10l-9 5-9-5V7zM8 9h8v6H8z',
  sessions: 'M3 3h14v12H9l-6 5zM17 7h4v14l-5-4h-3',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M10 15v6',
  providers: 'M5 3h14v18H5zM9 7h6m-6 5h6m-6 5h3',
} as const;
export type WorkbenchView = keyof typeof paths;
export const navigationGroups: { label: string; items: { id: WorkbenchView; label: string }[] }[] = [
  { label: '市场与资产', items: [{ id: 'market', label: '模拟行情' }, { id: 'securities', label: '证券工作台' }, { id: 'portfolios', label: '组合工作台' }, { id: 'analytics', label: '风险与对比' }] },
  { label: '研究分析', items: [{ id: 'research', label: '研究采集' }, { id: 'theses', label: '投资论点' }, { id: 'discover', label: '机会发现' }] },
  { label: '日程监控', items: [{ id: 'calendar', label: '事件日历' }, { id: 'today', label: 'Today与提醒' }] },
  { label: '评测结果', items: [{ id: 'evaluation', label: '评测中心' }, { id: 'outcomes', label: '投资结果' }] },
  { label: '系统配置', items: [{ id: 'skills', label: '能力与技能' }, { id: 'sessions', label: '会话与事件' }, { id: 'settings', label: '设置与诊断' }, { id: 'providers', label: '数据与只读账户' }] },
];

export function Navigation({ view, onSelect }: { view: WorkbenchView; onSelect: (view: WorkbenchView) => void }) {
  return <nav className="view-tabs grouped-navigation" aria-label="工作区">
    {navigationGroups.map(group => <div className="navigation-group" key={group.label}>
      <h2>{group.label}</h2>
      {group.items.map(item => <button key={item.id} aria-pressed={view === item.id} onClick={() => onSelect(item.id)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[item.id]} /></svg>
        <span>{item.label}</span>
      </button>)}
    </div>)}
  </nav>;
}
