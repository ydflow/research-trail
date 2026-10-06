// Adapted counts/progress/per-capability rows from Folio ResearchPanel RunProgressCard.
// Fixed ba5dcdfd; local collection states replace report/synthesis completion.
import type { ResearchRun } from '../../research-types';
export const researchLabels = { fetching: '采集中', collected: '采集完成', partial: '部分采集', failed: '采集失败', cancelled: '已取消', interrupted: '已中断' };
const stepLabels = { queued: '等待', running: '读取中', success: '已采集', failed: '失败', unavailable: '不可用', timed_out: '超时', cancelled: '已取消', interrupted: '已中断' };

export function RunProgressCard({ run, busy, onCancel, onRead }: {
  run: ResearchRun; busy: boolean; onCancel: () => void; onRead: (capability: string) => void;
}) {
  return <section data-testid="research-run" data-run-id={run.id} data-status={run.status}>
    <h3>已保存任务：{run.symbol} · {run.strategy}</h3>
    <p role="status" data-testid="research-status">{researchLabels[run.status]} · 已结束 {run.completed}/{run.total} · 已采集 {run.succeeded} · 失败或不可用 {run.failed}</p>
    <progress aria-label="采集进度" max={Math.max(1, run.total)} value={run.completed} />
    <p>{run.mode === 'simulated' ? '模拟数据' : '真实模式'} · {run.provider} · 并发上限 {run.plan.input.concurrency} · 单项限时 {run.plan.timeout_seconds} 秒</p>
    <p>进度表示采集项已结束；采集完成不代表报告、数据完整或投资结论。</p>
    {run.status === 'fetching' && <button disabled={busy} onClick={onCancel}>取消整项采集</button>}
    <ul className="research-steps">{run.steps.map(s => <li key={s.capability} data-capability={s.capability} data-status={s.status}>
      <span>{s.capability} · {stepLabels[s.status]} {s.code && `· ${s.code}`}</span>
      {s.has_result && <button disabled={busy} onClick={() => onRead(s.capability)}>读取结果 {s.capability}</button>}
    </li>)}</ul>
    <details><summary>已保存计划与技能资料状态</summary><p>{run.plan.source}</p>
      <p>状态是创建计划时的记录；资料选择不执行技能指令，缺少资料不伪造为就绪。</p>
      <ul>{run.plan.skills.map(s => <li key={s.id}>{s.id} · {s.status} · {s.code}</li>)}</ul>
      <p>开始：{run.started_at}；结束：{run.completed_at ?? '尚未结束'}</p>
    </details>
  </section>;
}
