import type { MessageDTO, RunDTO, StreamEvent, SessionSnapshot, SessionHistoryPage } from '../conversation-types';
function toolTarget(input: Extract<StreamEvent, { type: 'tool_started' }>['payload']['input']) {
  return 'report_id' in input ? `报告 ${input.report_id} · 采集 ${input.source_run_id}` : 'symbol' in input ? input.symbol : 'portfolio_id' in input ? input.portfolio_id : input.symbols.join(', ');
}

export function runStatus(status: RunDTO['status']) {
  return { running: '运行中', completed: '已完成', failed: '运行失败', cancelled: '已取消',
    timed_out: '已超时', interrupted: '已中断' }[status];
}

// Display/legacy UI compatibility lives here, never in Python's business schema.
// Folio UI timestamps were epoch milliseconds; the canonical DTO uses UTC ISO.
export function messageView(message: MessageDTO) {
  return { ...message, timestamp: Date.parse(message.created_at),
    label: message.role === 'user' ? '我的输入' : '已保存的回复' };
}

export function eventDetail(event: StreamEvent): string {
  switch (event.type) {
    case 'run_started': return event.payload.input;
    case 'status': return event.payload.detail;
    case 'text_delta': return event.payload.text;
    case 'run_completed': return { completed: '运行已完成', error: '运行失败', cancelled: '已取消', timeout: '已超时', interrupted: '已中断' }[event.payload.stop_reason];
    case 'cancelled': return '主动取消；已保存内容保留';
    case 'message_started': return '回复开始';
    case 'message_completed': return '回复已保存';
    case 'tool_started': return `调用Python工具 ${event.payload.name}，参数 ${toolTarget(event.payload.input)}`;
    case 'tool_result': return event.payload.result.ok ? `Python工具 ${event.payload.name} 返回数据，详见结果卡片` : `${event.payload.result.error.code}：${event.payload.result.error.message}`;
    case 'error': return `${event.payload.code}：${event.payload.message}`;
  }
}

export function mergeEvents(previous: StreamEvent[], incoming: StreamEvent[]) {
  const cache = new Map(previous.map((event) => [`${event.run_id}:${event.sequence}`, event]));
  for (const event of incoming) cache.set(`${event.run_id}:${event.sequence}`, event);
  return [...cache.values()].sort((a, b) => a.sequence - b.sequence);
}

// Snapshot text already includes its event waterline. Only unseen protocol
// events update the same message ID; no legacy message channel is subscribed.
export function applySessionEvent(snapshot: SessionSnapshot, event: StreamEvent): SessionSnapshot {
  if (event.session_id !== snapshot.session.id) return snapshot;
  const run = snapshot.runs.find((item) => item.id === event.run_id);
  if (!run || event.sequence <= run.last_sequence) return snapshot;
  if (event.sequence !== run.last_sequence + 1) throw new Error('事件序号不连续，请重新读取会话。');
  return { ...snapshot,
    // Identity/sequence checks above prove append-only order for this run.
    // Avoid rebuilding and sorting a Map of all saved history per SSE event.
    events: [...snapshot.events, event],
    runs: snapshot.runs.map((item) => item.id === run.id ? { ...item, last_sequence: event.sequence } : item),
    messages: event.type === 'text_delta' ? snapshot.messages.map((item) => item.id === event.message_id && item.run_id === event.run_id
      ? { ...item, content: item.content + event.payload.text } : item) : snapshot.messages,
  };
}

export function mergeHistory(current: SessionHistoryPage, incoming: SessionHistoryPage, head = false): SessionHistoryPage {
  if (current.session.id !== incoming.session.id) return current;
  // A disconnected renderer may miss more than a page of new runs. Keeping its
  // old tail cursor would hide the middle gap. Rebuild from the fresh head so
  // every omitted run remains reachable through the server's returned cursor.
  if (head && current.messages.length && incoming.messages.length &&
      incoming.messages[0].sequence > current.messages.at(-1)!.sequence + 1) return incoming;
  // An earlier-page request can outlive that head refresh. Only overlapping or
  // adjacent older pages belong to the current chain; keep its cursor on gaps.
  if (!head && current.messages.length && incoming.messages.length &&
      incoming.messages.at(-1)!.sequence < current.messages[0].sequence - 1) return current;
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...new Map([...a, ...b].map(item => [item.id, item])).values()];
  const older = current.messages.length && (!incoming.messages.length || current.messages[0].sequence < incoming.messages[0].sequence) ? current : incoming;
  // A head refresh replaces overlapping records with newer SQLite facts. Older
  // pages must never roll back the live message or its SSE waterline.
  const first = head ? current : incoming, last = head ? incoming : current;
  return { session: head ? incoming.session : current.session,
    messages: merge(first.messages, last.messages).sort((a, b) => a.sequence - b.sequence),
    runs: merge(first.runs, last.runs).sort((a, b) => b.started_at.localeCompare(a.started_at) || a.id.localeCompare(b.id)),
    events: mergeEvents(first.events, last.events),
    has_more: older.has_more, next_before_sequence: older.next_before_sequence };
}

export interface ToolView {
  id: string; name: string; symbol: string; startedAt: number; completedAt?: number;
  status: 'running' | 'success' | 'error' | 'cancelled' | 'timed_out' | 'interrupted';
}

export function toolViews(events: StreamEvent[], run: RunDTO): ToolView[] {
  const calls = new Map<string, ToolView>();
  for (const event of events) {
    if (event.run_id !== run.id) continue;
    if (event.type === 'tool_started') calls.set(event.payload.call_id, { id: event.payload.call_id, name: event.payload.name,
      symbol: toolTarget(event.payload.input), startedAt: Date.parse(event.timestamp), status: 'running' });
    if (event.type === 'tool_result') {
      const call = calls.get(event.payload.call_id);
      if (call) { call.status = event.payload.result.ok ? 'success' : 'error'; call.completedAt = Date.parse(event.timestamp); }
    }
  }
  for (const call of calls.values()) {
    if (call.status === 'running' && run.status !== 'running') {
      call.status = ['cancelled', 'timed_out', 'interrupted'].includes(run.status) ? run.status as ToolView['status'] : 'error';
      call.completedAt = run.completed_at ? Date.parse(run.completed_at) : undefined;
    }
  }
  return [...calls.values()];
}
