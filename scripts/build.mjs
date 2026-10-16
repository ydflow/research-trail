import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { sourceIdentity, fileInventory, validateAppFiles } from './package-policy.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const identity=sourceIdentity(root,{allowUnversioned:true});
const bundles=await Promise.all([
  build({ entryPoints: [resolve(root, 'apps/desktop/src/main/index.ts')], outfile: resolve(root, 'apps/desktop/dist/main.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron'], metafile:true }),
  build({ entryPoints: [resolve(root, 'apps/desktop/src/preload/index.ts')], outfile: resolve(root, 'apps/desktop/dist/preload.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron'], metafile:true }),
]);
const desktopRequire=createRequire(resolve(root,'apps/desktop/package.json'));
const renderer=spawnSync(process.execPath,[resolve(desktopRequire.resolve('vite/package.json'),'../bin/vite.js'),'build'],{
  cwd:resolve(root,'apps/desktop'),env:process.env,stdio:'inherit',windowsHide:true,
});
if (renderer.status !== 0) throw new Error('Renderer build failed');
if (JSON.stringify(identity) !== JSON.stringify(sourceIdentity(root,{allowUnversioned:true}))) throw new Error('Source changed during Electron build');
const files=fileInventory(resolve(root,'apps/desktop/dist'));
validateAppFiles(files);
mkdirSync(resolve(root,'build/windows'),{recursive:true});
const node_inputs=bundles.flatMap(b=>Object.keys(b.metafile.inputs)).sort();
if(node_inputs.some(p=>/pi-worker|pi-agent-core|pi-ai|proxy-agent-negotiate/.test(p))) throw new Error('Pi dependency in production Node bundle');
writeFileSync(resolve(root,'build/windows/desktop-source.json'),JSON.stringify({...identity,node_inputs,files},null,2)+'\n');
