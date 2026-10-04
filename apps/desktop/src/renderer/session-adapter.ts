import type { MessageDTO, RunDTO, StreamEvent } from '../conversation-types';

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
    case 'tool_started': return `调用Python工具 ${event.payload.name}，参数 ${event.payload.input.symbol}`;
    case 'tool_result': return event.payload.result.ok ? `Python工具 ${event.payload.name} 返回数据，详见结果卡片` : `${event.payload.result.error.code}：${event.payload.result.error.message}`;
    case 'error': return `${event.payload.code}：${event.payload.message}`;
  }
}

export function mergeEvents(previous: StreamEvent[], incoming: StreamEvent[]) {
  const cache = new Map(previous.map((event) => [`${event.run_id}:${event.sequence}`, event]));
  for (const event of incoming) cache.set(`${event.run_id}:${event.sequence}`, event);
  return [...cache.values()].sort((a, b) => a.sequence - b.sequence);
}
