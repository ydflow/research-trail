const assert = require('node:assert/strict');
const test = require('node:test');
const { createServer, Agent } = require('node:http');
const { once } = require('node:events');
const { setTimeout: sleep } = require('node:timers/promises');
const { resolve } = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');

// Compile TypeScript in memory, with no build/test artifacts in source control.
function load(relative) {
  const file = resolve(__dirname, '..', relative);
  const source = buildSync({ entryPoints: [file], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
  const compiled = new Module(file, module); compiled.paths = module.paths; compiled._compile(source, file);
  return compiled.exports;
}
const { FrameDecoder, decodeEvent, RunSubscription } = load('apps/desktop/src/main/run-stream.ts');
const { applySessionEvent, toolViews } = load('apps/desktop/src/renderer/session-adapter.ts');
const { MonitorNotifications } = load('apps/desktop/src/main/monitor-notifications.ts');

test('notification polling requires durable claim and sends one native notice',async()=>{
  const run={id:'notice',status:'triggered',notification_status:'pending',payload:{}};
  let claimed=false,shows=0;const receipts=[];
  const port={pendingNotifications:async()=>[run],claimNotification:async()=>{
    if(claimed)return null;claimed=true;return run;
  },finishNotification:async(id,status)=>{receipts.push({id,status});return run;}};
  const worker=new MonitorNotifications(port,async()=>{shows++;return 'shown';});worker.start();
  try{await worker.poll();await worker.poll();assert.equal(shows,1);assert.deepEqual(receipts,[{id:'notice',status:'shown'}]);}
  finally{worker.stop();}
});

test('notification receipt error does not cause replay and concurrent polls serialize',async()=>{
  const run={id:'notice',payload:{}};let claimed=false,shows=0;let release;
  const wait=new Promise(resolve=>{release=resolve;});
  const worker=new MonitorNotifications({pendingNotifications:async()=>[run],claimNotification:async()=>{
    if(claimed)return null;claimed=true;return run;
  },finishNotification:async()=>{throw new Error('receipt unavailable');}},async()=>{shows++;await wait;return 'shown';});
  worker.start();try{const first=worker.poll();await new Promise(resolve=>setImmediate(resolve));await worker.poll();
    release();await first;await worker.poll();assert.equal(shows,1);
  }finally{release();worker.stop();}
});

test('notification native failure persists safe failure and never repeats',async()=>{
  let claimed=false;const statuses=[];
  const worker=new MonitorNotifications({pendingNotifications:async()=>[{id:'notice'}],claimNotification:async()=>{
    if(claimed)return null;claimed=true;return {id:'notice'};
  },finishNotification:async(_id,status)=>{statuses.push(status);return {id:'notice'};}},async()=>{throw new Error('native exception');});
  worker.start();try{await worker.poll();await worker.poll();assert.deepEqual(statuses,['failed']);}finally{worker.stop();}
});

test('notification stop during claim prevents late native show',async()=>{
  let release;const wait=new Promise(resolve=>{release=resolve;});let shows=0;
  const worker=new MonitorNotifications({pendingNotifications:async()=>[{id:'notice'}],claimNotification:async()=>{
    await wait;return {id:'notice'};
  },finishNotification:async()=>{throw new Error('must not settle stopped claim');}},async()=>{shows++;return 'shown';});
  worker.start();const poll=worker.poll();await new Promise(resolve=>setImmediate(resolve));worker.stop();release();await poll;
  assert.equal(shows,0);
});
const sid = '11111111-1111-1111-1111-111111111111', rid = '22222222-2222-2222-2222-222222222222';
const event = (sequence, type = 'text_delta') => ({ protocol_version: 1, session_id: sid, run_id: rid, sequence,
  timestamp: '2026-10-04T00:00:00Z', type, message_id: 'reply', payload: type === 'run_completed' ? { stop_reason: 'completed' } : { text: '研迹' } });
const frame = (value) => `id: ${value.run_id}:${value.sequence}\nevent: ${value.type}\ndata: ${JSON.stringify(value)}\n\n`;
async function server(handler) {
  const app = createServer(handler); app.listen(0, '127.0.0.1'); await once(app, 'listening');
  return app;
}

test('SSE decoder handles split CRLF, comments, multiple frames and identity bounds', () => {
  const decoder = new FrameDecoder(); const frames = [];
  for (const char of (': heartbeat\n\n' + frame(event(1)) + frame(event(2))).replaceAll('\n', '\r\n')) frames.push(...decoder.push(char));
  assert.equal(decodeEvent(frames[0], sid, rid), undefined);
  assert.deepEqual(frames.slice(1).map((value) => decodeEvent(value, sid, rid).sequence), [1, 2]);
  assert.throws(() => decodeEvent(frame({ ...event(1), session_id: 'other' }), sid, rid), /身份/);
  assert.throws(() => new FrameDecoder().push('x'.repeat(262145)), /过大/);
});

test('reconnect resumes complete frame cursor, discards torn frame and drops duplicate event', { timeout: 5000 }, async () => {
  const seen = [], updates = [], agent = new Agent({ keepAlive: true, proxyEnv: {} });
  const app = await server((req, res) => {
    seen.push({ url: req.url, id: req.headers['last-event-id'], token: req.headers['x-researchtrail-token'] });
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    if (seen.length === 1) res.end(frame(event(1)) + frame(event(2)).slice(0, -4));
    else res.end(frame(event(1)) + frame(event(2)) + frame(event(3, 'run_completed')));
  });
  let subscription;
  try {
    await new Promise((done) => {
      subscription = new RunSubscription({ port: app.address().port, token: 'test-only', agent, sessionId: sid, runId: rid, after: 0,
        update: (value) => updates.push(value), closed: done }); subscription.start();
    });
    assert.equal(seen.length, 2);
    assert.match(seen[1].url, /after_sequence=1$/); assert.equal(seen[1].id, `${rid}:1`);
    assert.deepEqual(updates.filter((value) => value.kind === 'event').map((value) => value.event.sequence), [1, 2, 3]);
    assert.ok(updates.some((value) => value.phase === 'reconnecting'));
    assert.equal(seen[0].token, 'test-only');
  } finally { subscription?.stop(); agent.destroy(); app.closeAllConnections(); await new Promise((done) => app.close(done)); }
});

test('unsubscribe cancels pending reconnect and authentication error does not retry', { timeout: 5000 }, async () => {
  for (const status of [200, 401]) {
    let requests = 0, subscription;
    const agent = new Agent({ proxyEnv: {} });
    const app = await server((_req, res) => { requests++; res.writeHead(status, { 'Content-Type': 'text/event-stream' }); res.end(); });
    try {
      await new Promise((done) => {
        subscription = new RunSubscription({ port: app.address().port, token: 'test-only', agent, sessionId: sid, runId: rid, after: 0,
          update: (value) => { if (value.phase === 'reconnecting' || value.phase === 'failed') done(); }, closed: () => {} }); subscription.start();
      });
      subscription.stop(); await sleep(350); assert.equal(requests, 1);
    } finally { subscription?.stop(); agent.destroy(); app.closeAllConnections(); await new Promise((done) => app.close(done)); }
  }
});

test('snapshot plus stream updates one reply, ignores old/cross-session events and preserves Python terminal authority', () => {
  const snapshot = { session: { id: sid }, runs: [{ id: rid, status: 'running', last_sequence: 2 }],
    messages: [{ id: 'reply', run_id: rid, content: '快照已有文字' }], events: [event(1), event(2)] };
  const next = applySessionEvent(snapshot, event(3));
  assert.equal(next.messages.length, 1); assert.equal(next.messages[0].content, '快照已有文字研迹');
  assert.equal(applySessionEvent(next, event(3)), next);
  assert.equal(applySessionEvent(next, { ...event(4), session_id: 'other' }), next);
  assert.equal(applySessionEvent(next, { ...event(3), run_id: 'other' }), next);
  assert.throws(() => applySessionEvent(next, event(5)), /不连续/);
  assert.equal(applySessionEvent(next, event(4, 'run_completed')).runs[0].status, 'running');
  const calls = toolViews([{ ...event(1, 'tool_started'), payload: { call_id: 'tool', name: 'market.quote', input: { symbol: 'AAPL.US' } } }],
    { id: rid, status: 'cancelled', completed_at: '2026-10-04T00:00:01Z' });
  assert.equal(calls[0].status, 'cancelled');
});

test('terminal history at its final cursor closes without a reconnect loop', { timeout: 5000 }, async () => {
  let requests = 0, subscription;
  const updates = [], agent = new Agent({ proxyEnv: {} });
  const app = await server((_req, res) => {
    requests++; res.writeHead(200, { 'Content-Type': 'text/event-stream',
      'X-ResearchTrail-Run-Status': 'cancelled', 'X-ResearchTrail-Last-Sequence': '8' }); res.end();
  });
  try {
    await new Promise((done) => {
      subscription = new RunSubscription({ port: app.address().port, token: 'test-only', agent, sessionId: sid, runId: rid, after: 8,
        update: (value) => updates.push(value), closed: done }); subscription.start();
    });
    await sleep(350);
    assert.equal(requests, 1); assert.equal(updates.at(-1).phase, 'closed');
    assert.equal(updates.filter((value) => value.kind === 'event').length, 0);
  } finally { subscription?.stop(); agent.destroy(); app.closeAllConnections(); await new Promise((done) => app.close(done)); }
});
