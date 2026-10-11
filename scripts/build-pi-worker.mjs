// Development build only. Real locked pi code is bundled, never reimplemented.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const directory=resolve(root,'packages/pi-worker/dist');
for(const name of ['pi-agent-core','pi-ai']) {
  const p=JSON.parse(readFileSync(resolve(root,`packages/pi-worker/node_modules/@earendil-works/${name}/package.json`),'utf8'));
  if(p.name!==`@earendil-works/${name}` || p.version!=='1.1.0')throw new Error('Fixed pi 1.1.0 required');
}
mkdirSync(directory,{recursive:true});
const result=await build({absWorkingDir:root,entryPoints:['packages/pi-worker/worker.mjs'],outfile:resolve(directory,'worker.mjs'),
  bundle:true,platform:'node',format:'esm',target:'node24',metafile:true,legalComments:'inline'});
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const inputs=Object.fromEntries(Object.keys(result.metafile.inputs).sort().map(path=>{
  const absolute=resolve(root,path);
  return [relative(root,absolute).replaceAll('\\','/'),hash(absolute)];
}));
writeFileSync(resolve(directory,'manifest.json'),JSON.stringify({version:1,core:'1.1.0',ai:'1.1.0',inputs,bundle:hash(resolve(directory,'worker.mjs'))})+'\n');
console.log(`pi development Worker: ${readFileSync(resolve(directory,'worker.mjs')).length} bytes; ${Object.keys(inputs).length} hashed inputs; no installer created.`);
