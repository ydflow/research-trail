import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Agent } from '@earendil-works/pi-agent-core';
import { AssistantMessageEventStream } from '@earendil-works/pi-ai';
import { Channel, MAX_FRAME, parseStrict } from './protocol.mjs';

test('fixed real Agent awaits complete assistant batch before sequential execution', async () => {
  const log = [];
  let release, entered, turn = 0;
  const gate = new Promise(r => { release = r; });
  const waiting = new Promise(r => { entered = r; });
  const model = {id:'fixture',name:'fixture',api:'openai-completions',provider:'offline',baseUrl:'',input:['text'],reasoning:false,contextWindow:1000,maxTokens:100,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}};
  const agent = new Agent({initialState:{model,tools:[{name:'read',label:'read',description:'read only fixture',parameters:{type:'object',properties:{},additionalProperties:false},execute:async id => { log.push(id); return {content:[{type:'text',text:id}],details:null}; }}]},toolExecution:'sequential',
    streamFn:() => {
      const message = {role:'assistant',api:model.api,provider:model.provider,model:model.id,timestamp:Date.now(),usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},
        stopReason:turn++ === 0?'toolUse':'stop',content:[]};
      message.content = message.stopReason === 'toolUse' ? ['first','second'].map(id=>({type:'toolCall',id,name:'read',arguments:{}})) : [{type:'text',text:'done'}];
      const s = new AssistantMessageEventStream(); s.push({type:'done',reason:message.stopReason,message}); return s;
    }});
  agent.subscribe(async e => {
    if(e.type==='message_end' && e.message.role==='assistant' && e.message.stopReason==='toolUse') {
      assert.equal(e.message.content.length,2); entered(); await gate; log.push('approved');
    }
    if(e.type==='tool_execution_start') log.push('start');
  });
  const done = agent.prompt('fixture');
  await waiting;
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(log,[]);
  release(); await done; await agent.waitForIdle();
  assert.deepEqual(log,['approved','start','first','start','second']);
});

for (const raw of ['{"a":1,"a":2}','{"a":{"b":0,"b":1}}','{"a":1,"\\u0061":2}','not-json','{"a":NaN}','{"a":1e999}','['.repeat(34)+'0'+']'.repeat(34)]) {
  test('strict JSON rejects '+raw.slice(0,40),()=>assert.throws(()=>parseStrict(raw)));
}
test('channel bounds, identity and sequence',()=>{
  const c = new Channel('run','attempt');
  const line = c.encode('ready','id',{});
  assert.equal(c.decode(line).sequence,1);
  assert.throws(()=>c.decode(line));
  assert.throws(()=>new Channel('other','attempt').decode(line));
  assert.throws(()=>new Channel('run','other').decode(line));
  assert.throws(()=>c.decode(' '.repeat(MAX_FRAME+1)));
  c.output=256; assert.throws(()=>c.encode('ready','id2',{}));
});

const path = fileURLToPath(new URL('./worker.mjs',import.meta.url));
const guard = fileURLToPath(new URL('../../scripts/offline/network.cjs',import.meta.url));
for (const mode of ['unknown','json','oversize','wrong_run','duplicate','late_response','invalid_utf8']) {
  test('real Worker rejects hostile input: '+mode,async()=>{
    const p = spawn(process.execPath,['--require',guard,path,'run','attempt'],{windowsHide:true,env:{SystemRoot:process.env.SystemRoot},stdio:['pipe','pipe','pipe']});
    let output='',err='';
    p.stderr.on('data',c=>{err+=c;});
    const ready=new Promise(resolve=>p.stdout.on('data',c=>{output+=c; if(output.includes('\n'))resolve();}));
    const exit=new Promise(resolve=>p.on('exit',code=>resolve(code)));
    const timer=setTimeout(()=>p.kill(),3000);
    try {
      await ready;
      const m={version:1,request_id:'input',run_id:'run',attempt_id:'attempt',sequence:1,type:'unknown',payload:{}};
      let raw;
      if(mode==='json')raw='{"private":"SENTINEL",bad}\n';
      else if(mode==='oversize')raw='x'.repeat(MAX_FRAME+1);
      else if(mode==='invalid_utf8')raw=Buffer.from([0xff,10]);
      else {
        if(mode==='wrong_run')m.run_id='wrong';
        if(mode==='late_response')m.type='tool_result';
        if(mode==='duplicate') {m.type='start';m.payload={tools:[],batches:[],rpc_timeout_ms:500,run_timeout_ms:1000};}
        raw=JSON.stringify(m)+'\n';if(mode==='duplicate')raw+=raw;
      }
      p.stdin.on('error',()=>{});p.stdin.write(raw);
      assert.equal(await exit,2);
      assert(!output.includes('SENTINEL')&&!err.includes('SENTINEL'));
      const messages=output.trim().split('\n').map(JSON.parse);
      assert.equal(messages[0].payload.agent,'Agent');
      assert(!messages.some(m=>m.type==='tool_request'));
    } finally {clearTimeout(timer); if(p.exitCode===null)p.kill();}
  });
}
