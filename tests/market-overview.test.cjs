const test = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
function load(relative) {
  const file = resolve(__dirname, '..', relative);
  const source = buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  const compiled = new Module(file, module); compiled.paths=module.paths; compiled._compile(source,file); return compiled.exports;
}
const { BackendManager } = load('apps/desktop/src/main/backend.ts');
const { colorBand, visibleRows, supportedSecurity, unit, percent } = load('apps/desktop/src/renderer/market/overview-display.ts');
const id='12345678-1234-1234-1234-123456789abc';
function manager() {
  const bridge = new BackendManager('.'); const calls=[];
  bridge.business=(...args)=>{calls.push(args);return Promise.resolve({ok:true});};
  return {bridge,calls};
}
function row(symbol,name,change,market='US',group=null) {
  return {asset:{asset_class:'equity',id:`equity:${market}:${symbol}`,market,symbol,name,currency:market==='CN'?'CNY':'USD'},
    change_percent:change,classification:group,security_symbol:symbol,detail_target:'security'};
}

test('P2-07 bridge sends only fixed overview paths and defaults to simulated with bounded timeout', async()=>{
  const {bridge,calls}=manager();
  for(const market of ['CN','US','CRYPTO']) await bridge.marketOverview({request_id:id,market});
  assert.ok(calls.every(c=>c[0]==='/market/overview' && c[1]==='POST' && c[2].mode==='simulated' && c[3]===6500));
  await bridge.cancelMarketOverview(id);
  assert.deepEqual(calls.at(-1),[`/market/overview/${id}/cancel`,'POST']);
});
test('P2-07 bridge rejects malformed objects arbitrary providers symbols endpoints and IDs before transport',()=>{
  const {bridge,calls}=manager();const valid={request_id:id,market:'CN'};
  for(const input of [null,[],1,'CN',new Date(),Object.create({market:'CN'}),{},
    {...valid,request_id:'../health'},{...valid,market:'HK'},{...valid,mode:'live'},
    {...valid,symbol:'BTC/USDT'},{...valid,provider:'binance'},{...valid,url:'https://example.com'}, {...valid,limit:10000}])
    assert.throws(()=>bridge.marketOverview(input));
  for(const invalid of ['../health',true,{},null,'BTC/USDT']) assert.throws(()=>bridge.cancelMarketOverview(invalid));
  assert.equal(calls.length,0);
});
test('P2-07 financial color bands keep exact boundary direction and missing neutral',()=>{
  for(const [value,band] of [[-4,'loss-3'],[-3,'loss-3'],[-2,'loss-2'],[-1,'loss-2'],[-.01,'loss-1'],[0,'flat'],[.5,'gain-1'],[1,'gain-2'],[2.99,'gain-2'],[3,'gain-3'],[7,'gain-3'],[null,'missing'],[NaN,'missing'],[Infinity,'missing']]) assert.equal(colorBand(value),band);
  assert.equal(percent(.5),'+0.50%');assert.equal(percent(null),'—');assert.equal(percent(NaN),'—');
});
test('P2-07 search and grouping remain local with immutable sorting and missing values last',()=>{
  const rows=[row('AAPL.US','Apple',1,'US','示例分组一'),row('TSLA.US','Tesla',-2),row('NVDA.US','NVIDIA',null),row('MSFT.US','Microsoft',0)];
  const original=rows.map(r=>r.asset.symbol);
  assert.deepEqual(visibleRows(rows,'','all','asc').map(r=>r.asset.symbol),['TSLA.US','MSFT.US','AAPL.US','NVDA.US']);
  assert.deepEqual(visibleRows(rows,'','all','desc').map(r=>r.asset.symbol),['AAPL.US','MSFT.US','TSLA.US','NVDA.US']);
  assert.equal(visibleRows(rows,' appLE ','all','desc').length,1);
  assert.equal(visibleRows(rows,'','unclassified','symbol').length,3);
  assert.equal(visibleRows(rows,'','示例分组一','desc').length,1);
  assert.equal(visibleRows(rows,'BTC/USDT','all','desc').length,0);
  assert.deepEqual(rows.map(r=>r.asset.symbol),original);
});
test('P2-07 detail navigation is exact supported stock membership never crypto or a valid-looking ticker',()=>{
  const apple=row('AAPL.US','Apple',1);
  assert.equal(supportedSecurity(apple),'AAPL.US');
  for(const item of [row('600519.SH','茅台',1,'CN'),row('AMZN.US','Amazon',1),
    {...apple,security_symbol:'TSLA.US'}, {...apple,detail_target:null},
    {...apple,asset:{...apple.asset,asset_class:'crypto_pair',market:'CRYPTO',symbol:'BTC/USDT',quote_asset:'USDT'}}]) assert.equal(supportedSecurity(item),null);
});
test('P2-07 quote units keep CNY USD and USDT distinct',()=>{
  assert.equal(unit(row('600519.SH','茅台',1,'CN')),'CNY');
  assert.equal(unit(row('AAPL.US','Apple',1)),'USD');
  assert.equal(unit({asset:{asset_class:'crypto_pair',quote_asset:'USDT'}}),'USDT');
});
