// Folio service/checkpoint concepts, fixed ba5dcdfd; Python owns every transition.
import { useEffect, useRef, useState } from 'react';
import type { ResearchRun, RecoveryView } from '../../research-types';

const labels = { collecting: '采集中', collection_interrupted: '采集中断，等待显式恢复', report_generating: '报告正在生成', awaiting_report: '采集已保存，等待显式生成报告', completed: '已有完成报告', no_data: '没有成功数据，不能生成报告', abandoned: '原任务已放弃，历史保留', blocked: '恢复受阻' };
const reasons: Record<string, string> = { CONFIG_CHANGED: '采集配置或凭证引用已改变，请重新发起新任务。', CREDENTIAL_MISSING: '凭证缺失，不能续采。', CREDENTIAL_INVALID: '凭证格式失效，不能续采。', EVIDENCE_MISSING: '检查点所需证据缺失。', EVIDENCE_CHANGED: '原始证据已改变。', CHECKPOINT_MISSING: '检查点不存在。', CHECKPOINT_INVALID: '检查点损坏或版本不支持。', CHECKPOINT_MISMATCH: '检查点与数据库状态不符。', PLAN_CHANGED: '已保存计划被改变。', MODEL_CONFIG_CHANGED: '模型配置已改变；恢复不会调用模型。', MODEL_CREDENTIAL_MISSING: '模型凭证缺失；读取历史不需要再次调用模型。', REAL_READINESS_RECHECK_ON_RESUME: '真实能力就绪状态须在续采时重新确认，旧结果不代表当前服务可用。', LEGACY_IDENTITY_UNKNOWN: '旧计划缺少配置身份记录，请重新发起。' };

export function RecoveryPanel({ run, available, onRun, onBusy, refresh }: { run: ResearchRun; available: boolean; onRun: (next: ResearchRun) => void; onBusy: (busy: boolean) => void; refresh: number }) {
  const [view, setView] = useState<RecoveryView>(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const activeOperation = useRef(false), generation = useRef(0), operationGeneration = useRef(0);
  // Metadata refreshes may invalidate reads, but must not discard an action reply.
  useEffect(() => () => { ++operationGeneration.current; }, [available, run.id]);
  useEffect(() => {
    let active = true; let timer: ReturnType<typeof setTimeout>;
    const ticket = ++generation.current;
    async function load() {
      if (!available) return;
      try {
        const next = await window.researchTrail!.researchCheckpoint(run.id);
        if (!active || ticket !== generation.current) return;
        setView(next); setError('');
        if (next.stage === 'collecting' || next.stage === 'report_generating') timer = setTimeout(() => void load(), 1000);
      } catch (e) { if (active && ticket === generation.current) setError(e instanceof Error ? e.message : '无法读取检查点。'); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); ++generation.current; };
  }, [available, run.id, run.generation, run.status, run.abandoned_at, revision, refresh]);

  async function act(operation: 'resumeResearch' | 'restartResearch' | 'abandonResearch') {
    if (activeOperation.current) return;
    activeOperation.current = true; setBusy(true); onBusy(true); setError('');
    const ticket = operationGeneration.current, requestId = crypto.randomUUID();
    try {
      const next = await window.researchTrail![operation](run.id, requestId);
      if (ticket === operationGeneration.current) { onRun(next); setRevision(n => n + 1); }
    } catch (e) { if (ticket === operationGeneration.current) setError(e instanceof Error ? e.message : '恢复操作失败。'); }
    finally { activeOperation.current = false; setBusy(false); onBusy(false); }
  }
  const blocked = !available || busy;
  return <section className="recovery-panel" data-testid="research-checkpoint" data-stage={view?.stage}>
    <h3>检查点与恢复</h3><p>恢复原任务：保留任务 ID 和原计划，复用已完成采集，只继续中断的读取。重新发起新任务：创建新 ID，按当前配置重新采集，旧任务与报告保留。</p>
    <p>报告中断后恢复只读取保存状态，不自动重调模型。未保存的回复不能恢复为成功；需要另行点击“生成新报告”，真实模式可能再次消耗请求。</p>
    {view && <><p role="status">{labels[view.stage]} · 检查点 {view.checkpoint_id ?? '缺失'} · 恢复代次 {view.generation}</p>
      <p>复用 {view.reuse_capabilities.length} 项 · 中断待续 {view.remaining_capabilities.length} 项 · 保存报告 {view.report_ids.length} 份</p>
      {view.code !== 'READY' && <p>{view.code} · {reasons[view.code] ?? '原状态保留，请检查配置和证据。'}</p>}
      {view.model_request_uncertain && <p>模型请求可能已发出，结果不确定；恢复不会自动再次调用。</p>}
      {view.warnings.map(code => <p key={code}>{code} · {reasons[code] ?? '此状态不代表当前模型或数据服务已验证。'}</p>)}</>}
    <div className="research-toolbar"><button disabled={blocked} onClick={() => setRevision(n => n + 1)}>检查已保存检查点</button>
      <button disabled={blocked || !view?.resume_allowed} onClick={e => { if (e.detail < 2) void act('resumeResearch'); }}>恢复原任务（不调用模型）</button>
      <button disabled={blocked || run.status === 'fetching' || view?.stage === 'report_generating'} onClick={e => { if (e.detail < 2) void act('restartResearch'); }}>重新发起新任务</button>
      <button disabled={blocked || !!run.abandoned_at} onClick={e => { if (e.detail < 2) void act('abandonResearch'); }}>放弃原任务（保留历史）</button>
    </div>{error && <p role="alert">{error}</p>}
  </section>;
}
