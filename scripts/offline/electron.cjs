// -r executes after Electron's built-in module loader exists; NODE_OPTIONS is
// too early for require('electron') and Playwright removes NODE_OPTIONS anyway.
const { assertLocal } = require('./network.cjs');
const { app, session } = require('electron');
if (process.env.RESEARCH_TRAIL_QA_CDP_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.RESEARCH_TRAIL_QA_CDP_PORT);
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
}
const protectedSessions = new WeakSet();
function protect(target) {
  if (protectedSessions.has(target)) return;
  protectedSessions.add(target);
  target.webRequest.onBeforeRequest((details, done) => {
    try {
      const url = new URL(details.url);
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) assertLocal(url.hostname);
      else if (!['file:', 'data:', 'devtools:', 'chrome-devtools:', 'about:'].includes(url.protocol)) throw new Error('Unsupported offline URL.');
      done({ cancel: false });
    } catch { done({ cancel: true }); }
  });
}
// The app uses an isolated partition per instance, not the default session.
app.on('web-contents-created', (_event, contents) => protect(contents.session));
app.whenReady().then(() => protect(session.defaultSession));
