import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
if (process.platform !== 'win32' || Number(process.versions.node.split('.')[0]) < 24) {
  throw new Error('Current desktop acceptance requires Windows and Node.js 24+.');
}
const python = resolve(root, 'services/backend/.venv/Scripts/python.exe');
if (!existsSync(python) || !existsSync(resolve(root, 'node_modules'))) {
  throw new Error('Prepare dependencies using README.md first; verify does not download or install.');
}
const work = mkdtempSync(join(tmpdir(), 'research-trail-verify-'));
const env = { ...process.env };
const qa = env.RESEARCH_TRAIL_QA_DIR;
for (const name of Object.keys(env)) {
  if (/KEY|TOKEN|SECRET|PASSWORD|AUTHORIZATION|CREDENTIAL/i.test(name) ||
      /^(RESEARCH_TRAIL_|PYTHONPATH$|NODE_OPTIONS$|ELECTRON_(RUN_AS_NODE|OVERRIDE_DIST_PATH|INSTALL_PLATFORM|INSTALL_ARCH)$|.*PROXY$)/i.test(name)) delete env[name];
}
Object.assign(env, {
  RESEARCH_TRAIL_OFFLINE: '1', UV_OFFLINE: '1', UV_NO_SYNC: '1', UV_PYTHON_DOWNLOADS: 'never',
  PYTHONPATH: resolve(root, 'scripts/offline'), PYTHONUTF8: '1',
  NODE_OPTIONS: `--require "${resolve(root, 'scripts/offline/network.cjs').replaceAll('\\', '/')}"`,
  RESEARCH_TRAIL_DB_PATH: join(work, 'migration.sqlite3'),
});
if (qa) env.RESEARCH_TRAIL_QA_DIR = resolve(qa);
const require = createRequire(import.meta.url);
const desktopRequire = createRequire(resolve(root, 'apps/desktop/package.json'));
const electronDirectory = join(desktopRequire.resolve('electron/package.json'), '..');
if (!existsSync(join(electronDirectory, 'path.txt')) || !existsSync(join(electronDirectory, 'dist/electron.exe'))) {
  throw new Error('Electron binary missing: run bun run prepare:desktop in the preparation phase. Offline verification never downloads it.');
}
function run(label, command, args, cwd = root) {
  console.log(`\n[verify] ${label}`);
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${label} failed (${result.error?.message || result.status}).`);
}
run('Python version', python, ['-c', 'import sys; assert sys.version_info[:2] == (3, 12); print(sys.version)']);
run('OpenAPI / TypeScript consistency', process.execPath, ['scripts/contracts.mjs', '--check']);
run('Frontend type check', process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit'], resolve(root, 'apps/desktop'));
run('Python fixture / lifecycle / snapshot tests', python, ['-m', 'pytest', '-q'], resolve(root, 'services/backend'));
run('ResearchTrail original deterministic offline evaluation', python, ['-m', 'research_trail.verify_evaluations'], resolve(root, 'services/backend'));
run('ResearchTrail original deterministic historical observations', python, ['-m', 'research_trail.verify_outcomes'], resolve(root, 'services/backend'));
for (const operation of [['upgrade', 'head'], ['upgrade', 'head'], ['current'], ['check']]) {
  run(`Temporary database migration: ${operation.join(' ')}`, python, ['-m', 'alembic', ...operation], resolve(root, 'services/backend'));
}
run('Node offline / SSE / adapter / packaged launch / Markdown / notice tests', process.execPath, ['--test', 'tests/offline.test.cjs', 'tests/stream.test.cjs', 'tests/packaging.test.cjs', 'tests/markdown.test.cjs', 'tests/ui-notices.test.cjs']);
run('Electron main / preload build', process.execPath, ['scripts/build.mjs']);
run('Renderer build', process.execPath, [join(desktopRequire.resolve('vite/package.json'), '..', 'bin/vite.js'), 'build'], resolve(root, 'apps/desktop'));
run('Real Electron integration', process.execPath, ['--test', 'tests/desktop.test.cjs']);
console.log('\n[verify] PASS: fake model / fixture data only. No real provider calls.');
console.log(`[verify] Isolated migration data: ${work} (outside source control).`);
