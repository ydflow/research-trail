import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync('uv', ['run', '--directory', 'services/backend', '--frozen', 'python', '-m', 'research_trail.export_openapi'], {
  cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' },
});
if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
const schema = JSON.parse(result.stdout);
const files = {
  'openapi.json': JSON.stringify(schema, null, 2) + '\n',
  'generated.ts': '/** Generated from Python OpenAPI by scripts/contracts.mjs. Do not edit. */\n' + astToString(await openapiTS(schema)),
};
const directory = new URL('../packages/contracts/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  const path = new URL(name, directory);
  if (process.argv.includes('--check')) {
    if (await readFile(path, 'utf8') !== content) throw new Error(`契约已变化：请运行 bun run contracts:generate（${name}）`);
  } else await writeFile(path, content);
}
console.log(process.argv.includes('--check') ? 'OpenAPI / TypeScript 契约一致。' : '已生成 OpenAPI / TypeScript 契约。');
