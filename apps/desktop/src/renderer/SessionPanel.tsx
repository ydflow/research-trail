import { useEffect, useState } from 'react';
import type { SessionDTO, SessionSnapshot } from '../conversation-types';
import { applySessionEvent, eventDetail, messageView, runStatus, toolViews } from './session-adapter';
import { ToolResultCards } from './ToolResultCards';
import { ToolActivity } from './ToolActivity';

export function SessionPanel({ available }: { available: boolean }) {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [initialSelection] = useState(() => sessionStorage.getItem('research-trail.session') || '');
  const [selected, setSelected] = useState('');
  const [snapshot, setSnapshot] = useState<SessionSnapshot>();
  const [runId, setRunId] = useState(() => sessionStorage.getItem('research-trail.run') || '');
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [stream, setStream] = useState('等待数据库快照');
  const [scenario, setScenario] = useState<'normal' | 'delayed' | 'timeout'>('normal');
  const [modelKind, setModelKind] = useState<'fake_agent' | 'openai_agent'>('fake_agent');

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
      void bridge.sessionSnapshot(selected).then((saved) => {
        if (!active) return;
        setSnapshot(saved);
        setRunId((previous) => saved.runs.some((item) => item.id === previous) ? previous : saved.runs[0]?.id || '');
        setLoading(false); setStream('历史已同步');
        // Events committed between snapshot and subscription are replayed by SSE.
        for (const record of saved.runs.filter((item) => item.status === 'running')) {
          unsubscribe.push(bridge.subscribeRun(selected, record.id, record.last_sequence, (update) => {
            if (!active) return;
            if (update.kind === 'connection') { setStream(update.detail); return; }
            setSnapshot((previous) => previous?.session.id === selected ? applySessionEvent(previous, update.event) : previous);
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
  const events = current ? snapshot!.events.filter((event) => event.run_id === runId) : [];
  const perform = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const disabled = busy || loading || !available;
  const execute = (agent: boolean) => void perform(async () => {
    const bridge = window.researchTrail!;
    const record = await (agent ? bridge.startAgentRun(current!.id, input, modelKind === 'openai_agent' ? 'normal' : scenario, modelKind) : bridge.startRun(current!.id, input));
    setInput(''); setRunId(record.id); setSessions(await bridge.listSessions()); setRevision((value) => value + 1);
  });

  return <section className="session-panel" aria-label="持久化会话">
    <div className="market-heading"><h2>研究会话</h2><span className="mock-badge">{modelKind === 'fake_agent' ? '规则演示／假模型' : 'OpenAI兼容／真实模型'}</span></div>
    <p className="market-note">模型共用Python只读工具，行情仍为模拟数据。先读数据库快照，再订阅事件；查看历史不会重新执行。</p>
    <p className="stream-state" role="status" data-testid="stream-state">事件连接：{stream}</p>
    {error && <p className="market-error" role="alert">{error}</p>}
    <form className="session-form" onSubmit={(e) => {
      e.preventDefault();
      void perform(async () => {
        const bridge = window.researchTrail!;
        const item = await bridge.createSession(title.trim() || '新会话');
        setSessions(await bridge.listSessions()); setSelected(item.id); setTitle(''); setInput(''); setRunId('');
      });
    }}>
      <label htmlFor="session-title">会话标题</label>
      <input id="session-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="新会话" disabled={disabled} />
      <button disabled={disabled}>创建会话</button>
    </form>
    <div className="session-layout">
      <aside className="session-list" aria-label="会话列表">
        {sessions.length === 0 && <p className="market-note">还没有会话。</p>}
        {sessions.map((item) => <button key={item.id} aria-pressed={selected === item.id} disabled={busy || !available}
          onClick={() => { setSelected(item.id); setInput(''); setError(''); setRunId(''); }}>
          <strong>{item.title}</strong><span>{item.message_count} 条消息</span>
        </button>)}
      </aside>
      <div className="session-content">
        {loading && <p className="market-message">读取历史…</p>}
        {current && <>
          <div className="market-heading"><h3 data-testid="current-session">{current.title}</h3>
            <button className="secondary" disabled={disabled} onClick={() => void perform(async () => {
              const bridge = window.researchTrail!;
              await bridge.deleteSession(current.id);
              const items = await bridge.listSessions(); setSessions(items); setSelected(items[0]?.id || ''); setRunId('');
            })}>删除当前会话</button>
          </div>
          <div className="message-history" data-testid="message-history" aria-label="消息历史">
            {messages.length === 0 && <p className="market-note">暂无消息。试试“查询AAPL.US行情”或“查看NVDA.US的K线”。</p>}
            {messages.map(messageView).map((message) => <article key={message.id} className={`message ${message.role}`} data-message-id={message.id}>
              <div>{message.label}<time>{new Date(message.timestamp).toLocaleString('zh-CN', { hour12: false })}</time></div>
              <p>{message.content || '等待运行结果…'}</p>
            </article>)}
          </div>
          <form className="run-form" onSubmit={(e) => { e.preventDefault(); execute(true); }}>
            <label htmlFor="agent-model">运行模型</label>
            <select id="agent-model" value={modelKind} disabled={disabled || runs.some(item => item.status === 'running')}
              onChange={e => setModelKind(e.target.value as typeof modelKind)}>
              <option value="fake_agent">规则演示／假模型（默认）</option>
              <option value="openai_agent">OpenAI兼容／真实模型（使用本机配置）</option>
            </select>
            {modelKind === 'openai_agent' && <p className="market-note">运行会向设置中的模型服务发送本次输入与工具结果（包括主动请求的组合风险数值），可能产生API费用。先在“模型设置”保存Base URL、模型ID、API Key与限制；不会发送历史会话或个人资料，不会自动重试。</p>}
            <label htmlFor="run-input">测试输入</label>
            <textarea id="run-input" maxLength={2000} rows={2} value={input} onChange={(e) => setInput(e.target.value)} disabled={disabled}
              placeholder="查询AAPL.US行情 / 分析组合<完整ID>风险 / 对比AAPL.US MSFT.US" />
            <label htmlFor="tool-scenario">模拟工具时序</label>
            <select id="tool-scenario" value={modelKind === 'openai_agent' ? 'normal' : scenario} disabled={disabled || modelKind === 'openai_agent'} onChange={(e) => setScenario(e.target.value as typeof scenario)}>
              <option value="normal">正常 · 无额外延迟</option>
              <option value="delayed">延迟演示 · 等待3秒，可取消</option>
              <option value="timeout">超时演示 · 等待2秒，限时0.6秒</option>
            </select>
            <div className="run-actions">
              <button disabled={disabled || !input.trim() || runs.some((item) => item.status === 'running')}>{modelKind === 'fake_agent' ? '运行规则演示' : '运行真实模型'}</button>
              <button type="button" className="secondary" disabled={disabled || !input.trim() || runs.some((item) => item.status === 'running')} onClick={() => execute(false)}>启动固定测试运行</button>
            </div>
          </form>
          {runs.length > 0 && <div className="event-section">
            <label htmlFor="run-select">运行记录</label>
            <select id="run-select" value={runId} disabled={disabled} onChange={(e) => setRunId(e.target.value)}>
              {runs.map((item) => <option key={item.id} value={item.id}>{item.input} · {runStatus(item.status)} · {new Date(item.started_at).toLocaleTimeString('zh-CN')}</option>)}
            </select>
            {run && <>
              <p className={run.error ? 'market-error' : 'market-note'} data-testid="run-state">
                {run.model_label || '固定测试'} · {runStatus(run.status)} · {run.last_sequence} 个持久化事件
              </p>
              {run.error && <p role="alert" className="market-error" data-testid="run-error">{run.error.code}：{run.error.message}</p>}
              <button className="secondary" disabled={disabled || run.status !== 'running'} onClick={() => void perform(async () => {
                await window.researchTrail!.cancelRun(selected, runId); setRevision((value) => value + 1);
              })}>取消运行</button>
              {run.status === 'interrupted' && <p className="market-note">保存内容已保留。请在输入框重新发起；不会自动调用工具或模型。</p>}
              <ToolActivity key={run.id} toolCalls={toolViews(events, run)} />
            </>}
            <ToolResultCards events={events} runId={runId} />
            <button className="secondary" disabled={disabled || !run} onClick={() => { setError(''); setRevision((value) => value + 1); }}>重新读取事件</button>
            <details className="event-details" open>
              <summary>已保存的过程事件（{events.length}）</summary>
              <ol className="event-list" data-testid="event-list">
                {events.map((event) => <li key={`${event.run_id}:${event.sequence}`}><span>#{event.sequence} {event.type}</span><p>{eventDetail(event)}</p></li>)}
              </ol>
            </details>
          </div>}
        </>}
      </div>
    </div>
  </section>;
}
