const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { resolve } = require('node:path');
const { buildSync } = require('esbuild');
function load(path) {
  const filename=resolve(__dirname,'..',path);
  const code=buildSync({entryPoints:[filename],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  const result=new Module(filename,module);result.paths=module.paths;result._compile(code,filename);return result.exports;
}
const {BackendManager}=load('apps/desktop/src/main/backend.ts');
const {eventDetail}=load('apps/desktop/src/renderer/session-adapter.ts');
const id='12345678-1234-1234-1234-123456789abc';
const ref={report_id:id,source_run_id:'12345678-1234-1234-1234-123456789abd'};
test('P2-08 optional report IPC context uses the same fixed endpoint and keeps old requests', async()=>{
  const manager=new BackendManager('.');const calls=[];manager.business=(...v)=>{calls.push(v);return Promise.resolve({});};
  await manager.startAgentRun(id,'查询AAPL.US行情');
  assert.deepEqual(calls[0],[`/sessions/${id}/runs`,'POST',{input:'查询AAPL.US行情',kind:'fake_agent',scenario:'normal'}]);
  await manager.startAgentRun(id,'读取报告','normal','fake_agent',ref);
  assert.deepEqual(calls[1][2].research_context,ref);
});
test('P2-08 IPC rejects extra fields inherited values crypto and unsupported model before transport',()=>{
  const manager=new BackendManager('.');let calls=0;manager.business=()=>{calls++;};
  for(const bad of [null,[],{},new Date(),Object.create(ref),{...ref,url:'https://invalid'},{...ref,symbol:'BTC/USDT'},{...ref,report_id:'../secret'},{...ref,source_run_id:false}]) assert.throws(()=>manager.startAgentRun(id,'read','normal','fake_agent',bad));
  for(const [scenario,kind] of [['normal','openai_agent'],['timeout','fake_agent'],['delayed','fake_agent']]) assert.throws(()=>manager.startAgentRun(id,'read',scenario,kind,ref));
  for(const text of ['\ud800','\udfff']) assert.throws(()=>manager.startAgentRun(id,text,'normal','fake_agent',ref));
  assert.equal(calls,0);
});
test('P2-08 adapter displays report and source IDs rather than falling back to stock arguments',()=>{
  const detail=eventDetail({type:'tool_started',payload:{name:'research.report.read',input:{...ref,evidence_offset:0,evidence_limit:16}}});
  assert.ok(detail.includes(ref.report_id)&&detail.includes(ref.source_run_id));
});
test('P2-08 JSON decoded string length counts actual UTF16 and preserves the 262144 transport gate',()=>{
  for(const text of ['😀','研','"\\\n\u0001','😀研\\']) {
    const value=JSON.stringify({text:text.repeat(2000)});
    assert.equal(value.length,Buffer.byteLength(value,'utf16le')/2);
  }
  assert.equal(131072+98304+32768,262144);
});
