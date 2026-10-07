// Folio ResearchReportView/EvidenceList/WhatChangedSection presentation reference,
// fixed ba5dcdfd. Python owns reports, sources, versions, export and differences.
import { useEffect, useRef, useState } from 'react';
import type { ReportClaim, ReportDocument, ReportJob, ReportOriginal, ReportDiff, ReportSummary } from '../../report-types';

const statusLabel = { generating: '正在生成', completed: '已保存', failed: '生成失败', cancelled: '已取消', interrupted: '已中断' };
const kindLabel = { fact: '事实', analysis: '分析', prediction: '预测' };
const message = (e: unknown) => e instanceof Error ? e.message : '报告操作失败。';

function Claims({ title, items, document, disabled, onRead }: { title: string; items: ReportClaim[]; document: ReportDocument; disabled: boolean; onRead: (reference: string) => void }) {
  const facts = new Map(document.evidence.map(f => [f.id, f]));
  return <section className="report-section"><h4>{title}</h4><ul>{items.map((claim, index) => <li key={index}>
    <strong>【{kindLabel[claim.kind]}】</strong>{claim.kind === 'fact' ? claim.evidence_ids.map(id => {
      const f = facts.get(id)!; return `${f.capability}${f.pointer} = ${JSON.stringify(f.value)}`;
    }).join('；') : claim.text}
    <div className="report-references">{claim.evidence_ids.map(id => <button key={id} disabled={disabled} onClick={() => onRead(id)}>查看原始事实 {id}</button>)}</div>
  </li>)}</ul></section>;
}

