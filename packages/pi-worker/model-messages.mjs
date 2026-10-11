// Restricted text-only Chat Completions <-> fixed pi 1.1.0 transcript mapping.
// Provider configuration, headers, credentials and arbitrary metadata have no fields.
import { exact, parseStrict } from './protocol.mjs';

export const MAX_MODEL_BYTES = 96 * 1024;
export function bound(value) {
  const raw = JSON.stringify(value);
  if (Buffer.byteLength(raw) > MAX_MODEL_BYTES) throw new Error('PI_MODEL_LIMIT');
  parseStrict(raw);
}
function text(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.some(c => c.type !== 'text' || typeof c.text !== 'string')) throw new Error('PI_MODEL_MESSAGE');
  return content.map(c => c.text).join('');
}
export class ModelMessages {
  #originals = new WeakMap();
  constructor(model, tools) { this.model = model; this.tools = tools; }
  request(context, index) {
    if (!Array.isArray(context.messages) || context.messages.length > 27) throw new Error('PI_MODEL_MESSAGE');
    const messages = context.messages.map((m, i) => {
      if (m.role === 'system') {
        if (i !== 0 || m.sections || m.toolsRemoved || JSON.stringify(m.toolsAdded || []) !== JSON.stringify(this.tools)) throw new Error('PI_MODEL_TOOLS');
        return {role:'system',content:text(m.content)};
      }
      if (m.role === 'user') return {role:'user',content:text(m.content)};
      if (m.role === 'toolResult') return {role:'tool',tool_call_id:m.toolCallId,content:text(m.content)};
      if (m.role === 'assistant') {
        const original = this.#originals.get(m);
        if (!original) throw new Error('PI_MODEL_MESSAGE');
        // Only messages created by our response converter may be sent back.
        return structuredClone(original);
      }
      throw new Error('PI_MODEL_MESSAGE');
    });
    const tools = this.tools.map(functionDefinition => ({type:'function',function:{...functionDefinition,strict:true}}));
    const payload = {messages,tools,call_index:index};
    bound(payload); return payload;
  }
  response(payload) {
    exact(payload, ['message']); bound(payload);
    const m = payload.message;
    exact(m, ['role','content','tool_calls']);
    if (m.role !== 'assistant' || (m.content !== null && typeof m.content !== 'string') || !Array.isArray(m.tool_calls) || m.tool_calls.length > 16 ||
        (m.content !== null && [...m.content].length > 4000) || (!m.tool_calls.length && !m.content?.trim())) throw new Error('PI_MODEL_MESSAGE');
    const batch = m.tool_calls.map(c => {
      exact(c, ['id','type','function']); exact(c.function, ['name','arguments']);
      if (c.type !== 'function' || typeof c.id !== 'string' || typeof c.function.name !== 'string' || typeof c.function.arguments !== 'string') throw new Error('PI_MODEL_MESSAGE');
      return {id:c.id,name:c.function.name,arguments:c.function.arguments};
    });
    const content = m.content ? [{type:'text',text:m.content}] : [];
    for (const c of batch) {
      // Malformed/duplicate raw JSON is never approved on the Node side.
      // Python receives these exact raw strings at the awaited batch barrier.
      let args; try { args = parseStrict(c.arguments); } catch { args = {}; }
      content.push({type:'toolCall',id:c.id,name:c.name,arguments:args});
    }
    const message = {role:'assistant',content,api:this.model.api,provider:this.model.provider,model:this.model.id,
      // No actual token/cost information was supplied by Python complete.
      usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},
      stopReason:batch.length?'toolUse':'stop',timestamp:Date.now()};
    this.#originals.set(message, structuredClone(m));
    return {message,batch};
  }
}
