// Adapted from Folio packages/ui/src/components/agent/ToolActivity.tsx,
// ZIP ba5dcdfd31b162f5edb8b908f7f099a560389326, https://github.com/helsome/folio.
// Collapsible tool timeline/duration retained; i18n, lucide, Tailwind and core
// types replaced with ResearchTrail's frontend adapter. Scope: EVIDENCE §18.
import { useState } from 'react';
import type { ToolView } from './session-adapter';

function formatDuration(startedAt: number, completedAt: number | undefined): string | null {
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt! < startedAt) return null;
  return `${((completedAt! - startedAt) / 1000).toFixed(1)}s`;
}
const labels = { running: '执行中', success: '已返回', error: '失败', cancelled: '已取消', timed_out: '已超时', interrupted: '已中断' };

export function ToolActivity({ toolCalls }: { toolCalls: ToolView[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!toolCalls.length) return null;
  const running = toolCalls.some((call) => call.status === 'running');
  return <div className="tool-activity" data-testid="tool-activity">
    <button type="button" className="secondary" data-testid="tool-activity-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {running ? 'Python工具执行中' : `${toolCalls.length} 次Python工具调用`} · {expanded ? '收起' : '展开'}
    </button>
    {expanded && <ul>{toolCalls.map((call) => <li key={call.id} data-testid="tool-activity-call">
      <strong>{call.name}</strong><span>{call.symbol}</span><span>{labels[call.status]}</span>
      {formatDuration(call.startedAt, call.completedAt) && <time>{formatDuration(call.startedAt, call.completedAt)}</time>}
    </li>)}</ul>}
  </div>;
}
