// No CLI discovery, credentials, database, filesystem tools or live model adapter.
import { Agent } from '@earendil-works/pi-agent-core';
import { AssistantMessageEventStream } from '@earendil-works/pi-ai';
import { randomUUID } from 'node:crypto';
import { Channel, MAX_FRAME, ID, exact, parseStrict } from './protocol.mjs';
import { ModelMessages, bound } from './model-messages.mjs';

const [runId, attemptId] = process.argv.slice(2);
if (!ID.test(runId || '') || !ID.test(attemptId || '') || process.argv.length !== 4) process.exit(2);
const channel = new Channel(runId, attemptId);
const pending = new Map();
let agent, started = false, closed = false, rpcTimeout = 3000, hardTimer;
const stats = {agent_start: 0, assistant_batches: 0, tool_execution_start: 0, tool_execution_end: 0, agent_end: 0, stream_calls: 0, results_seen: 0};
function send(type, payload, id = randomUUID()) {
  if (closed) throw new Error('PI_CLOSED');
  process.stdout.write(channel.encode(type, id, payload));
  return id;
}
function halt(code = 0) {
  if (closed) return;
  agent?.abort(); clearTimeout(hardTimer);
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('PI_STOPPED')); }
  pending.clear(); closed = true;
  // Bounded even if parent stops draining stdout; never print raw input/errors.
  const timer = setTimeout(() => process.exit(code), 100); timer.unref();
  process.stdout.end(() => process.exit(code));
}
function fatal() { process.stderr.write('PI_PROTOCOL\n'); halt(2); }
function request(type, payload, response) {
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('PI_RESPONSE_TIMEOUT')); agent?.abort(); }, rpcTimeout);
    pending.set(id, {resolve, reject, timer, response});
    send(type, payload, id);
  });
}

