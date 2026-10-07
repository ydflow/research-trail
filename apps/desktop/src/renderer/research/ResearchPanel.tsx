// Entry/history/progress adapted from Folio ResearchPanel.tsx (fixed ba5dcdfd).
// Python owns plans and collection history. No Folio TS runner, atoms or synthesis.
import { useEffect, useRef, useState } from 'react';
import type { ResearchData, ResearchInput, ResearchPlan, ResearchRun, ResearchStrategy, ResearchSummary, StrategyId } from '../../research-types';
import { StrategyPicker } from './StrategyPicker';
import { researchLabels, RunProgressCard } from './RunProgressCard';
import './research.css';
import { ReportPanel } from './ReportPanel';

export function ResearchPanel({ available, initialSymbol }: { available: boolean; initialSymbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol || 'AAPL.US');
  const [strategy, setStrategy] = useState<StrategyId>('comprehensive');
  const [mode, setMode] = useState<'simulated' | 'real'>('simulated');
  const [provider, setProvider] = useState<'longbridge' | 'massive'>('longbridge');
  const [presets, setPresets] = useState<ResearchStrategy[]>([]), [history, setHistory] = useState<ResearchSummary[]>([]);
  const [historyId, setHistoryId] = useState('');
  const [plan, setPlan] = useState<ResearchPlan>(), [run, setRun] = useState<ResearchRun>(), [data, setData] = useState<ResearchData>();
  const [ready, setReady] = useState(false), [planning, setPlanning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const runGeneration = useRef(0), dataGeneration = useRef(0);
  const input: ResearchInput = { symbol, strategy, mode, provider, concurrency: 4 };
  const running = run?.status === 'fetching';
  const disabled = !available || !ready || busy || running;
  const showError = (e: unknown) => e instanceof Error ? e.message : '采集操作失败，请重试。';

  useEffect(() => {
    let active = true;
    setReady(false); setBusy(false); setRun(undefined); setData(undefined); setError('');
    if (available) void Promise.all([window.researchTrail!.researchStrategies(), window.researchTrail!.researchRuns()])
      .then(async ([strategies, runs]) => {
        if (!active) return;
        setPresets(strategies); setHistory(runs); setHistoryId(runs[0]?.id ?? '');
        const activeRun = runs.find(r => r.status === 'fetching');
        if (activeRun) {
          const saved = await window.researchTrail!.researchRun(activeRun.id);
          if (!active) return;
          setRun(saved); setSymbol(saved.symbol); setStrategy(saved.strategy); setMode(saved.mode); setProvider(saved.provider);
        }
        if (active) setReady(true);
      }).catch(e => { if (active) setError(showError(e)); });
    return () => { active = false; ++runGeneration.current; ++dataGeneration.current; };
  }, [available]);

  useEffect(() => {
    let active = true;
    setPlan(undefined); setPlanning(available && ready);
    const timer = setTimeout(() => {
      if (!available || !ready) return;
      void window.researchTrail!.researchPlan({ symbol, strategy, mode, provider, concurrency: 4 })
        .then(p => { if (active) { setPlan(p); setError(''); } })
        .catch(e => { if (active) setError(showError(e)); })
        .finally(() => { if (active) setPlanning(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [available, ready, symbol, strategy, mode, provider]);

  const runId = run?.id, status = run?.status;
  useEffect(() => {
    if (!available || !runId) return;
    let active = true; let timer: ReturnType<typeof setTimeout>;
    const ticket = runGeneration.current;
    if (status === 'fetching') {
      const poll = async () => {
        try {
          const next = await window.researchTrail!.researchRun(runId);
          if (!active || ticket !== runGeneration.current) return;
          setRun(next);
          if (next.status === 'fetching') timer = setTimeout(() => void poll(), 500);
        } catch (e) { if (active && ticket === runGeneration.current) setError(showError(e)); }
      };
      timer = setTimeout(() => void poll(), 100);
    } else {
      void window.researchTrail!.researchRuns().then(r => { if (active && ticket === runGeneration.current) setHistory(r); })
        .catch(e => { if (active && ticket === runGeneration.current) setError(showError(e)); });
    }
    return () => { active = false; clearTimeout(timer); };
  }, [available, runId, status]);

  function clearDisplay() { ++runGeneration.current; ++dataGeneration.current; setRun(undefined); setData(undefined); setError(''); }
  async function begin() {
    const ticket = ++runGeneration.current;
    ++dataGeneration.current; setBusy(true); setError(''); setData(undefined); setRun(undefined);
    try {
      const next = await window.researchTrail!.startResearch(input);
      if (ticket === runGeneration.current) { setRun(next); setHistoryId(next.id); setHistory(h => [next, ...h.filter(r => r.id !== next.id)].slice(0, 100)); }
    } catch (e) { if (ticket === runGeneration.current) setError(showError(e)); }
    finally { if (ticket === runGeneration.current) setBusy(false); }
  }
  async function cancel() {
    if (!run) return;
    const ticket = ++runGeneration.current;
    setBusy(true); setError('');
    try { const next = await window.researchTrail!.cancelResearch(run.id); if (ticket === runGeneration.current) setRun(next); }
    catch (e) { if (ticket === runGeneration.current) setError(showError(e)); }
    finally { if (ticket === runGeneration.current) setBusy(false); }
  }
  async function restore() {
    const ticket = ++runGeneration.current;
    ++dataGeneration.current; setBusy(true); setError(''); setRun(undefined); setData(undefined);
    try {
      const saved = await window.researchTrail!.researchRun(historyId);
      if (ticket !== runGeneration.current) return;
      setRun(saved); setSymbol(saved.symbol); setStrategy(saved.strategy); setMode(saved.mode); setProvider(saved.provider);
    } catch (e) { if (ticket === runGeneration.current) setError(showError(e)); }
    finally { if (ticket === runGeneration.current) setBusy(false); }
  }
  async function read(capability: string) {
    if (!run) return;
    const ticket = ++dataGeneration.current, runTicket = runGeneration.current;
    setData(undefined); setError(''); setBusy(true);
    try {
      const next = await window.researchTrail!.researchData(run.id, capability);
      if (ticket === dataGeneration.current && runTicket === runGeneration.current) setData(next);
    } catch (e) { if (ticket === dataGeneration.current && runTicket === runGeneration.current) setError(showError(e)); }
    finally { if (ticket === dataGeneration.current) setBusy(false); }
  }
  return <section className="research-panel" aria-label="研究采集工作台" aria-busy={busy}>
    <h2>研究采集</h2><p>选择策略，采集已有能力的结构化数据。默认最多并发四项，每项二十秒。采集结束后可显式生成报告。</p>
    <div className="research-toolbar">
      <label>研究股票<input aria-label="研究股票" value={symbol} disabled={disabled} maxLength={10} onChange={e => { clearDisplay(); setSymbol(e.target.value.toUpperCase()); }} /></label>
      <label>采集模式<select aria-label="采集模式" value={mode} disabled={disabled} onChange={e => { clearDisplay(); setMode(e.target.value as typeof mode); }}><option value="simulated">模拟</option><option value="real">真实（需已有验证）</option></select></label>
      <label>采集提供商<select aria-label="采集提供商" value={provider} disabled={disabled} onChange={e => { clearDisplay(); setProvider(e.target.value as typeof provider); }}><option value="longbridge">Longbridge</option><option value="massive">Massive</option></select></label>
    </div>
    <StrategyPicker strategies={presets} value={strategy} disabled={disabled} onChange={v => { clearDisplay(); setStrategy(v); }} />
    {plan && <details data-testid="research-plan" data-strategy={plan.input.strategy}><summary>采集计划 · {plan.reads.length} 项 · 可用 {plan.reads.filter(r => r.availability.available).length} 项</summary>
      <p>{plan.label}</p><ul>{plan.reads.map(r => <li key={r.capability}>{r.capability} · {r.availability.available ? '可采集' : '不可用'} · {r.availability.code}</li>)}</ul>
      <p>选择的技能资料（不执行指令）：</p><ul>{plan.skills.map(s => <li key={s.id}>{s.id} · {s.status} · {s.code}</li>)}</ul>
    </details>}
    <div className="research-toolbar"><button disabled={disabled || planning || !plan} onClick={() => void begin()}>开始采集</button>
      <label>已保存采集<select aria-label="已保存采集" value={historyId} disabled={disabled || !history.length} onChange={e => setHistoryId(e.target.value)}><option value="">选择任务</option>{history.map(r => <option key={r.id} value={r.id}>{r.symbol} · {r.strategy} · {researchLabels[r.status]} · {r.started_at}</option>)}</select></label>
      <button disabled={disabled || !historyId} onClick={() => void restore()}>读取已保存任务</button>
    </div>
    {planning && <p role="status">正在检查采集计划…</p>}{error && <p role="alert">{error}</p>}
    {run && <RunProgressCard run={run} busy={busy || !available} onCancel={() => void cancel()} onRead={capability => void read(capability)} />}
    {data && <section data-testid="research-data" data-capability={data.capability}><h3>已保存数据：{data.capability}</h3>
      <p>{data.result.provenance.data_label} · {data.result.provenance.provider} · {data.result.provenance.transport} · 获取 {data.result.provenance.fetched_at}</p>
      <p>市场时间 {data.result.provenance.market_time ?? '未提供'}；此数据未经报告合成，不保证字段或窗口完整。</p>
      <pre>{JSON.stringify(data.result.data, null, 2)}</pre>
    </section>}
    {run && run.status !== 'fetching' && <ReportPanel key={run.id} runId={run.id} symbol={run.symbol} succeeded={run.succeeded} available={available} />}
  </section>;
}
