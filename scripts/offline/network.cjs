// Verification-only guard, inherited by Node and development Electron children.
// This is a regression tripwire, not an OS security sandbox.
const net = require('node:net');
const dns = require('node:dns');

function assertLocal(host = 'localhost') {
  if (host === 'localhost' || host === '::1' || host === '[::1]' || (net.isIP(host) === 4 && host.startsWith('127.'))) return;
  throw new Error('Offline verification forbids external network connections.');
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const values = Array.isArray(args[0]) ? args[0] : args;
  const options = values[0];
  // Local IPC/named pipes have no TCP port.
  if (typeof options === 'object' && options !== null) {
    if (options.port != null) assertLocal(options.host);
  } else if (typeof options === 'number' || /^\d+$/.test(String(options))) {
    assertLocal(typeof values[1] === 'string' ? values[1] : undefined);
  }
  return connect.apply(this, args);
};
const lookup = dns.lookup;
dns.lookup = function (host, ...args) { assertLocal(host); return lookup.call(this, host, ...args); };
const promiseLookup = dns.promises.lookup;
dns.promises.lookup = async function (host, ...args) { assertLocal(host); return promiseLookup.call(this, host, ...args); };
// Explicit DNS/UDP calls are not needed by any offline fixture test.
for (const name of Object.keys(dns)) {
  if (name.startsWith('resolve') || name === 'reverse') dns[name] = () => { throw new Error('Offline verification forbids DNS queries.'); };
}
for (const name of Object.keys(dns.promises)) {
  if (name.startsWith('resolve') || name === 'reverse') dns.promises[name] = async () => { throw new Error('Offline verification forbids DNS queries.'); };
}
require('node:dgram').createSocket = () => { throw new Error('Offline verification forbids UDP sockets.'); };
globalThis[Symbol.for('research-trail.offline')] = true;
module.exports = { assertLocal };