async function run(payload) {
  const modelMode = payload.mode === 'python-model';
  exact(payload, modelMode ? ['mode','tools','system','text','max_model_calls','rpc_timeout_ms','run_timeout_ms'] : ['tools','batches','rpc_timeout_ms','run_timeout_ms']);
  if (modelMode) {
    bound(payload);
    if (typeof payload.system !== 'string' || typeof payload.text !== 'string' || !payload.text.trim() || [...payload.text].length > 4000 ||
        !Number.isInteger(payload.max_model_calls) || payload.max_model_calls < 1 || payload.max_model_calls > 9) throw new Error('PI_PROTOCOL');
  }
  if (!Array.isArray(payload.tools) || payload.tools.length > 4 || (!modelMode && (!Array.isArray(payload.batches) || payload.batches.length > 9)) ||
      !Number.isInteger(payload.rpc_timeout_ms) || payload.rpc_timeout_ms < 50 || payload.rpc_timeout_ms > 10000 ||
      !Number.isInteger(payload.run_timeout_ms) || payload.run_timeout_ms < 50 || payload.run_timeout_ms > 120000) throw new Error('PI_PROTOCOL');
  rpcTimeout = payload.rpc_timeout_ms;
  hardTimer = setTimeout(() => halt(3), payload.run_timeout_ms);
  const names = new Set();
  const tools = payload.tools.map(f => {
    exact(f, ['name','description','parameters']);
    if (!['market_quote','market_kline'].includes(f.name) || names.has(f.name) || typeof f.description !== 'string' ||
        !f.parameters || f.parameters.type !== 'object') throw new Error('PI_PROTOCOL');
    names.add(f.name);
    return {name: f.name, label: f.name, description: f.description, parameters: f.parameters, replay: 'never',
      executionMode: 'sequential', execute: async (id, _params, signal) => {
        if (signal?.aborted || !permit || permit.calls[permit.cursor]?.id !== id) throw new Error('PI_NOT_APPROVED');
        const ordinal = permit.cursor++;
        const result = await request('tool_request', {token: permit.token, ordinal, call_id: id, name: permit.calls[ordinal].name}, 'tool_result');
        exact(result, ['result']);
        if (signal?.aborted) throw new Error('PI_STOPPED');
        return {content: [{type: 'text', text: JSON.stringify(result.result)}], details: result.result, isError: result.result.ok !== true};
      }};
  });
  for (const batch of payload.batches || []) {
    if (!Array.isArray(batch) || !batch.length || batch.length > 16) throw new Error('PI_PROTOCOL');
    for (const c of batch) {
      exact(c, ['id','name','arguments']);
      if (typeof c.id !== 'string' || typeof c.name !== 'string' || typeof c.arguments !== 'string' || c.arguments.length > 8192) throw new Error('PI_PROTOCOL');
    }
  }
  let turn = 0, permit = null, currentBatch = [];
  const model = {id:'offline-fixture', name:'Deterministic fixture', api:'openai-completions', provider:'offline-fixture', baseUrl:'', reasoning:false, input:['text'], cost:{input:0,output:0,cacheRead:0,cacheWrite:0}, contextWindow:8192, maxTokens:2048};
  const mapping = new ModelMessages(model, payload.tools);
  agent = new Agent({initialState:{systemPrompt:modelMode ? payload.system : 'Offline fixture; Python owns all tool facts.', model, tools}, toolExecution:'sequential',
    streamFn: async (_model, context, options) => {
      stats.stream_calls++;
      const results = context.messages.filter(m => m.role === 'toolResult');
      stats.results_seen = results.length;
      if (modelMode) {
        const stream = new AssistantMessageEventStream();
        try {
          // The parent rejects the first over-budget request before invoking
          // its model, preserving the precise MODEL_CALL_LIMIT classification.
          if (stats.stream_calls > payload.max_model_calls + 1 || options.signal?.aborted) throw new Error('PI_MODEL_STOPPED');
          const response = await request('model_request', mapping.request(context, stats.stream_calls), 'model_response');
          if (options.signal?.aborted) throw new Error('PI_STOPPED');
          const converted = mapping.response(response);
          currentBatch = converted.batch;
          stream.push({type:'start',partial:converted.message});
          stream.push({type:'done',reason:converted.message.stopReason,message:converted.message});
        } catch {
          // The Python owner reports its precise ModelError. Never invent a
          // successful final response when the transport was aborted/failed.
          const message = {role:'assistant',content:[],api:model.api,provider:model.provider,model:model.id,timestamp:Date.now(),
            usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},
            stopReason:options.signal?.aborted?'aborted':'error',errorMessage:'PI_MODEL_FAILED'};
          stream.push({type:'error',reason:message.stopReason,error:message});
        }
        return stream;
      }
      currentBatch = payload.batches[turn++] || [];
      const content = currentBatch.length ? currentBatch.map(c => {
        // Preserve the raw argument string for Python admission, even if malformed.
        let args; try { args = parseStrict(c.arguments); } catch { args = {}; }
        return {type:'toolCall', id:c.id, name:c.name, arguments:args};
      }) : [{type:'text', text:'pi 离线假模型；Python 工具结果：' + results.map(m => m.content.filter(c => c.type === 'text').map(c => c.text).join('')).join('\n').slice(0,3700)}];
      const message = {role:'assistant', content, api:model.api, provider:model.provider, model:model.id,
        usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}, stopReason:currentBatch.length?'toolUse':'stop', timestamp:Date.now()};
      const stream = new AssistantMessageEventStream();
      stream.push({type:'start', partial:message});
      stream.push({type:'done', reason:message.stopReason, message});
      return stream;
    }});
  agent.subscribe(async (event, signal) => {
    if (event.type in stats && typeof stats[event.type] === 'number') {
      stats[event.type]++;
      send('observation', {event:event.type});
    }
    if (event.type === 'message_end' && event.message.role === 'assistant') {
      const calls = event.message.content.filter(c => c.type === 'toolCall');
      if (calls.length) {
        stats.assistant_batches++;
        send('observation', {event:'assistant_batches'});
        if (calls.length !== currentBatch.length || calls.some((c,i) => c.id !== currentBatch[i].id || c.name !== currentBatch[i].name)) throw new Error('PI_PROTOCOL');
        // Awaited message_end is BEFORE executeToolCalls in fixed pi 1.1.0.
        // tool_execution_start is merely an observation, never permission.
        const approval = await request('tool_batch', {calls:currentBatch}, 'batch_permit');
        exact(approval, ['token']);
        if (!ID.test(approval.token) || signal.aborted) throw new Error('PI_NOT_APPROVED');
        permit = {token:approval.token, calls:currentBatch, cursor:0};
      }
    }
  });
  await agent.prompt(modelMode ? payload.text : 'Execute the explicit offline fixture.');
  await agent.waitForIdle();
  if (closed) return;
  const final = agent.state.messages.filter(m => m.role === 'assistant').at(-1);
  const answer = final?.content.filter(c => c.type === 'text').map(c => c.text).join('') || '';
  send('engine_end', {ok:!agent.state.errorMessage && final?.stopReason === 'stop', answer, stats});
  clearTimeout(hardTimer);
}

function receive(line) {
  const m = channel.decode(line);
  if (m.type === 'start') {
    if (started) throw new Error('PI_PROTOCOL');
    started = true;
    run(m.payload).catch(() => { if (!closed) fatal(); });
  } else if (m.type === 'batch_permit' || m.type === 'tool_result' || m.type === 'model_response') {
    const p = pending.get(m.request_id);
    if (!p || p.response !== m.type) throw new Error('PI_PROTOCOL');
    pending.delete(m.request_id); clearTimeout(p.timer); p.resolve(m.payload);
  } else if (m.type === 'cancel' || m.type === 'shutdown') {
    exact(m.payload, []); send('stopped', {}); halt();
  } else throw new Error('PI_PROTOCOL');
}
let buffer = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  try {
    buffer = Buffer.concat([buffer, chunk]);
    let end;
    while ((end = buffer.indexOf(10)) >= 0) {
      if (end + 1 > MAX_FRAME) throw new Error('PI_PROTOCOL');
      const line = new TextDecoder('utf-8', {fatal:true}).decode(buffer.subarray(0,end));
      buffer = buffer.subarray(end + 1); receive(line);
      if (closed) break;
    }
    if (buffer.length > MAX_FRAME) throw new Error('PI_PROTOCOL');
  } catch { fatal(); }
});
process.stdin.on('end', () => halt(buffer.length ? 2 : 0));
process.stdin.on('error', fatal);
process.stdout.on('error', () => halt(2));
send('ready', {package:'@earendil-works/pi-agent-core', version:'1.1.0', agent:Agent.name, tool_execution:'sequential'});
