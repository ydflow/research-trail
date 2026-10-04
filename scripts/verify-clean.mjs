import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, existsSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
if (process.platform !== 'win32') throw new Error('Clean desktop acceptance currently targets Windows.');
const listing = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (listing.error || listing.status !== 0) throw new Error('Cannot obtain the reviewable source manifest.');
const files = [...new Set(listing.stdout.split('\0').filter(Boolean))];
const directory = mkdtempSync(join(tmpdir(), 'research-trail-clean-'));
// A space in the path also checks CMD/Node/Python quoting.
const clean = join(directory, 'clean source');
mkdirSync(clean);
for (const name of files) {
  if (/(^|\/)(\.git|node_modules|\.venv|runtime|dist|logs|account-data|private-data)\//.test(name) || /\.(sqlite3?|db|log|png|jpe?g|pem|key)$/.test(name)) throw new Error('Unexpected non-source file in clean export.');
  const source = resolve(root, name), destination = resolve(clean, name);
  if (!source.startsWith(resolve(root) + sep) || !destination.startsWith(clean + sep) || !lstatSync(source).isFile()) throw new Error('Unsafe source export path.');
  mkdirSync(dirname(destination), { recursive: true }); copyFileSync(source, destination);
}
for (const name of ['.git', 'node_modules', 'services/backend/.venv', 'runtime', 'apps/desktop/dist']) {
  if (existsSync(resolve(clean, name))) throw new Error('Export was not clean.');
}
console.log(`[clean] Exported ${files.length} source files to ${clean}; no Git, dependencies, build or runtime data.`);
const env = { ...process.env };
const qa = env.RESEARCH_TRAIL_QA_DIR;
for (const name of Object.keys(env)) {
  if (/^(RESEARCH_TRAIL_|PYTHONPATH$|NODE_OPTIONS$|ELECTRON_(RUN_AS_NODE|OVERRIDE_DIST_PATH|INSTALL_PLATFORM|INSTALL_ARCH)$|UV_NO_SYNC$|UV_OFFLINE$)/i.test(name) || /KEY|TOKEN|SECRET|PASSWORD|AUTHORIZATION|CREDENTIAL/i.test(name)) delete env[name];
}
if (qa) env.RESEARCH_TRAIL_QA_DIR = resolve(qa);
function run(label, command, args, cwd = clean) {
  console.log(`\n[clean] ${label}`);
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${label} failed (${result.error?.message || result.status}). Temporary source retained: ${clean}`);
}
// Dependency preparation may download packages; it never copies installed modules/venv.
run('README: locked frontend installation (network allowed)', process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'bun install --frozen-lockfile']);
run('README: locked Python installation (network allowed)', 'uv', ['sync', '--project', 'services/backend', '--frozen']);
run('README: Electron binary preparation (network allowed)', process.execPath, ['scripts/prepare-electron.mjs']);
run('Same complete offline acceptance in clean source', process.execPath, ['scripts/verify.mjs']);
run('Actual root CMD development start and history smoke', process.execPath, ['tests/clean-start.cjs', clean]);
console.log(`[clean] PASS: installed, verified, opened root CMD window, recovered history and closed owned processes. Export retained outside the repository: ${clean}`);
