const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, Agent } = require('node:http');
const { once, EventEmitter } = require('node:events');
const { resolve } = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
function load(relative) {
  const file = resolve(__dirname, '..', relative);
  const source = buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  const compiled = new Module(file, module); compiled.paths = module.paths; compiled._compile(source, file); return compiled.exports;
}
const { BackendManager } = load('apps/desktop/src/main/backend.ts');
const { mergeHistory, applySessionEvent } = load('apps/desktop/src/renderer/session-adapter.ts');
const { RunSubscription, FrameDecoder } = load('apps/desktop/src/main/run-stream.ts');
const sid = '12345678-1234-1234-1234-123456789abc', rid = '12345678-1234-1234-1234-123456789abd';
const event = (sequence, type='text_delta') => ({ protocol_version:1,session_id:sid,run_id:rid,sequence,type,
  timestamp:'2024-01-16T21:00:00Z',message_id:'reply',payload:type==='text_delta'?{text:'研'}:{stop_reason:'cancelled'} });
const frame = e => `id: ${rid}:${e.sequence}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;

test('P2-09 history IPC uses fixed authenticated local operation and rejects invalid cursors', async () => {
  const manager = new BackendManager('.'), calls=[];
  manager.business=(...args)=>{calls.push(args);return Promise.resolve({});};
  await manager.sessionHistory(sid); await manager.sessionHistory(sid, 21, 3);
  assert.deepEqual(calls,[[`/sessions/${sid}/history?limit=10`],[`/sessions/${sid}/history?limit=3&before_sequence=21`]]);
  for(const value of [null,-1,0,NaN,Infinity,1.5,'21',{},Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>manager.sessionHistory(sid,value));
  for(const value of [null,0,11,'1',NaN,true]) assert.throws(()=>manager.sessionHistory(sid,undefined,value));
  assert.throws(()=>manager.sessionHistory('../secret')); assert.equal(calls.length,2);
});

const page=(messages,runs,events=[],more=false,cursor=null)=>({session:{id:sid},messages,runs,events,has_more:more,next_before_sequence:cursor});
test('P2-09 older pages deduplicate by identity without rolling back live SSE state', () => {
  const current=page([{id:'reply',sequence:4,run_id:rid,content:'最新'}],[{id:rid,last_sequence:3,status:'running',started_at:'2024-01-16'}],[event(3)],true,3);
  const older=page([{id:'old',sequence:1,run_id:'old',content:'历史'},{id:'reply',sequence:4,run_id:rid,content:'过期'}],
    [{id:rid,last_sequence:2,status:'running',started_at:'2024-01-16'}],[event(2)],false);
  const result=mergeHistory(current,older);
  assert.deepEqual(result.messages.map(m=>m.content),['历史','最新']); assert.equal(result.runs[0].last_sequence,3);
  assert.deepEqual(mergeHistory(result,older),result); assert.equal(result.has_more,false);
  assert.equal(mergeHistory(current,{...older,session:{id:'another'}}),current);
  assert.equal(applySessionEvent(result,event(4)).messages[1].content,'最新研');
});
test('P2-09 head refresh preserves loaded older history and accepts SQLite terminal facts', () => {
  const old=page([{id:'a',sequence:1},{id:'reply',sequence:4}],[{id:rid,started_at:'2024',status:'running'}],[],true,1);
  const incoming=page([{id:'reply',sequence:4}],[{id:rid,started_at:'2024',status:'cancelled'}],[],true,3);
  const result=mergeHistory(old,incoming,true);
  assert.equal(result.messages.length,2); assert.equal(result.runs[0].status,'cancelled'); assert.equal(result.next_before_sequence,1);
});
test('P2-09 disconnected head refresh with an unloaded middle gap rebuilds a traversable page chain', () => {
  const old=page([{id:'old',sequence:1}],[{id:'old',started_at:'2024'}],[],false);
  const incoming=page([{id:'new',sequence:51}],[{id:'new',started_at:'2025'}],[],true,51);
  const merged=mergeHistory(old,incoming,true);
  assert.deepEqual(merged,incoming);
  assert.equal(merged.has_more,true);assert.equal(merged.next_before_sequence,51);
  const delayedOldPage=page([{id:'delayed',sequence:21}],[{id:'delayed',started_at:'2023'}],[],true,21);
  assert.equal(mergeHistory(merged,delayedOldPage),merged,'A stale page from the previous cursor chain must not reintroduce the gap');
});
test('P2-09 sustained frame parsing keeps no delivered history and rejects unbounded partial input', () => {
  const decoder=new FrameDecoder();
  for(let index=1;index<=1000;index++) assert.equal(decoder.push(frame(event(index))).length,1);
  assert.deepEqual(decoder.push(''),[]);
  assert.throws(()=>decoder.push('x'.repeat(262145)),/过大/);
});
test('P2-09 actual SSE gap reconnect resumes after the last accepted sequence and closes cancellation', {timeout:5000}, async () => {
  const requests=[],updates=[],agent=new Agent({proxyEnv:{}});
  const server=createServer((req,res)=>{
    requests.push(req.url);res.writeHead(200,{'Content-Type':'text/event-stream'});
    if(requests.length===1) res.end(frame(event(1))+frame(event(3)));
    else res.end(frame(event(1))+frame(event(2))+frame(event(3,'run_completed')));
  });server.listen(0,'127.0.0.1');await once(server,'listening');
  let subscription;
  try {
    await new Promise(done=>{
      subscription=new RunSubscription({port:server.address().port,token:'test-only',agent,sessionId:sid,runId:rid,after:0,
        update:value=>updates.push(value),closed:done});subscription.start();
    });
    assert.equal(requests.length,2);assert.ok(requests[1].endsWith('after_sequence=1'));
    assert.deepEqual(updates.filter(u=>u.kind==='event').map(u=>u.event.sequence),[1,2,3]);
    assert.equal(updates.at(-1).phase,'closed');
  } finally {subscription?.stop();agent.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('P2-09 permanent event gap exhausts bounded reconnects and releases the subscription', {timeout:5000}, async t => {
  const agent=new Agent({proxyEnv:{}}),changes=new EventEmitter();let requests=0,closed=0;
  const server=createServer((_req,res)=>{requests++;res.writeHead(200,{'Content-Type':'text/event-stream'});res.end(frame(event(2)));});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.mock.timers.enable({apis:['setTimeout']});
  const phases=[];
  const subscription=new RunSubscription({port:server.address().port,token:'test-only',agent,sessionId:sid,runId:rid,after:0,
    update:value=>{phases.push(value.phase);if(['reconnecting','failed'].includes(value.phase)&&value.detail.includes('序号'))changes.emit('failure');
      else if(value.phase==='failed')changes.emit('failure');},closed:()=>closed++});
  try {
    subscription.start();
    for(let attempt=0;attempt<8;attempt++) {await once(changes,'failure');if(attempt<7)t.mock.timers.tick(4000);}
    assert.equal(requests,8);assert.equal(phases.at(-1),'failed');assert.equal(closed,1);
    t.mock.timers.tick(60000);assert.equal(requests,8);subscription.stop();assert.equal(closed,1);
  } finally {t.mock.timers.reset();subscription.stop();agent.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

const { SecuritySnapshots } = load('apps/desktop/src/renderer/securities/security-snapshots.ts');
test('P2-09.6 full snapshot identity and in-flight configuration invalidation never mix real and simulated data', async()=>{
  const cache=new SecuritySnapshots();cache.version('longbridge',1,true,true);
  const query={symbol:'AAPL.US',provider:'longbridge',mode:'real',view:'quote',period:'1d',kind:'ALL',report:'annual',offset:0};
  const key=cache.key(query);
  for(const [field,value] of Object.entries({symbol:'MSFT.US',provider:'massive',mode:'simulated',view:'kline',period:'1w',kind:'IS',report:'quarter',offset:4})) assert.notEqual(cache.key({...query,[field]:value}),key);
  let release,calls=0;
  global.window={researchTrail:{securityPage:()=>{calls++;return new Promise(r=>release=r);}}};
  try {
    const first=cache.read(query,key),second=cache.read(query,key);assert.equal(calls,1);
    cache.version('longbridge',2,true,true);
    release({...query,status:'ready',blocks:[]});
    await assert.rejects(first,/Configuration changed/);await assert.rejects(second,/Configuration changed/);
    assert.equal(cache.get(key),undefined);assert.notEqual(cache.key(query),key);
    const nextKey=cache.key(query),third=cache.read(query,nextKey);
    cache.invalidate('massive');release({...query,status:'ready',blocks:[]});
    await third;assert.ok(cache.get(nextKey),'Changing another provider must not invalidate this response');
  }finally{delete global.window;}
});

test('P2-09.6 failed refresh retains each successful block and records a scoped failure until recovery', async()=>{
  const cache=new SecuritySnapshots(),query={symbol:'AAPL.US',provider:'longbridge',mode:'real',view:'overview'};
  const good={...query,status:'ready',blocks:[{capability:'company.profile',symbol:'AAPL.US',status:'ready',metrics:[{label:'名称',value:'original'}],provenance:{fetched_at:'2024-01-16'}}]};
  let calls=0,fail=false;
  global.window={researchTrail:{securityPage:async()=>{calls++;return fail?{...good,status:'failed',blocks:[{...good.blocks[0],status:'failed',metrics:[]}]}:structuredClone(good);}}};
  try {
    const key=cache.key(query);await cache.read(query,key);fail=true;
    await assert.rejects(cache.read(query,key,true),/刷新失败/);
    assert.deepEqual(cache.get(key).blocks,good.blocks);assert.match(cache.error(key),/刷新失败/);
    await cache.read(query,key);assert.equal(calls,2);
    fail=false;await cache.read(query,key,true);assert.equal(cache.error(key),undefined);assert.equal(calls,3);
    cache.clear();assert.equal(cache.get(key),undefined);
  }finally{delete global.window;}
});
