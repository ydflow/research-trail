import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReportCandidate, SessionDTO, SessionHistoryPage } from '../conversation-types';
import { applySessionEvent, eventDetail, mergeHistory, messageView, runStatus, toolViews } from './session-adapter';
import { ToolResultCards } from './ToolResultCards';
import { ToolActivity } from './ToolActivity';
import { SectionHeader, StateNotice } from './ui/Primitives';
import './ui/chat.css';

const MarkdownContent = lazy(() => import('./MarkdownContent').then(m => ({ default: m.MarkdownContent })));

export function SessionPanel({ available, compact = false, reportContext, onClearContext }: { available: boolean; compact?: boolean; reportContext?: ReportCandidate; onClearContext?: () => void }) {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [initialSelection] = useState(() => sessionStorage.getItem('research-trail.session') || '');
  const [selected, setSelected] = useState('');
  const [snapshot, setSnapshot] = useState<SessionHistoryPage>();
  const snapshotRef = useRef(snapshot); snapshotRef.current = snapshot;
  const [runId, setRunId] = useState(() => sessionStorage.getItem('research-trail.run') || '');
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [stream, setStream] = useState('等待数据库快照');
  const [scenario, setScenario] = useState<'normal' | 'delayed' | 'timeout'>('normal');
  const [modelKind, setModelKind] = useState<'fake_agent' | 'openai_agent'>('fake_agent');
  const contextKey = `${selected}:${reportContext?.report_id ?? ''}:${reportContext?.source_run_id ?? ''}`;
  const scope = useRef(contextKey); scope.current = contextKey;
  const mounted = useRef(true);
  const historyGeneration = useRef(0);
  useEffect(() => { historyGeneration.current++; setHistoryLoading(false); }, [selected]);
  const boundRun = useRef<{ sessionId: string; runId: string; key: string } | undefined>(undefined);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const cancelBound = () => {
      const previous = boundRun.current;
      if (!previous) return;
      boundRun.current = undefined;
      void window.researchTrail?.cancelRun(previous.sessionId, previous.runId).then(() => {
        if (mounted.current) setRevision(value => value + 1);
      }).catch(() => {});
    };
    if (boundRun.current && boundRun.current.key !== contextKey) cancelBound();
    return cancelBound;
  }, [contextKey]);
  useEffect(() => { if (reportContext) { setModelKind('fake_agent'); setScenario('normal'); } setInput(''); }, [reportContext?.report_id, reportContext?.source_run_id]);

  useEffect(() => {
    let active = true;
    if (available && window.researchTrail) {
      void window.researchTrail.listSessions().then((items) => {
        if (active) { setSessions(items); setSelected((previous) => items.some((item) => item.id === (previous || initialSelection)) ? previous || initialSelection : items[0]?.id || ''); }
      }).catch((e: Error) => { if (active) setError(e.message); });
    }
    return () => { active = false; };
  }, [available, initialSelection]);

  useEffect(() => { if (selected) sessionStorage.setItem('research-trail.session', selected); }, [selected]);
  useEffect(() => { sessionStorage.setItem('research-trail.run', runId); }, [runId]);

  useEffect(() => {
    let active = true;
    const unsubscribe: (() => void)[] = [];
    setSnapshot((previous) => previous?.session.id === selected ? previous : undefined);
    setLoading(Boolean(available && selected));
    setStream(available ? '读取数据库快照…' : '后端断开，已显示内容保留；请重试启动');
    if (available && selected && window.researchTrail) {
      const bridge = window.researchTrail;
      void bridge.sessionHistory(selected).then((saved) => {
        if (!active) return;
        const selection = snapshotRef.current?.session.id === selected ? mergeHistory(snapshotRef.current, saved, true) : saved;
        setSnapshot(previous => previous?.session.id === selected ? mergeHistory(previous, saved, true) : saved);
        setRunId((previous) => selection.runs.some((item) => item.id === previous) ? previous : saved.runs[0]?.id || '');
        setLoading(false); setStream('历史已同步');
        // Events committed between snapshot and subscription are replayed by SSE.
        for (const record of saved.runs.filter((item) => item.status === 'running')) {
          unsubscribe.push(bridge.subscribeRun(selected, record.id, record.last_sequence, (update) => {
            if (!active) return;
            if (update.kind === 'connection') { setStream(update.detail); return; }
            setSnapshot((previous) => previous?.session.id === selected ? { ...previous, ...applySessionEvent(previous, update.event) } : previous);
            if (update.event.type === 'run_completed') {
              // Python determines the terminal state; UI refreshes its cache.
              setRevision((value) => value + 1);
              void bridge.listSessions().then((items) => { if (active) setSessions(items); }).catch(() => {});
            }
          }));
        }
      }).catch((e: Error) => { if (active) { setError(e.message); setLoading(false); setStream('快照读取失败'); } });
    }
    return () => { active = false; for (const stop of unsubscribe) stop(); };
  }, [available, selected, revision]);

  const current = snapshot?.session.id === selected ? snapshot.session : undefined;
  const messages = current ? snapshot!.messages : [];
  const runs = current ? snapshot!.runs : [];
  const run = runs.find((item) => item.id === runId);
  const events = useMemo(() => snapshot?.session.id === selected ? snapshot.events.filter(event => event.run_id === runId) : [], [snapshot, selected, runId]);
  const loadEarlier = async () => {
    if (!snapshot?.has_more || snapshot.next_before_sequence == null || historyLoading) return;
    const ticket = scope.current, sessionId = selected, cursor = snapshot.next_before_sequence;
    const generation = ++historyGeneration.current;
    setHistoryLoading(true); setError('');
    try {
      const page = await window.researchTrail!.sessionHistory(sessionId, cursor);
      if (mounted.current && scope.current === ticket && historyGeneration.current === generation) setSnapshot(previous => previous?.session.id === sessionId ? mergeHistory(previous, page) : previous);
    } catch (error) { if (mounted.current && scope.current === ticket) setError((error as Error).message); }
    finally { if (mounted.current && historyGeneration.current === generation) setHistoryLoading(false); }
  };
  const perform = async (work: () => Promise<void>) => {
    const ticket = scope.current;
    setBusy(true); setError('');
    try { await work(); } catch (e) { if (mounted.current && scope.current === ticket) setError((e as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  };
  const disabled = busy || loading || !available;
  const execute = (agent: boolean) => void perform(async () => {
    const bridge = window.researchTrail!;
    const ticket = scope.current;
    const record = await (agent ? bridge.startAgentRun(current!.id, input, reportContext || modelKind === 'openai_agent' ? 'normal' : scenario, reportContext ? 'fake_agent' : modelKind, reportContext ? { report_id: reportContext.report_id, source_run_id: reportContext.source_run_id } : undefined) : bridge.startRun(current!.id, input));
    if (reportContext) boundRun.current = { sessionId: record.session_id, runId: record.id, key: ticket };
    if (!mounted.current || scope.current !== ticket) { await bridge.cancelRun(record.session_id, record.id); return; }
    const items = await bridge.listSessions();
    if (!mounted.current || scope.current !== ticket) { await bridge.cancelRun(record.session_id, record.id); return; }
    setInput(''); setRunId(record.id); setSessions(items); setRevision((value) => value + 1);
  });

  return <section className={`session-panel chat-session${compact ? ' compact-session' : ''}`} aria-label="持久化会话">
    <SectionHeader title="研究会话"><span className={modelKind === 'fake_agent' ? 'mock-badge' : 'real-badge'}>{modelKind === 'fake_agent' ? '规则演示／假模型' : 'OpenAI兼容／真实模型'}</span></SectionHeader>
    <details className="chat-context"><summary>模型与数据说明</summary><p className="market-note">模型共用Python只读工具，行情仍为模拟数据。先读数据库快照，再订阅事件；查看历史不会重新执行。</p></details>
    <p className="stream-state" role="status" data-testid="stream-state">事件连接：{stream}</p>
    {error && <StateNotice kind="error">{error}</StateNotice>}
    {reportContext && <section className="report-context" aria-label="关联研究上下文" data-testid="assistant-report-context"><strong>{reportContext.symbol} · 报告版本 {reportContext.version}</strong><p>显式发送后才核验并绑定到本次会话运行；只读模拟报告，未发送不执行。</p><details><summary>查看候选报告身份</summary><p>候选报告 {reportContext.report_id}<br/>采集任务 {reportContext.source_run_id}</p></details><button type="button" disabled={disabled || !current} onClick={() => setInput('读取已关联研究报告，说明资料来源与缺口')}>准备报告问题</button><button type="button" className="secondary" onClick={onClearContext}>解除报告关联</button></section>}
    <form className="session-form" onSubmit={(e) => {
      e.preventDefault();
      void perform(async () => {
        const bridge = window.researchTrail!;
        const ticket = scope.current;
        const item = await bridge.createSession(title.trim() || '新会话');
        const items = await bridge.listSessions();
        if (!mounted.current || scope.current !== ticket) return;
        onClearContext?.(); setSessions(items); setSelected(item.id); setTitle(''); setInput(''); setRunId('');
      });
    }}>
      <label className="visually-hidden" htmlFor="session-title">会话标题</label>
      <input id="session-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="新会话标题" disabled={disabled} />
      <button disabled={disabled}>创建会话</button>
    </form>
    <div className="session-layout">
      <aside className="session-list" aria-label="会话列表">
        {sessions.length === 0 && <StateNotice kind="empty">还没有会话。</StateNotice>}
        {sessions.map((item) => <button key={item.id} aria-pressed={selected === item.id} disabled={busy || !available}
          onClick={() => { scope.current = `${item.id}:`; onClearContext?.(); setSelected(item.id); setInput(''); setError(''); setRunId(''); }}>
          <strong>{item.title}</strong><span>{item.message_count} 条消息</span>
        </button>)}
      </aside>
      <div className="session-content chat-content">
        {loading && <StateNotice kind="loading">读取历史…</StateNotice>}
        {current && <>
          <div className="chat-thread-heading"><h3 data-testid="current-session">{current.title}</h3>
            <button className="secondary" disabled={disabled} onClick={() => void perform(async () => {
              const bridge = window.researchTrail!;
              const ticket = scope.current;
              await bridge.deleteSession(current.id);
              const items = await bridge.listSessions(); if (!mounted.current || scope.current !== ticket) return; onClearContext?.(); setSessions(items); setSelected(items[0]?.id || ''); setRunId('');
            })}>删除当前会话</button>
          </div>
          <div className="chat-transcript" aria-label="研究对话内容">
            {snapshot?.has_more && <button className="secondary" disabled={disabled || historyLoading} onClick={() => void loadEarlier()}>{historyLoading ? '读取更早历史…' : '加载更早历史'}</button>}
            <div className="message-history" data-testid="message-history" aria-label="消息历史">
              {messages.length === 0 && <StateNotice kind="empty">暂无消息。试试“查询AAPL.US行情”或“查看NVDA.US的K线”。</StateNotice>}
              {messages.map(messageView).map((message) => <article key={message.id} className={`message ${message.role}`} data-message-id={message.id}>
                <div>{message.label}<time>{new Date(message.timestamp).toLocaleString('zh-CN', { hour12: false })}</time></div>
                {message.role === 'assistant' && message.content ? <Suspense fallback={<p>{message.content}</p>}>
                  <MarkdownContent content={message.content} />
                </Suspense> : <p>{message.content || '等待运行结果…'}</p>}
              </article>)}
            </div>
            {runs.length > 0 && <article className="chat-research-card" aria-label="研究过程与工具结果">
              <div className="chat-run-toolbar"><label className="visually-hidden" htmlFor="run-select">运行记录</label>
                <select id="run-select" value={runId} disabled={disabled} onChange={(e) => setRunId(e.target.value)}>
                  {runs.map((item) => <option key={item.id} value={item.id}>{item.input} · {runStatus(item.status)} · {new Date(item.started_at).toLocaleTimeString('zh-CN')}</option>)}
                </select>
              </div>
              {run && <>
                <div className="chat-run-status"><p className={run.error ? 'market-error' : 'market-note'} data-testid="run-state">
                  {run.model_label || '固定测试'} · {runStatus(run.status)} · {run.last_sequence} 个持久化事件
                </p>
                <button className="secondary" disabled={disabled || run.status !== 'running'} onClick={() => void perform(async () => {
                  await window.researchTrail!.cancelRun(selected, runId); setRevision((value) => value + 1);
                })}>取消运行</button></div>
                {events.map(e => e.type === 'run_started' && e.payload.research_context ? <details className="report-context" key={`${e.run_id}:${e.sequence}`} data-testid="saved-report-binding"><summary>本次运行已核验的报告绑定</summary><p>报告 {e.payload.research_context.report_id}<br/>采集任务 {e.payload.research_context.source_run_id}<br/>当前会话 {e.session_id}<br/>Agent运行 {e.run_id}</p></details> : null)}
                {run.error && <p role="alert" className="market-error" data-testid="run-error">{run.error.code}：{run.error.message}</p>}
                {run.status === 'interrupted' && <p className="market-note">保存内容已保留。请在输入框重新发起；不会自动调用工具或模型。</p>}
                <ToolActivity key={run.id} toolCalls={toolViews(events, run)} />
              </>}
              <ToolResultCards events={events} runId={runId} compact={compact} />
              <div className="chat-evidence-toolbar"><button className="secondary" aria-label="重新读取事件" disabled={disabled || !run} onClick={() => { setError(''); setRevision((value) => value + 1); }}>更新记录</button>
                <details className="event-details">
                  <summary>已保存的过程事件（{events.length}）</summary>
                  <ol className="event-list" data-testid="event-list">
                    {events.map((event) => <li key={`${event.run_id}:${event.sequence}`}><span>#{event.sequence} {event.type}</span><p>{eventDetail(event)}</p></li>)}
                  </ol>
                </details>
              </div>
            </article>}
          </div>
          <form className="run-form chat-composer" onSubmit={(e) => { e.preventDefault(); execute(true); }}>
            <label htmlFor="run-input">研究问题</label>
            <textarea id="run-input" aria-label="测试输入" maxLength={2000} rows={2} value={input} onChange={(e) => setInput(e.target.value)} disabled={disabled}
              placeholder="输入研究问题，例如：查询 AAPL.US 行情" />
            <div className="chat-composer-actions">
              <label className="visually-hidden" htmlFor="agent-model">运行模型</label>
              <select id="agent-model" value={modelKind} disabled={disabled || !!reportContext || runs.some(item => item.status === 'running')}
                onChange={e => setModelKind(e.target.value as typeof modelKind)}>
                <option value="fake_agent">规则演示／假模型（默认）</option>
                <option value="openai_agent">OpenAI兼容／真实模型（使用本机配置）</option>
              </select>
              <button aria-label={modelKind === 'fake_agent' ? '运行规则演示' : '运行真实模型'} disabled={disabled || !input.trim() || runs.some((item) => item.status === 'running')}>发送</button>
            </div>
            {modelKind === 'openai_agent' && <p className="market-note">运行会向设置中的模型服务发送本次输入与工具结果（包括主动请求的组合风险数值），可能产生API费用。先在“模型设置”保存Base URL、模型ID、API Key与限制；不会发送历史会话或个人资料，不会自动重试。</p>}
            <details className="chat-advanced"><summary>高级设置</summary>
              <div><label htmlFor="tool-scenario">模拟工具时序</label>
                <select id="tool-scenario" value={modelKind === 'openai_agent' || reportContext ? 'normal' : scenario} disabled={disabled || modelKind === 'openai_agent' || !!reportContext} onChange={(e) => setScenario(e.target.value as typeof scenario)}>
                  <option value="normal">正常 · 无额外延迟</option>
                  <option value="delayed">延迟演示 · 等待3秒，可取消</option>
                  <option value="timeout">超时演示 · 等待2秒，限时0.6秒</option>
                </select>
                <button type="button" className="secondary" disabled={disabled || !!reportContext || !input.trim() || runs.some((item) => item.status === 'running')} onClick={() => execute(false)}>启动固定测试运行</button>
              </div>
            </details>
          </form>
        </>}
      </div>
    </div>
  </section>;
}
