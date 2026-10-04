import { useEffect, useState } from 'react';
import type { MessageDTO, RunDTO, SessionDTO, StreamEvent } from '../conversation-types';
import { eventDetail, mergeEvents, messageView, runStatus } from './session-adapter';
import { ToolResultCards } from './ToolResultCards';

export function SessionPanel({ available }: { available: boolean }) {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [selected, setSelected] = useState('');
  const [current, setCurrent] = useState<SessionDTO>();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [runs, setRuns] = useState<RunDTO[]>([]);
  const [runId, setRunId] = useState('');
  const [run, setRun] = useState<RunDTO>();
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [scenario, setScenario] = useState<'normal' | 'delayed' | 'timeout'>('normal');

  useEffect(() => {
    let active = true;
    setSessions([]); setSelected(''); setError('');
    if (available && window.researchTrail) {
      void window.researchTrail.listSessions().then((items) => {
        if (active) { setSessions(items); setSelected(items[0]?.id || ''); }
      }).catch((e: Error) => { if (active) setError(e.message); });
    }
    return () => { active = false; };
  }, [available]);

  useEffect(() => {
    let active = true;
    setCurrent(undefined); setMessages([]); setRuns([]); setRunId(''); setRun(undefined); setEvents([]);
    setLoading(Boolean(available && selected));
    if (available && selected && window.researchTrail) {
      const bridge = window.researchTrail;
      void Promise.all([bridge.getSession(selected), bridge.sessionMessages(selected), bridge.sessionRuns(selected)])
        .then(([session, history, items]) => {
          if (active) { setCurrent(session); setMessages(history); setRuns(items); setRunId(items[0]?.id || ''); }
        }).catch((e: Error) => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [available, selected, revision]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRun(undefined); setEvents([]);
    if (available && selected && runId && window.researchTrail) {
      const bridge = window.researchTrail;
      const read = async () => {
        try {
          // Finite committed SSE snapshots; no automatic stream reconnection.
          const [record, items] = await Promise.all([bridge.getRun(selected, runId), bridge.runEvents(selected, runId)]);
          if (!active) return;
          setRun(record); setEvents(items);
          if (record.status === 'running') timer = setTimeout(() => void read(), 200);
          else {
            const [history, list, sessionList, finalEvents] = await Promise.all([bridge.sessionMessages(selected), bridge.sessionRuns(selected), bridge.listSessions(), bridge.runEvents(selected, runId)]);
            if (active) { setMessages(history); setRuns(list); setSessions(sessionList); setEvents(finalEvents); }
            if (active && list.some((item) => item.status === 'running')) timer = setTimeout(() => void read(), 200);
          }
        } catch (e) { if (active) setError((e as Error).message); }
      };
      void read();
    }
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [available, selected, runId]);

  const perform = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const disabled = busy || loading || !available;
  const execute = (agent: boolean) => void perform(async () => {
    const bridge = window.researchTrail!;
    await (agent ? bridge.startAgentRun(current!.id, input, scenario) : bridge.startRun(current!.id, input));
    setInput(''); setSessions(await bridge.listSessions()); setRevision((v) => v + 1);
  });
  return <section className="session-panel" aria-label="持久化会话">
    <div className="market-heading"><h2>研究会话</h2><span className="mock-badge">规则演示／假模型</span></div>
    <p className="market-note">确定性规则调用Python数据工具，不是真实LLM。历史由本地服务保存，重读不重复执行。</p>
    {!available && <p className="market-message">连接后端后可查看会话历史。</p>}
    {error && <p className="market-error" role="alert">{error}</p>}
    <form className="session-form" onSubmit={(e) => {
      e.preventDefault();
      void perform(async () => {
        const bridge = window.researchTrail!;
        const item = await bridge.createSession(title.trim() || '新会话');
        setSessions(await bridge.listSessions()); setSelected(item.id); setTitle(''); setInput('');
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
          onClick={() => { setSelected(item.id); setInput(''); setError(''); }}>
          <strong>{item.title}</strong><span>{item.message_count} 条消息</span>
        </button>)}
      </aside>
      <div className="session-content">
        {loading && <p className="market-message">读取历史…</p>}
        {current && current.id === selected && <>
          <div className="market-heading"><h3 data-testid="current-session">{current.title}</h3>
            <button className="secondary" disabled={disabled} onClick={() => void perform(async () => {
              const bridge = window.researchTrail!;
              await bridge.deleteSession(current.id);
              const items = await bridge.listSessions(); setSessions(items); setSelected(items[0]?.id || '');
            })}>删除当前会话</button>
          </div>
          <div className="message-history" data-testid="message-history" aria-label="消息历史">
            {messages.length === 0 && <p className="market-note">暂无消息。试试“查询AAPL.US行情”或“查看NVDA.US的K线”。</p>}
            {messages.map(messageView).map((message) => <article key={message.id} className={`message ${message.role}`}>
              <div>{message.label}<time>{new Date(message.timestamp).toLocaleString('zh-CN', { hour12: false })}</time></div>
              <p>{message.content || '等待运行结果…'}</p>
            </article>)}
          </div>
          <form className="run-form" onSubmit={(e) => { e.preventDefault(); execute(true); }}>
            <label htmlFor="run-input">测试输入</label>
            <textarea id="run-input" maxLength={2000} rows={2} value={input} onChange={(e) => setInput(e.target.value)} disabled={disabled} />
            <label htmlFor="tool-scenario">模拟工具时序</label>
            <select id="tool-scenario" value={scenario} disabled={disabled} onChange={(e) => setScenario(e.target.value as typeof scenario)}>
              <option value="normal">正常 · 无额外延迟</option>
              <option value="delayed">延迟演示 · 等待3秒，可取消</option>
              <option value="timeout">超时演示 · 等待2秒，限时0.6秒</option>
            </select>
            <div className="run-actions">
              <button disabled={disabled || !input.trim() || runs.some((item) => item.status === 'running')}>运行规则演示</button>
              <button type="button" className="secondary" disabled={disabled || !input.trim() || runs.some((item) => item.status === 'running')} onClick={() => execute(false)}>启动固定测试运行</button>
            </div>
          </form>
          {runs.length > 0 && <div className="event-section">
            <label htmlFor="run-select">运行记录</label>
            <select id="run-select" value={runId} disabled={disabled} onChange={(e) => setRunId(e.target.value)}>
              {runs.map((item) => <option key={item.id} value={item.id}>{item.input} · {new Date(item.started_at).toLocaleTimeString('zh-CN')}</option>)}
            </select>
            {run && run.id === runId && <>
              <p className={run.status === 'failed' ? 'market-error' : 'market-note'} data-testid="run-state">
                {run.kind === 'fake_agent' ? run.model_label : '固定测试'} · {runStatus(run.status)} · {run.last_sequence} 个持久化事件
              </p>
              {run.error && <p role="alert" className="market-error" data-testid="run-error">{run.error.code}：{run.error.message}</p>}
              <button className="secondary" disabled={disabled || run.status !== 'running'} onClick={() => void perform(async () => {
                const record = await window.researchTrail!.cancelRun(selected, runId);
                setRun(record); setRevision((v) => v + 1);
              })}>取消运行</button>
              {run.status === 'interrupted' && <p className="market-note">保存内容已保留。请在输入框重新发起；不会自动调用工具或模型。</p>}
            </>}
            <ToolResultCards events={events} runId={runId} />
            <button className="secondary" disabled={disabled || !run} onClick={() => void perform(async () => {
              const items = await window.researchTrail!.runEvents(selected, runId);
              setEvents((previous) => mergeEvents(previous, items));
            })}>重新读取事件</button>
            <ol className="event-list" data-testid="event-list">
              {events.map((event) => <li key={`${event.run_id}:${event.sequence}`}><span>#{event.sequence} {event.type}</span><p>{eventDetail(event)}</p></li>)}
            </ol>
          </div>}
        </>}
      </div>
    </div>
  </section>;
}
