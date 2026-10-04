const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const dns = require('node:dns');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
require('../scripts/offline/network.cjs');

test('offline guard rejects external TCP and DNS before connection', async () => {
  for (const options of [{ host: '203.0.113.1', port: 443 }, { host: 'api.openai.com', port: 443 }, { host: '127.999.0.1', port: 443 }]) {
    const socket = new net.Socket();
    try { assert.throws(() => socket.connect(options), /Offline verification/); }
    finally { socket.destroy(); }
  }
  assert.throws(() => dns.lookup('api.openai.com', () => {}), /Offline verification/);
  await assert.rejects(dns.promises.lookup('api.openai.com'), /Offline verification/);
});

test('offline guard allows a real loopback TCP exchange', async () => {
  const server = net.createServer((socket) => socket.end('local fixture'));
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  try {
    const text = await new Promise((done, reject) => {
      const socket = net.connect(server.address().port, '127.0.0.1'); let data = '';
      socket.on('error', reject); socket.on('data', (chunk) => { data += chunk; }); socket.on('end', () => done(data));
    });
    assert.equal(text, 'local fixture');
  } finally { await new Promise((done) => server.close(done)); }
});

test('offline Node guard is inherited by child processes', () => {
  const guard = resolve(__dirname, '../scripts/offline/network.cjs').replaceAll('\\', '/');
  const result = spawnSync(process.execPath, ['-e', `if (!globalThis[Symbol.for('research-trail.offline')]) process.exit(2); try { require('node:net').connect(443, '203.0.113.1'); process.exit(3); } catch (e) { if (!e.message.includes('Offline verification')) process.exit(4); }`],
    { env: { ...process.env, NODE_OPTIONS: `--require "${guard}"` }, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
});
