// Folio ba5dcdfd thesis presentation concepts; Python owns every saved version.
import { useEffect, useRef, useState } from 'react';
import type { ThesisContent, ThesisJudge, ThesisReview, ThesisSummary, ThesisVersion, ThesisView } from '../../thesis-types';
import type { ReportOriginal, ReportSummary } from '../../report-types';
import './thesis.css';

const stanceLabels = { bullish: '偏多', bearish: '偏空', neutral: '中性' };
const judgments: Record<ThesisJudge['judgment'], string> = { strengthened: '增强', weakened: '减弱', invalidated: '失效', unchanged: '维持', needs_revision: '需要修订' };
const fields = [['bull_case', '多头论点'], ['bear_case', '空头论点'], ['catalysts', '催化因素'], ['risks', '风险']] as const;
const message = (error: unknown) => error instanceof Error ? error.message : '论点操作失败。';

export function ThesisPanel({ available }: { available: boolean }) {
  const [list, setList] = useState<ThesisSummary[]>([]), [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState(''), [createReport, setCreateReport] = useState(''), [candidate, setCandidate] = useState('');
  const [view, setView] = useState<ThesisView>(), [draft, setDraft] = useState<ThesisContent>();
  const [reason, setReason] = useState(''), [judgment, setJudgment] = useState<ThesisJudge['judgment']>('needs_revision');
  const [evaluation, setEvaluation] = useState<ThesisReview>(), [historical, setHistorical] = useState<ThesisVersion>(), [version, setVersion] = useState(1);
  const [raw, setRaw] = useState<ReportOriginal>(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const identity = useRef(0), lists = useRef(0), reads = useRef(0), active = useRef(false);
  const blocked = !available || busy || !window.researchTrail;

  async function refresh() {
    if (!available || !window.researchTrail) return;
    const ticket = ++lists.current;
    try {
      const [saved, jobs] = await Promise.all([window.researchTrail.thesisList(), window.researchTrail.reportList()]);
      if (ticket !== lists.current) return;
      setList(saved); setReports(jobs.filter(job => job.status === 'completed'));
      setSelected(previous => saved.some(item => item.id === previous) ? previous : saved[0]?.id ?? '');
    } catch (e) { if (ticket === lists.current) setError(message(e)); }
  }
  useEffect(() => { void refresh(); return () => { ++lists.current; ++identity.current; ++reads.current; }; }, [available]);
  function show(next: ThesisView) {
    ++reads.current; setView(next); setDraft(next.current.content); setVersion(next.current_version);
    setReason(''); setHistorical(undefined); setEvaluation(undefined); setRaw(undefined);
  }
  useEffect(() => {
    const ticket = ++identity.current; ++reads.current;
    setView(undefined); setDraft(undefined); setReason(''); setCandidate(''); setRaw(undefined); setEvaluation(undefined); setHistorical(undefined); setError(''); setNotice(''); setBusy(false);
    if (available && selected && window.researchTrail) {
      void window.researchTrail.thesis(selected).then(next => { if (ticket === identity.current) show(next); })
        .catch(e => { if (ticket === identity.current) setError(message(e)); });
    }
    return () => { ++identity.current; ++reads.current; };
  }, [selected, available]);

  async function act(action: () => Promise<ThesisView | ThesisReview>, label: string) {
    if (blocked || active.current) return;
    active.current = true; const ticket = identity.current; ++reads.current;
    setBusy(true); setError(''); setNotice(''); setRaw(undefined);
    try {
      const saved = await action();
      if (ticket !== identity.current) return;
      if ('current' in saved) { show(saved); setSelected(saved.id); }
      else {
        setEvaluation(saved);
        const refreshed = await window.researchTrail!.thesis(saved.thesis_id);
        if (ticket !== identity.current) return;
        setView(refreshed);
      }
      setNotice(label); await refresh();
    } catch (e) { if (ticket === identity.current) setError(message(e)); }
    finally { active.current = false; if (ticket === identity.current) setBusy(false); }
  }
  async function read(action: () => Promise<ThesisReview | ThesisVersion | ReportOriginal>) {
    const ticket = ++reads.current; setError(''); setRaw(undefined);
    try {
      const saved = await action(); if (ticket !== reads.current) return;
      if ('evidence' in saved) setRaw(saved);
      else if ('base_version' in saved) setEvaluation(saved);
      else setHistorical(saved);
    } catch (e) { if (ticket === reads.current) setError(message(e)); }
  }
  const current = view?.current;
  const displayed = historical ?? current;
  const canJudge = view && evaluation?.kind === 'evaluation' && evaluation.status === 'ready' && evaluation.base_version === view.current_version && !view.reviews.some(r => r.kind === 'judgment' && r.base_version === evaluation.base_version && r.report_id === evaluation.report_id);
  const mutation = () => {
    const content = { ...draft! };
    // Keep draft line breaks while typing; submit only non-empty list entries.
    for (const [key] of fields) content[key] = content[key].map(line => line.trim()).filter(Boolean);
    return { request_id: crypto.randomUUID(), expected_version: view!.current_version, content, reason };
  };

  return <section className="thesis-panel" aria-label="投资论点工作台">
    <h2>投资论点</h2><p>报告转换和编辑保留历史；重新评估只比较实际取得的新旧数据。投资影响由用户显式判断，引用不证明判断正确。</p>
    <div className="thesis-toolbar">
      <label>来源报告<select aria-label="论点来源报告" value={createReport} disabled={blocked} onChange={e => setCreateReport(e.target.value)}><option value="">选择已保存报告</option>{reports.map(r => <option key={r.id} value={r.id}>{r.symbol} · {r.started_at} · {r.mode} · {r.id}</option>)}</select></label>
      <button disabled={blocked || !createReport} onClick={() => void act(() => window.researchTrail!.createThesis({ report_id: createReport, request_id: crypto.randomUUID() }), '已从报告形成论点，原报告保留。')}>从报告形成论点</button>
      <button disabled={blocked} onClick={() => void refresh()}>刷新论点和报告</button>
    </div>
    <label>已保存论点<select aria-label="已保存论点" value={selected} disabled={blocked} onChange={e => setSelected(e.target.value)}><option value="">选择论点</option>{list.map(t => <option key={t.id} value={t.id}>{t.symbol} · 当前版本 {t.current_version} · {t.id}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!list.length && <p>先保存一份研究报告，再形成投资论点。</p>}
    {view && draft && <>
      <p data-testid="thesis-current" data-thesis-id={view.id} data-version={view.current_version}>{view.symbol} · 当前论点版本 {view.current_version} · {view.id}</p>
      <section aria-label="编辑当前论点"><h3>编辑当前论点（分析与判断）</h3><p>编辑追加新版本，保留当前对应的数据快照；不代表已取得新数据。</p>
        <label>论点方向<select aria-label="论点方向" value={draft.stance} disabled={blocked} onChange={e => setDraft({ ...draft, stance: e.target.value as ThesisContent['stance'] })}>{Object.entries(stanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>论点摘要<textarea aria-label="论点摘要" value={draft.summary} maxLength={2000} disabled={blocked} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></label>
        {fields.map(([key, label]) => <label key={key}>{label}（每行一条，最多16条）<textarea aria-label={`论点${label}`} value={draft[key].join('\n')} disabled={blocked} onChange={e => setDraft({ ...draft, [key]: e.target.value.split('\n') })} /></label>)}
        <label>变化理由<textarea aria-label="论点变化理由" value={reason} maxLength={2000} disabled={blocked} onChange={e => setReason(e.target.value)} /></label>
        <button disabled={blocked || !reason.trim() || !draft.summary.trim()} onClick={() => void act(() => window.researchTrail!.editThesis(view.id, mutation()), '已追加编辑版本，旧版本未覆盖。')}>保存论点新版本</button>
      </section>
      <section aria-label="论点复审"><h3>复审与重新评估</h3><p>先在研究入口为同一证券进行新的采集并保存报告，再显式比较。缺少旧论点对应的新事实、缓存或旧采集不能完成评估。</p>
        <label>复审新报告<select aria-label="复审新报告" value={candidate} disabled={blocked} onChange={e => { ++reads.current; setCandidate(e.target.value); setEvaluation(undefined); setRaw(undefined); }}><option value="">无新报告（记录无法评估）</option>{reports.filter(r => r.symbol === view.symbol).map(r => <option key={r.id} value={r.id}>{r.started_at} · {r.mode} · {r.id}</option>)}</select></label>
        <button disabled={blocked} onClick={() => void act(() => window.researchTrail!.evaluateThesis(view.id, { request_id: crypto.randomUUID(), expected_version: view.current_version, report_id: candidate || null }), '评估记录已保存。')}>重新评估新数据</button>
        <label>复审判断<select aria-label="复审判断" value={judgment} disabled={blocked} onChange={e => setJudgment(e.target.value as ThesisJudge['judgment'])}>{Object.entries(judgments).map(([value, label]) => <option key={value} value={value}>{label}（用户判断）</option>)}</select></label>
        <button disabled={blocked || !canJudge || !reason.trim()} onClick={() => void act(() => window.researchTrail!.judgeThesis(view.id, { ...mutation(), evaluation_id: evaluation!.id, judgment }), '复审判断和对应新数据已保存为新版本。')}>保存复审判断</button>
      </section>
      <section><h3>历史版本（只读）</h3><p>列表显示最近100条，输入版本号可读取更早记录。读取历史不会替换编辑中的当前论点。</p>
        <ul data-testid="thesis-versions">{view.versions.map(v => <li key={v.version}>版本 {v.version} · {v.origin} · {v.created_at} · {v.reason}<button disabled={blocked} onClick={() => void read(() => window.researchTrail!.thesisVersion(view.id, v.version))}>读取论点版本 {v.version}</button></li>)}</ul>
        <label>历史版本号<input aria-label="历史版本号" type="number" min={1} max={view.current_version} value={version} disabled={blocked} onChange={e => { ++reads.current; setVersion(Number(e.target.value)); }} /></label>
        <button disabled={blocked || !Number.isSafeInteger(version) || version < 1} onClick={() => void read(() => window.researchTrail!.thesisVersion(view.id, version))}>读取历史版本</button>
        {historical && <button disabled={blocked} onClick={() => { ++reads.current; setHistorical(undefined); setRaw(undefined); }}>显示当前保存版本</button>}
      </section>
      {displayed && <article data-testid="thesis-snapshot"><h3>已保存版本 {displayed.version} · {stanceLabels[displayed.content.stance]}</h3><p>{displayed.label}</p><p>{displayed.reason}</p><p>{displayed.content.summary}</p>{fields.map(([key, label]) => <section key={key}><h4>{label}（分析/预测）</h4><ul>{displayed.content[key].map((line, i) => <li key={i}>{line}</li>)}</ul></section>)}
        <p>来源报告 {displayed.report_id} · {displayed.data_report.document?.source_mode === 'simulated' ? '模拟数据，不代表真实行情' : '提供商数据，结合来源判断时效'}</p>
        <details><summary>该版本对应事实与缺口</summary><ul>{displayed.data_report.document?.evidence.map(f => <li key={f.id}>{f.capability}{f.pointer} = {JSON.stringify(f.value)}<button disabled={blocked} onClick={() => void read(() => window.researchTrail!.reportEvidence(displayed.report_id, f.id))}>查看论点原始事实 {f.id}</button></li>)}</ul><ul>{displayed.data_report.document?.gaps.map((g, i) => <li key={i}>{g.key} · {g.code}</li>)}</ul></details>
      </article>}
      <section><h3>复审历史（最近100条）</h3><ul data-testid="thesis-reviews">{view.reviews.map(r => <li key={r.id}>{r.kind === 'judgment' ? '用户复审' : '数据评估'} · 基于版本 {r.base_version} · {r.status} · {r.reason}<button disabled={blocked} onClick={() => void read(() => window.researchTrail!.thesisReview(view.id, r.id))}>读取复审 {r.id}</button></li>)}</ul></section>
    </>}
    {evaluation && <section data-testid="thesis-evaluation" data-status={evaluation.status} data-review-id={evaluation.id}><h3>{evaluation.status === 'unable' ? '无法完成评估' : evaluation.kind === 'judgment' ? '已保存用户复审判断' : '已取得可比较新数据'}</h3><p>{evaluation.label}</p><p>{evaluation.reason}</p><p>{evaluation.code} {evaluation.comparison && `· 字段${evaluation.comparison === 'changed' ? '有变化' : '未发现变化'}`} {evaluation.judgment && `· 用户判断：${judgments[evaluation.judgment]}`}</p>
      <p>旧报告 {evaluation.baseline_report.id} → 新报告 {evaluation.candidate_report?.id ?? '未取得'} · 基于论点版本 {evaluation.base_version}</p><p>旧论点：{evaluation.base_content.summary}</p>
      {!!evaluation.missing_keys.length && <ul>{evaluation.missing_keys.map(key => <li key={key}>缺失新事实：{key}</li>)}</ul>}
      <ul>{evaluation.difference?.changes.map((change, i) => <li key={i}>{change.kind} · {change.key}<pre>{change.before ?? '缺失'} → {change.after ?? '缺失'}</pre>{change.before_evidence && <button disabled={blocked} onClick={() => void read(() => window.researchTrail!.reportEvidence(evaluation.baseline_report.id, change.before_evidence!))}>查看复审旧事实</button>}{change.after_evidence && evaluation.candidate_report && <button disabled={blocked} onClick={() => void read(() => window.researchTrail!.reportEvidence(evaluation.candidate_report!.id, change.after_evidence!))}>查看复审新事实</button>}</li>)}</ul>
      <details><summary>评估时保存的新数据缺口</summary><ul>{evaluation.candidate_report?.document?.gaps.map((g, i) => <li key={i}>{g.key} · {g.code}</li>)}</ul></details>
    </section>}
    {raw && <section data-testid="thesis-original"><h3>能力执行原始事实</h3><p>{raw.evidence.run_id} · {raw.evidence.capability} · 执行序号 {raw.evidence.ordinal} · {raw.step_started_at} → {raw.step_completed_at}</p><p>结果 SHA256：{raw.evidence.result_hash}</p><pre>{JSON.stringify(raw.result, null, 2)}</pre></section>}
  </section>;
}
