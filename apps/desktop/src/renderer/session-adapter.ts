import type { MessageDTO, StreamEvent } from '../conversation-types';

// Display/legacy UI compatibility lives here, never in Python's business schema.
// Folio UI timestamps were epoch milliseconds; the canonical DTO uses UTC ISO.
export function messageView(message: MessageDTO) {
  return { ...message, timestamp: Date.parse(message.created_at),
    label: message.role === 'user' ? '我的测试输入' : '固定测试响应' };
}

export function eventDetail(event: StreamEvent): string {
  switch (event.type) {
    case 'run_started': return event.payload.input;
    case 'status': return event.payload.detail;
    case 'text_delta': return event.payload.text;
    case 'run_completed': return '固定测试已完成';
    case 'message_started': return '固定测试响应开始';
    case 'message_completed': return '固定测试响应已保存';
  }
}

export function mergeEvents(previous: StreamEvent[], incoming: StreamEvent[]) {
  const cache = new Map(previous.map((event) => [`${event.run_id}:${event.sequence}`, event]));
  for (const event of incoming) cache.set(`${event.run_id}:${event.sequence}`, event);
  return [...cache.values()].sort((a, b) => a.sequence - b.sequence);
}
