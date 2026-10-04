import { request as httpRequest, type Agent, type ClientRequest } from 'node:http';
import type { StreamEvent } from '../conversation-types';
import type { RunStreamUpdate } from '../bridge';

const eventTypes = ['run_started', 'message_started', 'status', 'text_delta', 'message_completed',
  'run_completed', 'tool_started', 'tool_result', 'error', 'cancelled'];

// Only complete frames advance the cursor. Partial UTF-8 and CRLF are handled
// across HTTP chunks; a torn final frame is discarded on the next connection.
export class FrameDecoder {
  private buffer = '';
  push(chunk: string): string[] {
    this.buffer = (this.buffer + chunk).replaceAll('\r\n', '\n');
    const frames: string[] = [];
    let end: number;
    while ((end = this.buffer.indexOf('\n\n')) >= 0) {
      frames.push(this.buffer.slice(0, end)); this.buffer = this.buffer.slice(end + 2);
    }
    if (this.buffer.length > 262144 || frames.some((frame) => frame.length > 262144)) throw new Error('SSE单帧过大。');
    return frames;
  }
}

export function decodeEvent(frame: string, sessionId: string, runId: string): StreamEvent | undefined {
  const fields = frame.split('\n').filter((line) => line && !line.startsWith(':'));
  if (!fields.length) return;
  const event = JSON.parse(fields.filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n')) as StreamEvent;
  if (!event || event.protocol_version !== 1 || event.session_id !== sessionId || event.run_id !== runId ||
      !Number.isSafeInteger(event.sequence) || event.sequence < 1 || !eventTypes.includes(event.type) ||
      !event.payload || typeof event.payload !== 'object' ||
      fields.filter((line) => line.startsWith('id: ')).join() !== `id: ${runId}:${event.sequence}` ||
      fields.filter((line) => line.startsWith('event: ')).join() !== `event: ${event.type}`) {
    throw new Error('SSE事件身份、类型或序号不符合契约。');
  }
  return event;
}

export class RunSubscription {
  private request?: ClientRequest;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private failures = 0;
  constructor(private readonly options: {
    port: number; token: string; agent: Agent; sessionId: string; runId: string; after: number;
    update: (value: RunStreamUpdate) => void; closed: () => void;
  }) {}

  start() { this.connect(); }
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.request?.destroy();
    this.options.closed();
  }
  private status(phase: Extract<RunStreamUpdate, { kind: 'connection' }>['phase'], detail: string) {
    if (!this.stopped) this.options.update({ kind: 'connection', phase, detail });
  }
  private connect() {
    if (this.stopped) return;
    const o = this.options;
    this.status(this.failures ? 'reconnecting' : 'connecting', this.failures ? '事件连接中断，正从已收到序号续读…' : '正在订阅已保存的事件…');
    let finished = false;
    const failed = (message: string, fatal = false) => {
      if (finished || this.stopped) return;
      finished = true;
      this.request?.destroy();
      if (fatal) { this.status('failed', message); this.stop(); return; }
      this.failures++;
      this.status('reconnecting', message);
      this.retryTimer = setTimeout(() => this.connect(), Math.min(250 * 2 ** Math.min(this.failures - 1, 4), 4000));
    };
    const req = this.request = httpRequest(`http://127.0.0.1:${o.port}/sessions/${o.sessionId}/runs/${o.runId}/events?follow=true&after_sequence=${o.after}`, {
      agent: o.agent, headers: { 'X-ResearchTrail-Token': o.token, 'Last-Event-ID': `${o.runId}:${o.after}` },
    }, (response) => {
      if (this.stopped) { response.destroy(); return; }
      if (response.statusCode !== 200 || !response.headers['content-type']?.startsWith('text/event-stream')) {
        failed(`事件订阅返回HTTP ${response.statusCode || 0}。`, [400, 401, 404].includes(response.statusCode || 0)); return;
      }
      this.status('connected', '事件已连接');
      response.setEncoding('utf8');
      const decoder = new FrameDecoder();
      response.on('data', (chunk: string) => {
        if (finished || this.stopped) return;
        try {
          for (const frame of decoder.push(chunk)) {
            const event = decodeEvent(frame, o.sessionId, o.runId);
            if (!event || event.sequence <= o.after) continue;
            if (event.sequence !== o.after + 1) throw new Error('事件序号有缺口，正从已收到序号续读。');
            this.options.update({ kind: 'event', event });
            o.after = event.sequence;
            this.failures = 0;
            if (event.type === 'run_completed') {
              finished = true; this.status('closed', '运行已结束，事件已同步'); this.stop(); return;
            }
          }
        } catch (error) { failed((error as Error).message); }
      });
      response.on('end', () => {
        if (finished || this.stopped) return;
        // A history subscriber may already be exactly at a terminal waterline.
        // Python's headers distinguish this EOF from a torn running stream.
        const terminal = ['completed', 'failed', 'cancelled', 'timed_out', 'interrupted'].includes(String(response.headers['x-researchtrail-run-status']));
        const finalSequence = Number(response.headers['x-researchtrail-last-sequence']);
        if (terminal && Number.isSafeInteger(finalSequence) && o.after === finalSequence) {
          finished = true; this.status('closed', '运行已结束，事件已同步'); this.stop();
        } else failed('事件流提前结束，正从已收到序号续读…');
      });
      response.on('error', () => failed('事件连接中断，正从已收到序号续读…'));
      response.on('aborted', () => failed('事件连接中断，正从已收到序号续读…'));
    });
    req.setTimeout(30000, () => failed('事件连接长时间无响应，正在重连…'));
    req.on('error', () => failed('事件连接中断，正从已收到序号续读…'));
    req.end();
  }
}
