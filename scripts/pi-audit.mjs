// Offline complete installed Worker dependency graph, SPDX labels and license hashes.
import { readFileSync, readdirSync, existsSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('..',import.meta.url));
const manifest = join(root,'packages/pi-worker/package.json');
const snapshot = join(root,'packages/pi-worker/dependency-audit.json');
const lockText = readFileSync(join(root,'bun.lock'),'utf8');
const lock = JSON.parse(lockText.replace(/,\s*([}\]])/g,'$1'));
const graph = new Map();
function resolvePackage(name, from) {
  for(const base of createRequire(from).resolve.paths(name) || []) {
    const path = join(base,name,'package.json');
    if(existsSync(path)) return realpathSync(path);
  }
  throw new Error('Missing installed dependency: '+name);
}
function files(directory, prefix='') {
  const result=[];
  for(const item of readdirSync(directory,{withFileTypes:true})) {
    if(item.name==='node_modules' || item.isSymbolicLink()) continue;
    const sub=join(directory,item.name), name=(prefix?prefix+'/':'')+item.name;
    if(item.isDirectory()) result.push(...files(sub,name));
    else if(item.isFile()) result.push([name,sub]);
  }
  return result;
}
function visit(path) {
  const p=JSON.parse(readFileSync(path,'utf8')), id=p.name+'@'+p.version;
  if(graph.has(id))return id;
  const entry=Object.values(lock.packages).find(v=>v[0]===id);
  if(!entry || !entry.at(-1).startsWith('sha512-'))throw new Error('Unpinned dependency: '+id);
  const listing=files(dirname(path));
  const licenses=listing.filter(([name])=>/(^|\/)(licen[cs]e|copying|notice)(\.|$)/i.test(name)).map(([name,filename])=>({file:name,sha256:createHash('sha256').update(readFileSync(filename)).digest('hex')})).sort((a,b)=>a.file.localeCompare(b.file));
  const license=typeof p.license==='string'?p.license:p.license?.type;
  if(!license)throw new Error('Missing license metadata: '+id);
  const row={id,license,integrity:entry.at(-1),bytes:listing.reduce((n,[,path])=>n+statSync(path).size,0),licenses,dependencies:{},peers:{},optional_missing:[]};
  graph.set(id,row);
  for(const [name,range] of Object.entries({...p.dependencies,...p.optionalDependencies}).sort(([a],[b])=>a.localeCompare(b))) {
    let target;
    try {target=resolvePackage(name,path);} catch(error) {
      if(name in (p.optionalDependencies||{})) {row.optional_missing.push(name);continue;}
      throw error;
    }
    row.dependencies[name]={requested:range,resolved:visit(target)};
  }
  for(const [name,range] of Object.entries(p.peerDependencies||{}).sort(([a],[b])=>a.localeCompare(b))) {
    const optional=p.peerDependenciesMeta?.[name]?.optional===true;
    let target=null;
    try {target=resolvePackage(name,path);} catch(error) {if(!optional)throw error;}
    row.peers[name]={requested:range,optional,resolved:target?visit(target):null};
  }
  return id;
}
const p=JSON.parse(readFileSync(manifest,'utf8'));
if(p.dependencies['@earendil-works/pi-agent-core']!=='1.1.0'||p.dependencies['@earendil-works/pi-ai']!=='1.1.0')throw new Error('Worker versions must remain fixed');
const roots=Object.keys(p.dependencies).sort().map(name=>visit(resolvePackage(name,manifest)));
const coreManifest=resolvePackage('@earendil-works/pi-agent-core',manifest);
const core_sources={};
for(const name of ['agent','agent-loop','types']) {
  const map=JSON.parse(readFileSync(join(dirname(coreManifest),'dist',name+'.js.map'),'utf8'));
  core_sources[name+'.ts']=createHash('sha256').update(map.sourcesContent[0]).digest('hex');
}
const report={schema:1,source_commit:'abe508e1b89912adde45528136c3221eb69acdd7',core_sources,roots,packages:[...graph.values()].sort((a,b)=>a.id.localeCompare(b.id))};
if(process.argv.includes('--print'))console.log(JSON.stringify(report,null,2));
else {
  const expected=JSON.parse(readFileSync(snapshot,'utf8'));
  if(JSON.stringify(expected)!==JSON.stringify(report))throw new Error('Installed pi graph or licenses differ from recorded dependency-audit.json');
  const notices=JSON.parse(readFileSync(join(root,'packages/pi-worker/upstream-notices.json'),'utf8'));
  const covered=new Set();
  if(notices.schema!==1)throw new Error('Unknown supplemental notice schema');
  for(const row of notices.entries) {
    for(const id of row.packages) {
      if(!graph.has(id)||covered.has(id))throw new Error('Unknown or duplicate supplemental notice package');
      covered.add(id);
    }
    if(row.status==='collected') {
      if(!/^notices\/[a-z-]+-LICENSE\.txt$/.test(row.file)||createHash('sha256').update(readFileSync(join(root,'packages/pi-worker',row.file))).digest('hex')!==row.sha256)throw new Error('Supplemental notice bytes differ from upstream evidence');
    } else if(row.status!=='unresolved'||!row.reason)throw new Error('Missing notice disposition');
  }
  for(const row of report.packages) {
    if(!row.licenses.length&&!row.id.startsWith('@earendil-works/pi-')&&!covered.has(row.id))throw new Error('Unrecorded missing license file');
  }
  console.log(`pi supplemental notices: ${notices.entries.filter(r=>r.status==='collected').reduce((n,r)=>n+r.packages.length,0)} packages collected; ${notices.entries.filter(r=>r.status==='unresolved').flatMap(r=>r.packages).join(', ')} unresolved (installer distribution blocked).`);
  console.log(`pi offline dependency audit PASS: ${report.packages.length} locked packages, ${report.packages.reduce((n,p)=>n+p.bytes,0)} installed bytes (not installer size).`);
}