export function ReportPanel({ runId, symbol, succeeded, available, generateAllowed = true, onStateChange }: { runId: string; symbol: string; succeeded: number; available: boolean; generateAllowed?: boolean; onStateChange?: () => void }) {
  const [mode, setMode] = useState<'fixed' | 'real'>('fixed');
  const [rows, setRows] = useState<ReportSummary[]>([]), [historyId, setHistoryId] = useState('');
  const [job, setJob] = useState<ReportJob>(), [raw, setRaw] = useState<ReportOriginal>(), [difference, setDifference] = useState<ReportDiff>();
  const [beforeId, setBeforeId] = useState(''), [afterId, setAfterId] = useState('');
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const generation = useRef(0), rawGeneration = useRef(0), diffGeneration = useRef(0);
  const activeOperation = useRef(false);
  const running = job?.status === 'generating';
  const blocked = !available || busy;
  const versions = rows.filter(r => r.run_id === runId);
  const comparable = rows.filter(r => r.symbol === symbol && r.status === 'completed');

  useEffect(() => {
    let active = true;
    if (available) void window.researchTrail!.reportList().then(async records => {
      if (!active) return;
      setRows(records);
      const latest = records.find(r => r.run_id === runId);
      if (latest) {
        const saved = await window.researchTrail!.report(latest.id);
        if (!active) return;
        setHistoryId(saved.id); setJob(saved);
      }
    }).catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setBusy(false); });
    else setBusy(false);
    return () => { active = false; ++generation.current; ++rawGeneration.current; ++diffGeneration.current; };
  }, [available, runId]);

  const jobId = job?.id, status = job?.status;
  useEffect(() => { onStateChange?.(); }, [jobId, status, onStateChange]);
  useEffect(() => {
    if (!available || !jobId) return;
    let active = true; let timer: ReturnType<typeof setTimeout>;
    const ticket = generation.current;
    if (status === 'generating') {
      const poll = async () => {
        try {
          const saved = await window.researchTrail!.report(jobId);
          if (!active || ticket !== generation.current) return;
          setJob(saved);
          if (saved.status === 'generating') timer = setTimeout(() => void poll(), 500);
        } catch (e) { if (active && ticket === generation.current) setError(message(e)); }
      };
      timer = setTimeout(() => void poll(), 100);
    } else void window.researchTrail!.reportList().then(records => { if (active && ticket === generation.current) setRows(records); })
      .catch(e => { if (active && ticket === generation.current) setError(message(e)); });
    return () => { active = false; clearTimeout(timer); };
  }, [available, jobId, status]);

  async function changeJob(action: () => Promise<ReportJob>) {
    if (activeOperation.current) return;
    activeOperation.current = true;
    const ticket = ++generation.current;
    ++rawGeneration.current; ++diffGeneration.current; setRaw(undefined); setDifference(undefined); setBusy(true); setError(''); setNotice('');
    try { const next = await action(); if (ticket === generation.current) { setJob(next); setHistoryId(next.id); } }
    catch (e) { if (ticket === generation.current) setError(message(e)); }
    finally { activeOperation.current = false; if (ticket === generation.current) setBusy(false); }
  }
  async function read(reportId: string, reference: string) {
    const ticket = ++rawGeneration.current; setRaw(undefined); setError('');
    try { const saved = await window.researchTrail!.reportEvidence(reportId, reference); if (ticket === rawGeneration.current) setRaw(saved); }
    catch (e) { if (ticket === rawGeneration.current) setError(message(e)); }
  }
  async function compare() {
    const ticket = ++diffGeneration.current; setDifference(undefined); setError('');
    try { const result = await window.researchTrail!.reportDiff(beforeId, afterId); if (ticket === diffGeneration.current) setDifference(result); }
    catch (e) { if (ticket === diffGeneration.current) setError(message(e)); }
  }
  async function exportMarkdown() {
    if (!job) return;
    const ticket = generation.current; setNotice(''); setError(''); setBusy(true);
    try { const saved = await window.researchTrail!.exportReport(job.id); if (ticket === generation.current) setNotice(saved ? 'Markdown 已保存。' : '已取消导出。'); }
    catch (e) { if (ticket === generation.current) setError(message(e)); }
    finally { if (ticket === generation.current) setBusy(false); }
  }

  async function formThesis() {
    if (!job || blocked || activeOperation.current) return;
    activeOperation.current = true;
    const ticket = generation.current; setBusy(true); setNotice(''); setError('');
    try {
      const saved = await window.researchTrail!.createThesis({ report_id: job.id, request_id: crypto.randomUUID() });
      if (ticket === generation.current) setNotice(`已形成投资论点 ${saved.id}。请在“投资论点”页面查看与编辑；来源报告保留。`);
    } catch (e) { if (ticket === generation.current) setError(message(e)); }
    finally { activeOperation.current = false; if (ticket === generation.current) setBusy(false); }
  }

  const doc = job?.document;
  const groups: [string, ReportClaim[]][] = doc ? [['摘要', doc.synthesis.summary], ...doc.synthesis.sections.map(s => [s.title, s.claims] as [string, ReportClaim[]]),
    ['风险', doc.synthesis.risks], ['催化因素', doc.synthesis.catalysts], ['多头论点', doc.synthesis.bull_case], ['空头论点', doc.synthesis.bear_case]] : [];
  return <section className="report-panel" aria-label="研究报告工作台">
    <h3>结构化报告</h3><p>使用已保存采集数据生成。固定合成器用于验证流程；真实模型仅生成分析与预测文字，事实值由 Python 引用原始记录。</p>
    <div className="research-toolbar"><label>报告合成器<select aria-label="报告合成器" value={mode} disabled={blocked || running} onChange={e => setMode(e.target.value as typeof mode)}><option value="fixed">固定合成器（离线）</option><option value="real">真实模型（使用现有本机配置）</option></select></label>
      <button disabled={blocked || running || !succeeded || !generateAllowed} onClick={e => { if (e.detail < 2) void changeJob(() => window.researchTrail!.generateReport(runId, mode, crypto.randomUUID())); }}>生成新报告</button>
      {running && <button disabled={blocked} onClick={() => void changeJob(() => window.researchTrail!.cancelReport(job!.id))}>取消报告生成</button>}
      <label>已保存报告<select aria-label="已保存报告" value={historyId} disabled={blocked || running || !versions.length} onChange={e => setHistoryId(e.target.value)}><option value="">选择版本</option>{versions.map(r => <option key={r.id} value={r.id}>版本 {r.version} · {r.mode} · {statusLabel[r.status]} · {r.started_at}</option>)}</select></label>
      <button disabled={blocked || running || !historyId} onClick={() => void changeJob(() => window.researchTrail!.report(historyId))}>读取报告版本</button>
    </div>
    {!succeeded && <p role="status">没有成功采集结果，不能生成报告。</p>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {job && <p data-testid="report-status" data-status={job.status} data-report-id={job.id}>{statusLabel[job.status]} · 版本 {job.version} · {job.mode} {job.code && `· ${job.code}`}</p>}
    {job?.request_uncertain && <p role="status">模型请求可能已发出，未取得可确认的报告结果。恢复不会自动再次调用。</p>}
    {doc && <article data-testid="research-report">
      <h3>{doc.symbol} · {doc.synthesis.stance === 'bullish' ? '偏多' : doc.synthesis.stance === 'bearish' ? '偏空' : '中性'}（分析判断）</h3>
      <p>{doc.disclaimer}</p><p>{doc.source_mode === 'simulated' ? '模拟数据，不代表真实行情' : '真实提供商数据'} · {doc.provider} · 采集 {doc.collection_status} · 任务 {doc.source_run_id}</p>
      <button disabled={blocked} onClick={() => void exportMarkdown()}>导出 Markdown</button>
      <button disabled={blocked || job?.status !== 'completed'} onClick={() => void formThesis()}>将报告形成投资论点</button>
      {groups.map(([title, items], index) => <Claims key={index} title={title} items={items} document={doc} disabled={blocked} onRead={reference => void read(job!.id, reference)} />)}
      <section data-testid="report-gaps"><h4>数据缺口</h4>{doc.gaps.length ? <ul>{doc.gaps.map((g, i) => <li key={i}>{g.scope} · {g.key} · {g.code}</li>)}</ul> : <p>当前投影范围内未记录缺口；这不保证资料完整。</p>}</section>
      <details><summary>全部原始事实索引 · {doc.evidence.length} 项</summary><ul>{doc.evidence.map(f => <li key={f.id}>{f.capability}{f.pointer} = {JSON.stringify(f.value)} <button disabled={blocked} onClick={() => void read(job!.id, f.id)}>查看原始事实 {f.id}</button></li>)}</ul></details>
    </article>}
    <section aria-label="Research Diff"><h4>Research Diff</h4><p>选择两份已保存报告。数据模式必须相同；文字或字段变化不代表论断已证明。</p>
      <div className="research-toolbar">{([['差异旧报告', beforeId, setBeforeId], ['差异新报告', afterId, setAfterId]] as const).map(([label, value, update]) => <label key={label}>{label}<select aria-label={label} value={value} disabled={blocked} onChange={e => { ++diffGeneration.current; setDifference(undefined); update(e.target.value); }}><option value="">选择报告</option>{comparable.map(r => <option value={r.id} key={r.id}>{r.symbol} · {r.started_at} · {r.mode} · {r.id}</option>)}</select></label>)}
        <button disabled={blocked || !beforeId || !afterId || beforeId === afterId} onClick={() => void compare()}>比较两份报告</button>
      </div>
      {difference && <section data-testid="report-diff"><p>{difference.label}</p><p>{difference.before_id} → {difference.after_id}</p>{difference.source_changed && <p>提供商、策略或合成器已变化，请结合来源解释差异。</p>}
        {!difference.changes.length ? <p>两份报告无内容差异。</p> : <ul>{difference.changes.map((c, index) => <li key={index}>【{c.kind === 'fact' ? '事实变化' : c.kind === 'gap' ? '缺口变化' : '分析文字变化'}】{c.key}<pre>{c.before ?? '缺失'} → {c.after ?? '缺失'}</pre>
          {c.before_evidence && <button disabled={blocked} onClick={() => void read(difference.before_id, c.before_evidence!)}>查看旧原始事实</button>}
          {c.after_evidence && <button disabled={blocked} onClick={() => void read(difference.after_id, c.after_evidence!)}>查看新原始事实</button>}
        </li>)}</ul>}</section>}
    </section>
    {raw && <section data-testid="report-original"><h4>已保存原始事实</h4><p>任务 {raw.evidence.run_id} · 执行序号 {raw.evidence.ordinal} · {raw.evidence.capability} · 字段 {raw.evidence.pointer}</p>
      <p>执行 {raw.step_started_at} 至 {raw.step_completed_at} · 获取 {raw.evidence.fetched_at} · {raw.result.provenance.data_label}</p><p>SHA256 {raw.evidence.result_hash}</p><pre>{JSON.stringify(raw.result, null, 2)}</pre></section>}
  </section>;
}
