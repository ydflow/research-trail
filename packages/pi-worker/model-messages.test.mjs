import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ModelMessages } from './model-messages.mjs';
import { Channel } from './protocol.mjs';

const model={api:'openai-completions',provider:'offline',id:'fixture'};
const tools=[{name:'market_quote',description:'read only',parameters:{type:'object',properties:{symbol:{type:'string'}},required:['symbol'],additionalProperties:false}}];
const chat={role:'assistant',content:'先查询',tool_calls:[{id:'call_1',type:'function',function:{name:'market_quote',arguments:'{ "symbol": "AAPL.US" }'}}]};
test('Chat assistant / pi toolCall / toolResult mapping retains raw args, text and IDs',()=>{
  const mapping=new ModelMessages(model,tools);
  const {message,batch}=mapping.response({message:chat});
  assert.deepEqual(message.content,[{type:'text',text:'先查询'},{type:'toolCall',id:'call_1',name:'market_quote',arguments:{symbol:'AAPL.US'}}]);
  assert.equal(batch[0].arguments,'{ "symbol": "AAPL.US" }');
  const p=mapping.request({messages:[{role:'system',content:'safe',toolsAdded:tools,timestamp:0},
    {role:'user',content:[{type:'text',text:'查询'}],timestamp:0},message,
    {role:'toolResult',toolCallId:'call_1',content:[{type:'text',text:'{"ok":true,"data":{"source":"fixture"}}'}],timestamp:0}]},2);
  assert.deepEqual(p.messages[2],chat);
  assert.equal(p.messages[3].tool_call_id,chat.tool_calls[0].id);
  assert.deepEqual(p.tools,[{type:'function',function:{...tools[0],strict:true}}]);
});
test('malformed duplicate raw arguments remain intact until Python batch admission',()=>{
  const m=new ModelMessages(model,tools);
  const response=structuredClone(chat);response.tool_calls[0].function.arguments='{"symbol":"AAPL.US","symbol":"NVDA.US"}';
  const {message,batch}=m.response({message:response});
  assert.deepEqual(message.content[1].arguments,{});
  assert.equal(batch[0].arguments,response.tool_calls[0].function.arguments);
});
test('unsupported images, tool mutations and oversized model messages reject',()=>{
  const mapping=new ModelMessages(model,tools);
  assert.throws(()=>mapping.request({messages:[{role:'user',content:[{type:'image',data:'private'}]}]},1));
  assert.throws(()=>mapping.request({messages:[{role:'system',content:'safe',toolsAdded:[]}]},1));
  assert.throws(()=>mapping.request({messages:[{role:'user',content:'x'.repeat(100000)}]},1));
  assert.throws(()=>mapping.response({message:chat,private:'sentinel'}));
});

const path=fileURLToPath(new URL('./worker.mjs',import.meta.url));
const guard=fileURLToPath(new URL('../../scripts/offline/network.cjs',import.meta.url));
for(const mode of ['extra','size','wrong_id','duplicate','cancel_late']) {
  test('real model-mode Worker safely rejects/discards '+mode,async()=>{
    const p=spawn(process.execPath,['--require',guard,path,'run','attempt'],{windowsHide:true,env:{SystemRoot:process.env.SystemRoot},stdio:['pipe','pipe','pipe']});
    const c=new Channel('run','attempt');let buffer='',output='',err='';const messages=[];
    const send=(type,id,payload)=>p.stdin.write(c.encode(type,id,payload));
    const exit=new Promise(resolve=>p.on('exit',code=>resolve(code)));
    p.stdin.on('error',()=>{});p.stderr.on('data',chunk=>{err+=chunk;});
    p.stdout.on('data',chunk=>{
      output+=chunk;buffer+=chunk;let i;
      while((i=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);messages.push(m);
        if(m.type==='ready')send('start','start',{mode:'python-model',tools,system:'safe',text:'查询AAPL.US行情',max_model_calls:9,rpc_timeout_ms:1000,run_timeout_ms:2500});
        if(m.type==='model_request'){
          assert.deepEqual(m.payload.messages,[{role:'system',content:'safe'},{role:'user',content:'查询AAPL.US行情'}]);
          const payload={message:{role:'assistant',content:'done',tool_calls:[]}};
          if(mode==='extra')payload.message.authorization='private-sentinel';
          if(mode==='size')payload.message.content='x'.repeat(100000);
          if(mode==='cancel_late')send('cancel','cancel',{});
          send('model_response',mode==='wrong_id'?'wrong':m.request_id,payload);
          if(mode==='duplicate')send('model_response',m.request_id,payload);
        }
        if(m.type==='engine_end')send('shutdown','shutdown',{});
      }
    });
    const timer=setTimeout(()=>p.kill(),4000);
    try{
      const code=await exit;
      assert.equal(code,['wrong_id','duplicate'].includes(mode)?2:0);
      assert(messages.some(m=>m.type==='model_request'));
      assert(!messages.some(m=>m.type==='tool_request'||m.type==='tool_batch'));
      if(['extra','size'].includes(mode))assert.equal(messages.find(m=>m.type==='engine_end').payload.ok,false);
      if(mode==='cancel_late')assert(!messages.some(m=>m.type==='engine_end'));
      assert(!output.includes('private-sentinel')&&!err.includes('private-sentinel'));
    }finally{clearTimeout(timer);if(p.exitCode===null)p.kill();}
  });
}
