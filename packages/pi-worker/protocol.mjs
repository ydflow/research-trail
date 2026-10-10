// Private transport, deliberately unrelated to persisted SSE sequence numbers.
export const VERSION = 1;
export const MAX_FRAME = 131072;
export const MAX_MESSAGES = 256;
export const ID = /^[A-Za-z0-9_-]{1,128}$/;
export function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error('PI_PROTOCOL');
}

// JSON.parse accepts duplicate keys. Walk JSON tokens first, with a depth bound.
export function parseStrict(text) {
  const tokens = text.match(/"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]|\s+|./g) || [];
  const input = tokens.filter(t => !/^\s+$/.test(t));
  let i = 0;
  function value(depth) {
    if (depth > 32) throw new Error('PI_PROTOCOL');
    const t = input[i++];
    if (t === '{') {
      const keys = new Set();
      if (input[i] === '}') { i++; return; }
      do {
        const key = JSON.parse(input[i++]);
        if (typeof key !== 'string' || keys.has(key) || input[i++] !== ':') throw new Error('PI_PROTOCOL');
        keys.add(key); value(depth + 1);
        if (input[i] !== ',') break;
        i++;
      } while (true);
      if (input[i++] !== '}') throw new Error('PI_PROTOCOL');
    } else if (t === '[') {
      if (input[i] === ']') { i++; return; }
      do { value(depth + 1); if (input[i] !== ',') break; i++; } while (true);
      if (input[i++] !== ']') throw new Error('PI_PROTOCOL');
    } else {
      if (t === undefined || !/^(?:"|-?\d|true$|false$|null$)/.test(t)) throw new Error('PI_PROTOCOL');
      if (/^-?\d/.test(t) && !Number.isFinite(Number(t))) throw new Error('PI_PROTOCOL');
    }
  }
  value(0);
  if (i !== input.length) throw new Error('PI_PROTOCOL');
  return JSON.parse(text);
}

export class Channel {
  constructor(runId, attemptId) { this.runId = runId; this.attemptId = attemptId; this.input = 0; this.output = 0; this.seen = new Set(); }
  decode(line) {
    if (Buffer.byteLength(line) > MAX_FRAME) throw new Error('PI_PROTOCOL');
    const m = parseStrict(line);
    exact(m, ['version','request_id','run_id','attempt_id','sequence','type','payload']);
    if (m.version !== VERSION || m.run_id !== this.runId || m.attempt_id !== this.attemptId ||
        !ID.test(m.request_id) || typeof m.request_id !== 'string' || typeof m.type !== 'string' ||
        m.sequence !== this.input + 1 || m.sequence > MAX_MESSAGES || this.seen.has(m.request_id) ||
        !m.payload || typeof m.payload !== 'object' || Array.isArray(m.payload)) throw new Error('PI_PROTOCOL');
    this.input++; this.seen.add(m.request_id); return m;
  }
  encode(type, requestId, payload) {
    const m = {version: VERSION, request_id: requestId, run_id: this.runId, attempt_id: this.attemptId, sequence: ++this.output, type, payload};
    const line = JSON.stringify(m) + '\n';
    if (this.output > MAX_MESSAGES || Buffer.byteLength(line) > MAX_FRAME) throw new Error('PI_PROTOCOL');
    return line;
  }
}
