const {test} = require('node:test');
const assert = require('node:assert/strict');
const {resolve,join} = require('node:path');
const {buildSync} = require('esbuild');
const Module = require('node:module');
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
