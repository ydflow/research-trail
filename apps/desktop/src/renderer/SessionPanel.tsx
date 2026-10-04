import { useEffect, useState } from 'react';
import type { MessageDTO, RunDTO, SessionDTO, StreamEvent } from '../conversation-types';
import { eventDetail, mergeEvents, messageView } from './session-adapter';
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
    setRun(undefined); setEvents([]);
    if (available && selected && runId && window.researchTrail) {
      const bridge = window.researchTrail;
      void Promise.all([bridge.getRun(selected, runId), bridge.runEvents(selected, runId)])
        .then(([record, items]) => { if (active) { setRun(record); setEvents(items); } })
        .catch((e: Error) => { if (active) setError(e.message); });
    }
    return () => { active = false; };
  }, [available, selected, runId]);

  const perform = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const disabled = busy || loading || !available;
  const execute = (agent: boolean) => void perform(async () => {
    const bridge = window.researchTrail!;
    await (agent ? bridge.startAgentRun(current!.id, input) : bridge.startRun(current!.id, input));
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
              <p>{message.content}</p>
            </article>)}
          </div>
          <form className="run-form" onSubmit={(e) => { e.preventDefault(); execute(true); }}>
            <label htmlFor="run-input">测试输入</label>
            <textarea id="run-input" maxLength={2000} rows={2} value={input} onChange={(e) => setInput(e.target.value)} disabled={disabled} />
            <div className="run-actions">
              <button disabled={disabled || !input.trim()}>运行规则演示</button>
              <button type="button" className="secondary" disabled={disabled || !input.trim()} onClick={() => execute(false)}>启动固定测试运行</button>
            </div>
          </form>
          {runs.length > 0 && <div className="event-section">
            <label htmlFor="run-select">运行记录</label>
            <select id="run-select" value={runId} disabled={disabled} onChange={(e) => setRunId(e.target.value)}>
              {runs.map((item) => <option key={item.id} value={item.id}>{item.input} · {new Date(item.started_at).toLocaleTimeString('zh-CN')}</option>)}
            </select>
            {run && run.id === runId && <>
              <p className={run.status === 'failed' ? 'market-error' : 'market-note'} data-testid="run-state">
                {run.kind === 'fake_agent' ? run.model_label : '固定测试'} · {run.status === 'failed' ? '运行失败' : '已完成'} · {run.last_sequence} 个持久化事件
              </p>
              {run.error && <p role="alert" className="market-error" data-testid="run-error">{run.error.code}：{run.error.message}</p>}
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
