// Actual Electron screenshots with authored simulated data. No user vault/database is read.
// Default output is a new temporary directory. Nothing is published by this script.
const {createRequire}=require('node:module');
const {resolve,join}=require('node:path');
const {mkdtempSync,mkdirSync,writeFileSync,readFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {createHash}=require('node:crypto');
const root=resolve(__dirname,'..'), req=createRequire(join(root,'package.json'));
const {_electron:electron,expect}=req('@playwright/test');
const data=mkdtempSync(join(tmpdir(),'research-trail-public-gallery-'));
const output=process.argv[2]?resolve(process.argv[2]):join(data,'captures');
mkdirSync(output,{recursive:true});
const env={...process.env};
for(const key of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD|AUTHORIZATION|CREDENTIAL/i.test(key) || /^(RESEARCH_TRAIL_|PYTHONPATH$|NODE_OPTIONS$|ELECTRON_.*|.*PROXY$)/i.test(key))delete env[key];
Object.assign(env,{RESEARCH_TRAIL_OFFLINE:'1',UV_OFFLINE:'1',UV_NO_SYNC:'1',UV_PYTHON_DOWNLOADS:'never',
 PYTHONUTF8:'1',PYTHONPATH:join(root,'scripts/offline'),RESEARCH_TRAIL_DB_PATH:join(data,'gallery.sqlite3'),
 RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'monitoring-clock'});
(async()=>{
 const app=await electron.launch({args:['-r',join(root,'scripts/offline/electron.cjs'),join(root,'apps/desktop')],cwd:root,env});
 const images=[],errors=[];
 const page=await app.firstWindow();
 try{
  page.on('pageerror',e=>errors.push(e.message));
  await expect(page.getByRole('heading',{name:'连接就绪'})).toBeVisible({timeout:45000});
  await page.setViewportSize({width:1600,height:1000});
  const logo=page.getByAltText('研迹图标',{exact:true});await expect(logo).toBeVisible();
  if(!await logo.evaluate(el=>el.complete&&el.naturalWidth>0))throw Error('Logo did not load');
  const ids=await page.evaluate(async()=>{
   const b=window.researchTrail;
   for(const s of ['AAPL.US','NVDA.US','MSFT.US','TSLA.US'])await b.addWatch(s);
   const session=await b.createSession('苹果研究 · 独立模拟演示');
   const agent=await b.startAgentRun(session.id,'查询AAPL.US行情');
   const research=await b.startResearch({symbol:'AAPL.US',strategy:'comprehensive',mode:'simulated',provider:'longbridge'});
   const calendar=await b.refreshCalendar({request_id:crypto.randomUUID()});
   const portfolio=await b.createPortfolio({name:'示例研究组合 · 原创模拟',kind:'manual'});
   const csv='record_type,symbol,currency,quantity,cost_price,market_price,amount\nholding,AAPL.US,USD,20,160,189.43,\nholding,MSFT.US,USD,8,310,390,\nholding,NVDA.US,USD,6,430,550,\ncash,,USD,,,,1800';
   const draft=await b.previewPortfolio(portfolio.id,csv);await b.confirmPortfolio(portfolio.id,draft.draft_id);
   return {session:session.id,agent:agent.id,research:research.id,calendar:calendar.id,portfolio:portfolio.id};
  });
  await expect.poll(()=>page.evaluate(id=>window.researchTrail.researchRun(id).then(v=>v.status),ids.research),{timeout:30000}).toBe('collected');
  await expect.poll(()=>page.evaluate(({session,agent})=>window.researchTrail.getRun(session,agent).then(v=>v.status),ids)).toBe('completed');
  const report=await page.evaluate(id=>window.researchTrail.generateReport(id,'fixed',crypto.randomUUID()),ids.research);
  await expect.poll(()=>page.evaluate(id=>window.researchTrail.report(id).then(v=>v.status),report.id),{timeout:15000}).toBe('completed');
  const thesis=await page.evaluate(id=>window.researchTrail.createThesis({report_id:id,request_id:crypto.randomUUID()}),report.id);
  const experiment=await page.evaluate(()=>window.researchTrail.createExperiment({request_id:crypto.randomUUID(),name:'原创离线案例 · 工具与证据基线',case_ids:['quote-aapl','model-shape','minimal-redaction'],profile:'baseline'}));
  await page.evaluate(id=>window.researchTrail.startExperiment(id),experiment.id);
  await expect.poll(()=>page.evaluate(id=>window.researchTrail.evaluationExperiment(id).then(v=>v.status),experiment.id),{timeout:45000}).toBe('passed');
  const failed=await page.evaluate(()=>window.researchTrail.createExperiment({request_id:crypto.randomUUID(),name:'错误价格回归 · 定位失败环节',case_ids:['quote-aapl'],profile:'wrong-fact'}));
  await page.evaluate(id=>window.researchTrail.startExperiment(id),failed.id);
  await expect.poll(()=>page.evaluate(id=>window.researchTrail.evaluationExperiment(id).then(v=>v.status),failed.id),{timeout:25000}).toBe('quality_failed');
  await page.evaluate(()=>window.researchTrail.createMonitoringRule({request_id:crypto.randomUUID(),name:'苹果价格观察 · 模拟',kind:'price_above',symbol:'AAPL.US',threshold:'190',enabled:false,mode:'simulated',provider:'longbridge',timezone:'Asia/Shanghai',cooldown_minutes:60}));
  await page.reload();await expect(page.getByRole('heading',{name:'连接就绪'})).toBeVisible();
  async function capture(name,label,focus){
   if(focus)await focus.evaluate(el=>el.scrollIntoView({block:'start'}));else await page.evaluate(()=>scrollTo(0,0));
   await page.waitForTimeout(350);
   const path=join(output,name+'.png');
   const box=focus?await focus.boundingBox():null;
   const scroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));
   await page.screenshot({path,fullPage:Boolean(box),animations:'disabled',...(box?{clip:{x:box.x+scroll.x,y:box.y+scroll.y,width:box.width,height:Math.min(box.height,960)}}:{})});
   const bytes=readFileSync(path);images.push({file:name+'.png',feature:label,mode:'isolated authored simulation / offline',width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  async function view(label){const button=page.getByRole('navigation',{name:'工作区',exact:true}).getByRole('button',{name:label,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');}
  await view('证券工作台');await page.getByRole('button',{name:'K线',exact:true}).click();
  await page.waitForTimeout(1000);await capture('workbench','证券 K 线与常驻研究助手');
  await view('风险与对比');await page.getByLabel('风险组合',{exact:true}).selectOption(ids.portfolio);
  await page.getByRole('button',{name:'读取/分析',exact:true}).click();
  await expect(page.getByTestId('risk-result')).toHaveAttribute('data-status','partial');await capture('portfolio-risk','组合集中度、历史风险和明确的缺失状态',page.getByTestId('risk-result'));
  await view('研究采集');await page.getByLabel('已保存采集',{exact:true}).selectOption(ids.research);
  await page.getByRole('button',{name:'读取已保存任务',exact:true}).click();
  await expect(page.getByTestId('research-report')).toBeVisible();
  await capture('research-report','事实、分析、预测分层与证据引用',page.getByTestId('research-report'));
  await view('Today与提醒');await expect(page.getByTestId('today-item').first()).toBeVisible();await capture('today','Today 有来源的每日简报与提醒');
  await view('事件日历');await page.getByText('已保存事件快照（最多50份，不重新查询）',{exact:true}).click();
  await page.getByRole('button',{name:'读取事件快照 '+ids.calendar,exact:true}).click();
  await expect(page.getByTestId('calendar-event')).toHaveCount(6);await capture('calendar','财报、股息与宏观事件来源');
  await view('投资论点');await page.getByLabel('已保存论点',{exact:true}).selectOption(thesis.id);
  await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-thesis-id',thesis.id);
  await capture('thesis-review','投资论点、反证和复审版本',page.getByRole('region',{name:'编辑当前论点',exact:true}));
  await view('机会发现');await page.getByLabel('筛选任务',{exact:true}).selectOption('top-losers');
  await page.getByRole('button',{name:'开始筛选',exact:true}).click();
  await expect(page.getByTestId('screening-run')).toHaveAttribute('data-status','completed',{timeout:30000});
  await capture('opportunities','可解释的机会筛选与研究入口',page.getByTestId('screening-run'));
  await view('评测中心');await page.getByTestId('eval-history').getByRole('button',{name:/错误价格回归/}).click();
  await expect(page.getByTestId('eval-experiment')).toHaveAttribute('data-status','quality_failed');
  await page.getByText('案例与实验',{exact:true}).click();
  await page.getByTestId('eval-result').locator('summary').click();
  await capture('evaluation','错误案例的断言、工具轨迹与失败环节',page.getByTestId('eval-experiment'));
  if(errors.length)throw Error(JSON.stringify(errors));
  writeFileSync(join(output,'capture-receipt.json'),JSON.stringify({source:'actual current-source Electron build',source_mode:'authored simulation',model_mode:'fixed / fake',external_calls:0,user_data:'isolated temporary database',images},null,2)+'\n');
  console.log(JSON.stringify({output,images:images.length,errors,external_calls:0}));
 }catch(error){await page.screenshot({path:join(output,'private-debug.png'),fullPage:false});console.error(JSON.stringify({errors,visible_text:await page.locator('main').innerText(),output}));throw error;}
 finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
