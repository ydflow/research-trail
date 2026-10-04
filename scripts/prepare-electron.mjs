// Run in dependency preparation, where downloading a missing binary is allowed.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
const require = createRequire(new URL('../apps/desktop/package.json', import.meta.url));
if (process.argv.includes('--check')) {
  const directory = dirname(require.resolve('electron/package.json'));
  if (!existsSync(join(directory, 'path.txt')) || !existsSync(join(directory, 'dist/electron.exe'))) {
    throw new Error('Electron binary missing. Prepare it with bun run prepare:desktop before offline startup.');
  }
} else {
  const executable = require('electron');
  if (!existsSync(executable)) throw new Error('Electron preparation failed.');
}
console.log('Electron development binary is ready.');
