const {test} = require('node:test');
const assert = require('node:assert/strict');
const {resolve,join} = require('node:path');
const {buildSync} = require('esbuild');
const Module = require('node:module');

test('all reviewed stable versions reject dirty or mismatched Python and Electron sources',async()=>{
  const {validateRelease,sourceIdentity}=await import('../scripts/package-policy.mjs');
  const clean={source_commit:'a'.repeat(40),source_tree:'b'.repeat(40),source_dirty:false};
  for(const version of ['1.0.0','1.1.0','1.1.0-rc.1','1.1.0-rc-internal.fixture']) {
    validateRelease(version,clean,clean,clean);
    assert.throws(()=>validateRelease(version,{...clean,source_dirty:true},clean,clean),/clean committed/);
    for(const bad of [{...clean,source_dirty:true},{...clean,source_dirty:undefined},{...clean,source_commit:'c'.repeat(40)},{...clean,source_tree:'d'.repeat(40)}]) {
      assert.throws(()=>validateRelease(version,clean,bad,clean),/Python and Electron/);
      assert.throws(()=>validateRelease(version,clean,clean,bad),/Python and Electron/);
    }
    assert.throws(()=>validateRelease(version,clean,clean),/Python and Electron/);
  }
  for(const invalid of ['../../1.1.0','2.0.0','1.1.0/escape']) assert.throws(()=>validateRelease(invalid,clean,clean,clean),/reviewed/);
  const exported=require('node:fs').mkdtempSync(join(require('node:os').tmpdir(),'research-trail-unversioned-'));
  assert.throws(()=>sourceIdentity(exported),/identify build source/);
  const unversioned=sourceIdentity(exported,{allowUnversioned:true});
  assert.deepEqual(unversioned,{source_commit:null,source_tree:null,source_dirty:true});
  assert.throws(()=>validateRelease('1.1.0',unversioned,unversioned,unversioned),/clean committed/);
  assert.throws(()=>validateRelease('1.1.0',{...unversioned,source_dirty:false},clean,clean),/clean committed/);
});

test('desktop payload permits compiled app only and rejects Pi, maps and private files',async()=>{
  const {validateAppFiles}=await import('../scripts/package-policy.mjs');
  const app=['main.cjs','preload.cjs','renderer/index.html','renderer/assets/app.js','renderer/assets/app.css','renderer/brand/research-trail.png'].map(path=>({path}));
  validateAppFiles(app);
  for(const path of ['pi-worker/index.mjs','node_modules/proxy-agent-negotiate/index.js','renderer/assets/app.js.map','runtime/user.sqlite3','.env','renderer/private.png']) assert.throws(()=>validateAppFiles([...app,{path}]),/payload|Experimental/);
  assert.throws(()=>validateAppFiles(app.slice(1)),/Missing/);
});

test('actual ASAR inventory detects unlisted experimental files and changed compiled bytes',async()=>{
  const {auditAppArchive}=await import('../scripts/package-archive.mjs');
  const {fileInventory}=await import('../scripts/package-policy.mjs');
  const {mkdtempSync,mkdirSync,writeFileSync,unlinkSync}=require('node:fs');
  const {createRequire}=require('node:module');
  const builder=createRequire(require.resolve('electron-builder'));
  const asar=createRequire(builder.resolve('app-builder-lib'))('@electron/asar');
  const directory=mkdtempSync(join(require('node:os').tmpdir(),'research-trail-asar-test-'));
  const stage=join(directory,'app');mkdirSync(join(stage,'dist/renderer'),{recursive:true});
  for(const name of ['main.cjs','preload.cjs','renderer/index.html']) writeFileSync(join(stage,'dist',name),'original compiled fixture');
  writeFileSync(join(stage,'package.json'),JSON.stringify({main:'dist/main.cjs'}));
  const desktop={files:fileInventory(join(stage,'dist'))};
  const good=join(directory,'good.asar');await asar.createPackage(stage,good);
  assert.equal(auditAppArchive(good,desktop).files.length,4);
  writeFileSync(join(stage,'dist/pi-worker.mjs'),'experimental fixture');
  const extra=join(directory,'extra.asar');await asar.createPackage(stage,extra);
  assert.throws(()=>auditAppArchive(extra,desktop),/payload/);
  unlinkSync(join(stage,'dist/pi-worker.mjs'));
  writeFileSync(join(stage,'dist/main.cjs'),'changed bytes');
  const changed=join(directory,'changed.asar');await asar.createPackage(stage,changed);
  assert.throws(()=>auditAppArchive(changed,desktop),/differs/);
});
test('authored notices tolerate CRLF checkout only and reject content changes',async()=>{
  const {sameAuthoredNotice}=await import('../scripts/authored-notice.mjs');
  const original=Buffer.from('研迹说明\n保留来源。\n');
  assert.equal(sameAuthoredNotice(original,Buffer.from('研迹说明\r\n保留来源。\n')),true);
  for(const changed of ['研迹说明\n删除来源。\n','研迹说明\n保留来源。 \n','研迹说明\r保留来源。\n','\ufeff研迹说明\n保留来源。\n']) {
    assert.equal(sameAuthoredNotice(original,Buffer.from(changed)),false);
  }
  assert.throws(()=>sameAuthoredNotice(original,Buffer.from([0xff])),TypeError);
});

