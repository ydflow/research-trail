import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
await Promise.all([
  build({ entryPoints: [resolve(root, 'apps/desktop/src/main/index.ts')], outfile: resolve(root, 'apps/desktop/dist/main.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron'] }),
  build({ entryPoints: [resolve(root, 'apps/desktop/src/preload/index.ts')], outfile: resolve(root, 'apps/desktop/dist/preload.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron'] }),
]);
