// Read-only delivery audit; never reads user databases or the credential vault.
import { spawnSync } from 'node:child_process';
import { readFileSync, lstatSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { auditNative } from './native-audit.mjs';
import { sameAuthoredNotice } from './authored-notice.mjs';
import { auditPublicAssets } from './public-assets.mjs';
const root=resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const listing=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8',windowsHide:true});
if(listing.status!==0)throw new Error('Cannot enumerate reviewable source');
const files=[...new Set(listing.stdout.split('\0').filter(Boolean))];
const publicAssets=auditPublicAssets(root);
const forbidden=/(^|\/)(runtime|node_modules|\.venv|private-data|account-data|logs|release|build)(\/|$)|\.(sqlite3?|db|csv|log|png|jpe?g|pem|key)$/i;
for(const name of files){
  if(forbidden.test(name) && !publicAssets.has(name))throw new Error(`Private/generated source candidate: ${name}`);
  const path=resolve(root,name);
  if(!path.startsWith(root+sep) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())throw new Error('Unsafe source candidate');
  if(publicAssets.has(name))continue; // Reviewed bytes, dimensions and exact path validated above.
  const text=new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(path));
  if(/sk-[A-Za-z0-9]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|hk_m_[A-Za-z0-9_.-]{80,}|hk_[a-f0-9]{32}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw new Error(`Review possible secret signature in ${name}`);
}
const probes=['.env','runtime/private.sqlite3','logs/private.log','account-data/private.json','private-data/private.png','release/installer.exe','build/private.txt','services/backend/.venv/private.txt'];
const ignored=spawnSync('git',['check-ignore','--stdin'],{cwd:root,input:probes.join('\n')+'\n',encoding:'utf8',windowsHide:true});
if(ignored.stdout.trim().split(/\r?\n/).length!==probes.length)throw new Error('Sensitive files are not all ignored');
const sources=JSON.parse(readFileSync(join(root,'docs/SOURCES-step14.json'),'utf8')).files;
for(const entry of sources)if(sha(readFileSync(join(root,entry.path)))!==entry.sha256)throw new Error('Original skill/license changed');
if(process.argv.includes('--source-only')) {
  console.log(JSON.stringify({source_files:files.length,public_assets:publicAssets.size,original_skill_license_files:sources.length,ignore_probes:probes.length,native:auditNative(root)},null,2));
  process.exit(0);
}
const out=resolve(root,process.argv[2]??'release/windows-internal');
if(!out.startsWith(join(root,'release')+sep))throw new Error('Bundle must stay under project release directory');
const manifest=JSON.parse(readFileSync(join(out,'bundle-manifest.json'),'utf8'));
if(sha(readFileSync(join(out,manifest.installer)))!==manifest.sha256)throw new Error('Installer SHA mismatch');
const bundle=join(out,'win-unpacked');
const native=auditNative(root,join(bundle,'resources/backend/_internal'));
for(const f of manifest.files.filter(f=>f.path.startsWith('resources/notices/third-party/longbridge/native/'))) {
  const original=join(root,'docs',f.path.slice('resources/notices/'.length));
  if(sha(readFileSync(original))!==f.sha256)throw new Error('Bundled native notice differs from reviewed source');
}
for(const entry of manifest.files){
  if(entry.path!=='resources/backend/_internal/certifi/cacert.pem' && forbidden.test(entry.path))throw new Error('Unexpected private/generated payload');
  if(sha(readFileSync(join(bundle,entry.path)))!==entry.sha256)throw new Error('Bundle file differs from manifest');
}
if(sha(readFileSync(join(bundle,'resources/backend/_internal/certifi/cacert.pem')))!==sha(readFileSync(join(root,'services/backend/.venv/Lib/site-packages/certifi/cacert.pem'))))throw new Error('Public TLS CA does not match locked certifi installation');
for(const entry of sources)if(sha(readFileSync(join(bundle,'resources',entry.path)))!==entry.sha256)throw new Error('Bundled original skill/license changed');
const hashFiles=['evaluation.py','evaluation_contracts.py','evaluation_engine.py','evaluation_cases.py','evaluation_trace.py','agent.py','tools.py','market.py','model_provider.py','store.py'];
for(const file of hashFiles){
  if(sha(readFileSync(join(root,'services/backend/research_trail',file)))!==sha(readFileSync(join(bundle,'resources/backend/_internal/research_trail',file))))throw new Error('Experiment hash source is not the delivered source');
}
// These three files are ResearchTrail-authored prose, not upstream originals.
for(const file of ['BUNDLE-NOTICE.md','WINDOWS-INSTALL.md','third-party/longbridge/NOTICE']){
  if(!sameAuthoredNotice(readFileSync(join(root,'docs',file)),readFileSync(join(bundle,'resources/notices',file))))throw new Error('Bundled notice is stale');
}
const source24=readFileSync(join(root,'docs/SOURCES-step24.json'));
if(sha(source24)!==sha(readFileSync(join(bundle,'resources/notices/sources/SOURCES-step24.json'))))throw new Error('Missing current source record');
for(const path of ['third-party/longbridge/LICENSE-MIT','third-party/longbridge/LICENSE-APACHE',
  'third-party/klinecharts/LICENSE','third-party/klinecharts/LICENSE-lightweight-charts','third-party/klinecharts/NOTICE']){
  if(sha(readFileSync(join(root,'docs',path)))!==sha(readFileSync(join(bundle,'resources/notices',path))))throw new Error('Dependency notice changed');
}
const python=JSON.parse(readFileSync(join(bundle,'resources/notices/python-dependencies.json'),'utf8'));
const receipt={source_files:files.length,bundle_files:manifest.files.length,original_skill_license_files:sources.length,
  public_assets:publicAssets.size,
  authored_notice_eol_normalized:3,
  native,
  hash_source_files:hashFiles.length,ignore_probes:probes.length,installer:manifest.installer,sha256:manifest.sha256,
  runtime_python_dependencies:python.filter(p=>p.role==='runtime').length,
  missing_wheel_license_files:python.filter(p=>p.role==='runtime' && !p.license_files.length).map(p=>p.name),
  audit:'UTF-8, secret signatures and private-file exclusion; does not prove whole-source licensing or absence of every possible secret'};
writeFileSync(join(out,'delivery-audit.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