test('installed launch cannot inherit developer fixture, proxy or secret overrides',()=>{
  const compiled=buildSync({entryPoints:[resolve(__dirname,'../apps/desktop/src/main/packaged-launch.ts')],bundle:true,write:false,platform:'node',format:'cjs'});
  const mod=new Module('packaged-launch');mod._compile(compiled.outputFiles[0].text,'packaged-launch.cjs');
  const result=mod.exports.packagedLaunch('C:/installed/resources','C:/Users/test/data',{
    SystemRoot:'C:/Windows',PATH:'C:/Windows/System32',RESEARCH_TRAIL_DB_PATH:'C:/repo/runtime/private.sqlite3',
    RESEARCH_TRAIL_PYTHON:'C:/dev/python.exe',RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'outcome-history',
    OPENAI_API_KEY:'synthetic-test-only',HTTPS_PROXY:'http://invalid',PYTHONPATH:'C:/dev'});
  assert.equal(result.executable,join('C:/installed/resources','backend','research-trail-backend.exe'));
  assert.equal(result.cwd,'C:/Users/test/data');
  assert.deepEqual(result.env,{SystemRoot:'C:/Windows',PATH:'C:/Windows/System32',RESEARCH_TRAIL_DB_PATH:join('C:/Users/test/data','data','research-trail.sqlite3')});
});

test('public asset audit verifies exact reviewed files and refuses private screenshot paths',async()=>{
  const {auditPublicAssets,validatePublicAsset}=await import('../scripts/public-assets.mjs');
  const {readFileSync}=require('node:fs');
  const root=resolve(__dirname,'..'), manifest=JSON.parse(readFileSync(join(root,'docs/PUBLIC-ASSETS.json'),'utf8'));
  assert.equal(auditPublicAssets(root).size,10);
  const entry=manifest.assets.find(v=>v.path==='docs/assets/features/workbench.png'),bytes=readFileSync(join(root,entry.path));
  for(const path of ['private-data/private.png','docs/assets/features/user-account.png','docs/assets/features/../private.png']){
    assert.throws(()=>validatePublicAsset({...entry,path},bytes),/Unapproved public asset path/);
  }
  assert.throws(()=>validatePublicAsset({...entry,origin:'personal-screenshot'},bytes),/provenance/);
});

test('public image bytes and dimensions cannot silently diverge from the reviewed manifest',async()=>{
  const {validatePublicAsset}=await import('../scripts/public-assets.mjs');
  const {readFileSync}=require('node:fs');
  const root=resolve(__dirname,'..'), manifest=JSON.parse(readFileSync(join(root,'docs/PUBLIC-ASSETS.json'),'utf8'));
  const entry=manifest.assets.find(v=>v.path==='docs/assets/features/workbench.png'),bytes=readFileSync(join(root,entry.path));
  const changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  assert.throws(()=>validatePublicAsset(entry,changed),/SHA256/);
  assert.throws(()=>validatePublicAsset({...entry,width:entry.width+1},bytes),/dimensions/);
});

test('Windows icon frames reject out-of-range offsets even when their hash is updated',async()=>{
  const {validatePublicAsset}=await import('../scripts/public-assets.mjs');
  const {readFileSync}=require('node:fs'),{createHash}=require('node:crypto');
  const root=resolve(__dirname,'..'), manifest=JSON.parse(readFileSync(join(root,'docs/PUBLIC-ASSETS.json'),'utf8'));
  const entry=manifest.assets.find(v=>v.path.endsWith('.ico')),bytes=Buffer.from(readFileSync(join(root,entry.path)));
  bytes.writeUInt32LE(bytes.length+1,18);
  const altered={...entry,sha256:createHash('sha256').update(bytes).digest('hex')};
  assert.throws(()=>validatePublicAsset(altered,bytes),/ICO frame/);
});
