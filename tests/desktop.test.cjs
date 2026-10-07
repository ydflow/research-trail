const { test } = require('node:test');
const assert = require('node:assert/strict');
const { waitForBackend } = require('./backend-ready.cjs');
const { _electron: electron, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync, mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

test('Step20 fixed calendar timezone bounds evidence research context and persisted history', {timeout:120000},async()=>{
  let instance=await launch({RESEARCH_TRAIL_OFFLINE:'1'});const path=instance.databasePath;let saved,run,report;
  try{
    let page=instance.page;const errors=[];page.on('pageerror',e=>errors.push(e.message));await waitForBackend(page);
    await page.getByRole('button',{name:'事件日历',exact:true}).click();
    await expect(page.getByTestId('calendar-sources')).toContainText('央行 · 可读取');
    await page.getByRole('button',{name:'刷新事件并保存快照',exact:true}).dblclick();
    await expect(page.getByTestId('calendar-page')).toHaveAttribute('data-status','completed');
    await expect(page.getByTestId('calendar-event')).toHaveCount(6);
    assert.equal((await page.evaluate(()=>window.researchTrail.calendarHistory())).length,1);
    const row=page.locator('[data-source-id="authored-aapl-earnings"]');
    await expect(row.getByTestId('calendar-event-time')).toHaveText('2024-01-17T06:00:00+08:00 [Asia/Shanghai]');
    await expect(page.locator('[data-source-id="authored-tsla-earnings"]')).toContainText('已过预告时间，尚未确认发生');
    await expect(page.locator('[data-source-id="authored-hk-earnings"]')).toContainText('仅日期，准确时刻未知');
    await page.getByLabel('事件显示时区',{exact:true}).selectOption('America/New_York');
    await expect(row.getByTestId('calendar-event-time')).toHaveText('2024-01-16T17:00:00-05:00 [America/New_York]');
    saved=await page.evaluate(async()=>{const rows=await window.researchTrail.calendarHistory();return window.researchTrail.calendarView(rows[0].id,'America/New_York');});
    assert.equal(saved.events.length,6);assert.equal((await page.evaluate(()=>window.researchTrail.calendarHistory())).length,1);
    await row.getByText('事件身份与来源',{exact:true}).click();
    await row.getByRole('button',{name:'查看事件原始事实 authored-aapl-earnings',exact:true}).click();
    await expect(page.getByTestId('calendar-original')).toContainText('2024-01-16T17:00:00-05:00');
    await expect(page.getByTestId('calendar-original')).toContainText('模拟数据');
    await screenshot(page,'step20-calendar-wide.png');
    await row.getByRole('button',{name:'带事件研究 authored-aapl-earnings',exact:true}).click();
    await expect(page.getByLabel('研究股票',{exact:true})).toHaveValue('AAPL.US');
    await expect(page.getByRole('radio',{name:/事件驱动/})).toBeChecked();
    await expect(page.getByTestId('event-research-context')).toContainText('模拟 Apple 财报预告');
    await expect(page.getByTestId('event-research-context')).toContainText('2024-01-16T17:00:00-05:00 [America/New_York]');
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,0);
    await page.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    run=await page.evaluate(async()=>{const rows=await window.researchTrail.researchRuns();return window.researchTrail.researchRun(rows[0].id);});
    assert.equal(run.plan.event_context.event.source_event_id,'authored-aapl-earnings');assert.equal(run.plan.event_context.target_symbol,'AAPL.US');
    await page.getByRole('button',{name:'生成新报告',exact:true}).click();await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    report=await page.evaluate(async()=>{const rows=await window.researchTrail.reportList();return window.researchTrail.report(rows[0].id);});
    assert.deepEqual(report.document.event_context,run.plan.event_context);
    await page.getByRole('button',{name:'事件日历',exact:true}).click();
    await page.getByText('已保存事件快照（最多50份，不重新查询）',{exact:true}).click();
    await page.getByRole('button',{name:'读取事件快照 '+saved.id,exact:true}).click();
    await page.getByLabel('事件研究股票 authored-fomc',{exact:true}).fill('TSLA.US');
    await page.getByRole('button',{name:'带事件研究 authored-fomc',exact:true}).click();
    await expect(page.getByLabel('研究股票',{exact:true})).toHaveValue('TSLA.US');
    await expect(page.getByTestId('event-research-context')).toContainText('模拟 FOMC 决议预告');
    await expect(page.getByTestId('event-research-context')).toContainText('用户自主选择，来源未声明股票关联');
    await expect(page.getByTestId('research-run')).toHaveCount(0);
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,1);
    await page.getByLabel('研究股票',{exact:true}).fill('NVDA.US');await expect(page.getByTestId('event-research-context')).toHaveCount(0);
    await instance.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(600,700));
    await page.getByRole('button',{name:'事件日历',exact:true}).click();await page.getByText('已保存事件快照（最多50份，不重新查询）',{exact:true}).click();
    await page.getByRole('button',{name:'读取事件快照 '+saved.id,exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await screenshot(page,'step20-calendar-compact.png');
    await instance.app.close();instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_DB_PATH:path});page=instance.page;await waitForBackend(page);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.calendarView(id,'America/New_York'),saved.id),saved);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.researchRun(id),run.id),run);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),report.id),report);
    assert.equal((await page.evaluate(()=>window.researchTrail.calendarHistory())).length,1);assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,1);
    assert.deepEqual(errors,[]);
  }finally{await instance.app.close();}
});

test('Step20 real unsupported calendar never falls back and bridge validates context', {timeout:90000},async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1'});
  try{
    const page=instance.page;await waitForBackend(page);await page.getByRole('button',{name:'事件日历',exact:true}).click();
    await page.getByLabel('事件数据模式',{exact:true}).selectOption('real');
    await expect(page.getByTestId('calendar-sources')).toContainText('央行 · 不可用 · NOT_IMPLEMENTED');
    await expect(page.getByRole('button',{name:'刷新事件并保存快照',exact:true})).toBeDisabled();await expect(page.getByTestId('calendar-event')).toHaveCount(0);
    await page.getByLabel('事件提供商',{exact:true}).selectOption('massive');await expect(page.getByTestId('calendar-sources')).toContainText('PROVIDER_UNSUPPORTED');
    assert.equal((await page.evaluate(()=>window.researchTrail.calendarHistory())).length,0);
    const result=await page.evaluate(()=>window.researchTrail.refreshCalendar({mode:'real',provider:'massive',request_id:crypto.randomUUID()}));assert.equal(result.status,'unavailable');assert.equal(result.events.length,0);
    await assert.rejects(page.evaluate(()=>window.researchTrail.calendarSources({unexpected:true})),/字段无效/);
    await assert.rejects(page.evaluate(()=>window.researchTrail.calendarView('../secret','UTC')),/ID格式无效/);
    await assert.rejects(page.evaluate(()=>window.researchTrail.calendarView(crypto.randomUUID(),'../../private')),/时区格式无效/);
    await assert.rejects(page.evaluate(()=>window.researchTrail.researchPlan({symbol:'AAPL.US',event_ref:{snapshot_id:crypto.randomUUID(),event_id:'bad'}})),/事件ID格式无效/);
    await screenshot(page,'step20-real-unavailable.png');
  }finally{await instance.app.close();}
});

test('Step20 stale calendar source and original responses cannot overwrite newer selection', {timeout:90000},async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1'});
  try{
    const page=instance.page;await waitForBackend(page);
    await instance.app.evaluate(({ipcMain})=>{
      const handler=ipcMain._invokeHandlers.get('calendar:sources');globalThis.calendarSourceStarted=false;
      ipcMain.removeHandler('calendar:sources');ipcMain.handle('calendar:sources',async(event,input)=>{const result=await handler(event,input);if(input.provider==='longbridge'){globalThis.calendarSourceStarted=true;await new Promise(resolve=>setTimeout(resolve,600));}return result;});
    });
    await page.getByRole('button',{name:'事件日历',exact:true}).click();await expect.poll(()=>instance.app.evaluate(()=>globalThis.calendarSourceStarted)).toBe(true);
    await page.getByLabel('事件提供商',{exact:true}).selectOption('massive');await expect(page.getByTestId('calendar-sources')).toContainText('PROVIDER_UNSUPPORTED');
    await page.waitForTimeout(800);await expect(page.getByRole('button',{name:'刷新事件并保存快照',exact:true})).toBeDisabled();
    await page.getByLabel('事件提供商',{exact:true}).selectOption('longbridge');await expect(page.getByRole('button',{name:'刷新事件并保存快照',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'刷新事件并保存快照',exact:true}).click();await expect(page.getByTestId('calendar-event')).toHaveCount(6);
    const later=await page.evaluate(()=>window.researchTrail.refreshCalendar({request_id:crypto.randomUUID(),kinds:['central-bank']}));
    await page.getByRole('button',{name:'机会发现',exact:true}).click();await expect(page.getByRole('heading',{name:'机会发现',exact:true})).toBeVisible();await page.getByRole('button',{name:'事件日历',exact:true}).click();
    await page.getByText('已保存事件快照（最多50份，不重新查询）',{exact:true}).click();
    const history=await page.evaluate(()=>window.researchTrail.calendarHistory());const first=history.find(r=>r.id!==later.id);
    await page.getByRole('button',{name:'读取事件快照 '+first.id,exact:true}).click();
    await instance.app.evaluate(({ipcMain})=>{const handler=ipcMain._invokeHandlers.get('calendar:original');ipcMain.removeHandler('calendar:original');ipcMain.handle('calendar:original',async(...args)=>{const result=await handler(...args);await new Promise(resolve=>setTimeout(resolve,1000));return result;});});
    const row=page.locator('[data-source-id="authored-aapl-earnings"]');await row.getByText('事件身份与来源',{exact:true}).click();await row.getByRole('button',{name:'查看事件原始事实 authored-aapl-earnings',exact:true}).click();
    await page.getByRole('button',{name:'读取事件快照 '+later.id,exact:true}).click();await expect(page.getByTestId('calendar-event')).toHaveCount(1);
    await page.waitForTimeout(1200);await expect(page.getByTestId('calendar-original')).toHaveCount(0);await expect(page.getByTestId('calendar-page')).toHaveAttribute('data-snapshot-id',later.id);
  }finally{await instance.app.close();}
});

test('Step19 17 tasks, evidence, watch/compare/research symbols and persisted history', {timeout:120000}, async()=>{
  let instance=await launch({RESEARCH_TRAIL_OFFLINE:'1'}); const path=instance.databasePath; let saved;
  try {
    let page=instance.page;await waitForBackend(page);
    assert.equal((await page.evaluate(()=>window.researchTrail.screeningTasks({mode:'simulated',provider:'longbridge'}))).length,17);
    page.on('pageerror',e=>console.log('Step19 debug',e.message));
    await page.getByRole('button',{name:'机会发现',exact:true}).click();
    await expect(page.getByLabel('筛选任务',{exact:true}).locator('option')).toHaveCount(17);
    await page.getByLabel('筛选任务',{exact:true}).selectOption('top-losers');
    await expect(page.getByTestId('screening-rule')).toContainText('<= -1%');
    await page.getByLabel(/有界股票池/).fill('AAPL.US TSLA.US');
    await page.getByRole('button',{name:'开始筛选',exact:true}).dblclick();
    await expect(page.getByTestId('screening-run')).toHaveAttribute('data-status','completed');
    await expect(page.getByTestId('screening-candidate')).toHaveAttribute('data-symbol','TSLA.US');
    const rows=await page.evaluate(()=>window.researchTrail.screeningRuns());assert.equal(rows.length,1);
    saved=await page.evaluate(id=>window.researchTrail.screeningRun(id),rows[0].id);
    await page.getByTestId('screening-candidate').getByText('涨跌幅 · 指标来源',{exact:true}).click();
    await page.getByRole('button',{name:'查看指标原始事实',exact:true}).click();
    await expect(page.getByTestId('screening-original')).toContainText(saved.id);
    await expect(page.getByTestId('screening-original')).toContainText('模拟数据');
    await page.evaluate(()=>window.researchTrail.removeWatch('TSLA.US'));
    await page.getByRole('button',{name:'加入自选 TSLA.US',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'已加入自选：TSLA.US'})).toBeVisible();
    assert.ok((await page.evaluate(()=>window.researchTrail.workspaceState())).entries.some(e=>e.symbol==='TSLA.US'));
    await page.getByRole('button',{name:'加入对比 TSLA.US',exact:true}).click();
    await expect(page.getByLabel('对比股票（2—4只，空格分隔）',{exact:true})).toHaveValue('TSLA.US');
    await expect(page.getByRole('combobox',{name:'分析数据模式',exact:true})).toHaveValue('simulated');
    await page.getByRole('button',{name:'机会发现',exact:true}).click();
    await page.getByText('已保存筛选记录（最多显示100条）',{exact:true}).click();
    await page.getByRole('button',{name:'读取筛选 '+saved.id,exact:true}).click();
    await expect(page.getByTestId('screening-candidate')).toHaveAttribute('data-symbol','TSLA.US');
    await page.getByRole('button',{name:'发起研究 TSLA.US',exact:true}).click();
    await expect(page.getByLabel('研究股票',{exact:true})).toHaveValue('TSLA.US');
    await page.getByRole('button',{name:'机会发现',exact:true}).click();
    await page.getByText('已保存筛选记录（最多显示100条）',{exact:true}).click();
    await page.getByRole('button',{name:'读取筛选 '+saved.id,exact:true}).click();
    await screenshot(page,'step19-discovery-wide.png');
    await instance.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(600,700));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(page,'step19-discovery-compact.png');
    await instance.app.close();instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_DB_PATH:path});page=instance.page;await waitForBackend(page);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.screeningRun(id),saved.id),saved);
    assert.equal((await page.evaluate(()=>window.researchTrail.screeningRuns())).length,1);
  } finally {await instance.app.close();}
});

test('Step19 missing data and unavailable capabilities cannot create candidates', {timeout:120000}, async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1'});
  try {
    const page=instance.page;await waitForBackend(page);await page.getByRole('button',{name:'机会发现',exact:true}).click();
    await expect(page.getByLabel('筛选任务',{exact:true}).locator('option')).toHaveCount(17);
    await page.getByLabel('筛选任务',{exact:true}).selectOption('high-roe');
    await page.getByRole('button',{name:'开始筛选',exact:true}).click();
    await expect(page.getByTestId('screening-run')).toHaveAttribute('data-status','failed');
    await expect(page.getByTestId('screening-candidate')).toHaveCount(0);
    await page.getByText('全部股票的筛选结论和缺口',{exact:true}).click();
    await expect(page.getByTestId('screening-run')).toContainText('MISSING_OR_AMBIGUOUS_ANNUAL');
    await screenshot(page,'step19-missing.png');
    await page.getByLabel('筛选提供商',{exact:true}).selectOption('massive');
    await expect(page.getByTestId('screening-rule')).toContainText('不可用');
    await expect(page.getByRole('button',{name:'开始筛选',exact:true})).toBeDisabled();
    await page.getByLabel('筛选数据模式',{exact:true}).selectOption('real');
    await expect(page.getByRole('button',{name:'开始筛选',exact:true})).toBeDisabled();
    await expect(page.getByTestId('screening-run')).toHaveCount(0);
    assert.equal((await page.evaluate(()=>window.researchTrail.screeningRuns())).length,1);
    await assert.rejects(page.evaluate(()=>window.researchTrail.screeningTasks({mode:'simulated',provider:'longbridge',unexpected:true})),/字段无效/);
    await assert.rejects(page.evaluate(()=>window.researchTrail.screeningEvidence('../secret','../secret')),/ID格式无效/);
  } finally {await instance.app.close();}
});

test('Step18 report converts to thesis, immutable edits and traceable new-data review survive restart', {timeout:120000}, async()=>{
  let instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'report-updated'});
  const path=instance.databasePath; let before,after,initial,saved;
  try {
    let page=instance.page; const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await waitForBackend(page); await page.getByRole('button',{name:'研究采集',exact:true}).click();
    await page.getByRole('radio',{name:/价值投资/}).check();
    await page.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    await page.getByRole('button',{name:'生成新报告',exact:true}).click();
    await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    before=await page.evaluate(async()=>{const r=await window.researchTrail.reportList();return window.researchTrail.report(r[0].id);});
    await page.getByRole('button',{name:'将报告形成投资论点',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'已形成投资论点'})).toBeVisible();
    await page.getByRole('button',{name:'投资论点',exact:true}).click();
    await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-version','1');
    const id=await page.getByTestId('thesis-current').getAttribute('data-thesis-id');
    initial=await page.evaluate(id=>window.researchTrail.thesisVersion(id,1),id);
    assert.deepEqual(initial.data_report,before);
    await page.getByLabel('论点摘要',{exact:true}).fill('用户版本二：补充估值风险');
    await page.getByLabel('论点风险',{exact:true}).fill(' \n\n');
    await page.getByLabel('论点催化因素',{exact:true}).fill(' \n 用户补充催化因素 \n\n');
    await page.getByLabel('论点变化理由',{exact:true}).fill('手动补充风险解释，没有新数据');
    await page.getByRole('button',{name:'保存论点新版本',exact:true}).dblclick();
    await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-version','2');
    const edited=await page.evaluate(id=>window.researchTrail.thesisVersion(id,2),id);
    assert.deepEqual(edited.content.risks,[]);
    assert.deepEqual(edited.content.catalysts,['用户补充催化因素']);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.thesisVersion(id,1),id),initial);
    await page.getByRole('button',{name:'读取论点版本 1',exact:true}).click();
    await expect(page.getByTestId('thesis-snapshot')).toContainText('已保存版本 1');
    await expect(page.getByLabel('论点摘要',{exact:true})).toHaveValue('用户版本二：补充估值风险');
    await page.getByRole('button',{name:'重新评估新数据',exact:true}).click();
    await expect(page.getByTestId('thesis-evaluation')).toHaveAttribute('data-status','unable');
    await expect(page.getByTestId('thesis-evaluation')).toContainText('NEW_DATA_REQUIRED');
    await expect(page.getByRole('button',{name:'保存复审判断',exact:true})).toBeDisabled();
    const run=await page.evaluate(()=>window.researchTrail.startResearch({symbol:'AAPL.US',strategy:'value',mode:'simulated',provider:'longbridge',concurrency:4}));
    await expect.poll(()=>page.evaluate(id=>window.researchTrail.researchRun(id).then(r=>r.status),run.id),{timeout:10000}).toBe('collected');
    const newJob=await page.evaluate(id=>window.researchTrail.generateReport(id,'fixed',crypto.randomUUID()),run.id);
    await expect.poll(()=>page.evaluate(id=>window.researchTrail.report(id).then(r=>r.status),newJob.id),{timeout:10000}).toBe('completed');
    after=await page.evaluate(id=>window.researchTrail.report(id),newJob.id);
    await page.getByRole('button',{name:'刷新论点和报告',exact:true}).click();
    await expect(page.getByLabel('复审新报告',{exact:true}).locator('option').filter({hasText:after.id})).toHaveCount(1);
    await page.getByLabel('复审新报告',{exact:true}).selectOption(after.id);
    await page.getByRole('button',{name:'重新评估新数据',exact:true}).click();
    await expect(page.getByTestId('thesis-evaluation')).toHaveAttribute('data-status','ready');
    await expect(page.getByTestId('thesis-evaluation')).toContainText('company.valuation/pe_ttm_ratio');
    await expect(page.getByTestId('thesis-evaluation')).toContainText('20 → 25');
    await page.getByRole('button',{name:'查看复审新事实',exact:true}).first().click();
    await expect(page.getByTestId('thesis-original')).toContainText(after.run_id);
    await page.getByLabel('论点方向',{exact:true}).selectOption('neutral');
    await page.getByLabel('复审判断',{exact:true}).selectOption('weakened');
    await page.getByLabel('论点变化理由',{exact:true}).fill('新的估值25使我减弱原判断');
    await page.getByRole('button',{name:'保存复审判断',exact:true}).dblclick();
    await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-version','3');
    saved=await page.evaluate(id=>window.researchTrail.thesis(id),id);
    assert.equal(saved.versions.length,3); assert.equal(saved.reviews.length,3);
    assert.equal(saved.current.content.stance,'neutral'); assert.deepEqual(saved.current.data_report,after);
    const judgment=saved.reviews.find(r=>r.kind==='judgment'); assert.equal(judgment.judgment,'weakened');
    const audit=await page.evaluate(({id,rid})=>window.researchTrail.thesisReview(id,rid),{id,rid:judgment.id});
    assert.equal(audit.baseline_report.id,before.id); assert.equal(audit.candidate_report.id,after.id);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.thesisVersion(id,1),id),initial);
    await page.getByRole('button',{name:`读取复审 ${judgment.id}`,exact:true}).click();
    await expect(page.getByTestId('thesis-evaluation')).toContainText('用户判断：减弱');
    await screenshot(page,'step18-thesis-reviewed.png');
    await instance.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(600,680));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(page,'step18-thesis-compact.png');
    await instance.app.close(); instance=await launch({RESEARCH_TRAIL_DB_PATH:path,RESEARCH_TRAIL_OFFLINE:'1'});
    page=instance.page; page.on('pageerror',e=>errors.push(e.message)); await waitForBackend(page);
    await page.getByRole('button',{name:'投资论点',exact:true}).click();
    await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-version','3');
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.thesis(id),id),saved);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),before.id),before);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),after.id),after);
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,2);
    assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,2);
    assert.deepEqual(errors,[]);
  } finally { if(instance) await instance.app.close(); }
});

test('Step18 thesis selection discards a delayed earlier saved version without contaminating edits', {timeout:60000}, async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1'});
  try {
    const page=instance.page; await waitForBackend(page);
    const create=async symbol=>{
      const run=await page.evaluate(symbol=>window.researchTrail.startResearch({symbol,strategy:'value',mode:'simulated',provider:'longbridge',concurrency:4}),symbol);
      await expect.poll(()=>page.evaluate(id=>window.researchTrail.researchRun(id).then(r=>r.status),run.id),{timeout:10000}).toBe('collected');
      const job=await page.evaluate(id=>window.researchTrail.generateReport(id,'fixed',crypto.randomUUID()),run.id);
      await expect.poll(()=>page.evaluate(id=>window.researchTrail.report(id).then(r=>r.status),job.id),{timeout:10000}).toBe('completed');
      return page.evaluate(id=>window.researchTrail.createThesis({report_id:id,request_id:crypto.randomUUID()}),job.id);
    };
    const a=await create('AAPL.US'), b=await create('NVDA.US');
    await page.getByRole('button',{name:'投资论点',exact:true}).click();
    await page.getByLabel('已保存论点',{exact:true}).selectOption(a.id);
    await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-thesis-id',a.id);
    await instance.app.evaluate(({ipcMain},id)=>{
      const handler=ipcMain._invokeHandlers.get('theses:version');
      ipcMain.removeHandler('theses:version');
      ipcMain.handle('theses:version',async(event,selected,version)=>{const saved=await handler(event,selected,version);if(selected===id)await new Promise(done=>setTimeout(done,1000));return saved;});
    },a.id);
    await page.getByRole('button',{name:'读取论点版本 1',exact:true}).click();
    await page.getByLabel('已保存论点',{exact:true}).selectOption(b.id);
    await expect(page.getByTestId('thesis-current')).toHaveAttribute('data-thesis-id',b.id);
    await page.waitForTimeout(1300);
    await expect(page.getByTestId('thesis-snapshot')).toContainText(b.current.content.summary);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.thesis(id),a.id),a);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.thesis(id),b.id),b);
  } finally { await instance.app.close(); }
});

test('Step17 actual collection process interruption preserves evidence resumes and restarts explicitly', {timeout:90000}, async()=>{
  let instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'research-checkpoint'});
  const path=instance.databasePath; let original,raw;
  try{
    let page=instance.page; const errors=[]; page.on('pageerror',e=>errors.push(e.message)); await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click(); await page.getByRole('radio',{name:/价值投资/}).check();
    await expect(page.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await page.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect.poll(async()=> page.evaluate(async()=>{const rows=await window.researchTrail.researchRuns();return rows.length ? (await window.researchTrail.researchRun(rows[0].id)).succeeded : 0;})).toBe(3);
    original=await page.evaluate(async()=>{const rows=await window.researchTrail.researchRuns();return window.researchTrail.researchRun(rows[0].id);});
    raw=await page.evaluate(id=>window.researchTrail.researchData(id,'company.valuation'),original.id);
    const owned=children(instance.pid); assert.equal(owned.length,1); process.kill(owned[0]);
    await expect(page.getByRole('heading',{name:'连接未就绪'})).toBeVisible(); await instance.app.close();
    instance=await launch({RESEARCH_TRAIL_DB_PATH:path}); page=instance.page; page.on('pageerror',e=>errors.push(e.message)); await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click();
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-run-id',original.id);
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','interrupted');
    await expect(page.getByTestId('research-checkpoint')).toHaveAttribute('data-stage','collection_interrupted');
    assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,0);
    await page.getByTestId('research-checkpoint').scrollIntoViewIfNeeded(); await screenshot(page,'step17-collection-interrupted.png');
    await page.getByRole('button',{name:'恢复原任务（不调用模型）',exact:true}).click();
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    const resumed=await page.evaluate(id=>window.researchTrail.researchRun(id),original.id);
    assert.equal(resumed.generation,1); assert.equal(resumed.id,original.id);
    assert.deepEqual(resumed.steps.filter(s=>s.status==='success'&&s.capability!=='company.profile'),original.steps.filter(s=>s.status==='success'));
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.researchData(id,'company.valuation'),original.id),raw);
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,1);
    assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,0);
    await page.getByRole('button',{name:'放弃原任务（保留历史）',exact:true}).click();
    await expect(page.getByTestId('research-checkpoint')).toHaveAttribute('data-stage','abandoned');
    await expect(page.getByRole('button',{name:'生成新报告',exact:true})).toBeDisabled();
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.researchData(id,'company.valuation'),original.id),raw);
    await page.getByRole('button',{name:'重新发起新任务',exact:true}).click();
    await expect(page.getByTestId('research-run')).not.toHaveAttribute('data-run-id',original.id);
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    const fresh=await page.evaluate(async()=>{const rows=await window.researchTrail.researchRuns();return window.researchTrail.researchRun(rows[0].id);});
    assert.notEqual(fresh.id,original.id); assert.equal(fresh.parent_run_id,original.id); assert.equal(fresh.generation,0);
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,2);
    assert.ok((await page.evaluate(id=>window.researchTrail.researchRun(id),original.id)).abandoned_at);
    await page.setViewportSize({width:600,height:680});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByTestId('research-checkpoint').scrollIntoViewIfNeeded(); await screenshot(page,'step17-restart-narrow.png');
    assert.deepEqual(errors,[]);
  }finally{await instance.app.close();}
});

test('Step17 actual report process interruption never resumes synthesis or duplicates reports', {timeout:90000}, async()=>{
  let instance=await launch({}); const path=instance.databasePath; let runId,original,interrupted;
  try{
    let page=instance.page; const errors=[]; page.on('pageerror',e=>errors.push(e.message)); await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click(); await page.getByRole('radio',{name:/价值投资/}).check();
    await expect(page.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await page.getByRole('button',{name:'开始采集',exact:true}).click(); await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    runId=await page.getByTestId('research-run').getAttribute('data-run-id');
    await page.getByRole('button',{name:'生成新报告',exact:true}).click(); await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    original=await page.evaluate(async()=>{const rows=await window.researchTrail.reportList();return window.researchTrail.report(rows[0].id);});
    await instance.app.close(); instance=await launch({RESEARCH_TRAIL_DB_PATH:path,RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'report-checkpoint'});
    page=instance.page; await waitForBackend(page); await page.getByRole('button',{name:'研究采集',exact:true}).click();
    await page.getByRole('button',{name:'读取已保存任务',exact:true}).click();
    await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    await page.getByRole('button',{name:'生成新报告',exact:true}).click(); await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','generating');
    const rows=await page.evaluate(()=>window.researchTrail.reportList()); assert.equal(rows.length,2); const rid=rows[0].id;
    const owned=children(instance.pid); assert.equal(owned.length,1); process.kill(owned[0]); await instance.app.close();
    instance=await launch({RESEARCH_TRAIL_DB_PATH:path}); page=instance.page; page.on('pageerror',e=>errors.push(e.message)); await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click();
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-run-id',runId);
    await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','interrupted');
    await expect(page.getByTestId('research-checkpoint')).toHaveAttribute('data-stage','awaiting_report');
    interrupted=await page.evaluate(id=>window.researchTrail.report(id),rid);
    assert.equal(interrupted.document,null); assert.equal(interrupted.requests_started,0);
    await page.getByRole('button',{name:'恢复原任务（不调用模型）',exact:true}).click();
    await expect(page.getByTestId('research-checkpoint')).toHaveAttribute('data-stage','awaiting_report');
    const replay=await page.evaluate(async id=>{const key=crypto.randomUUID();return Promise.all([window.researchTrail.resumeResearch(id,key),window.researchTrail.resumeResearch(id,key)]);},runId);
    assert.deepEqual(replay[0],replay[1]);
    assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,2);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),rid),interrupted);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),original.id),original);
    await page.getByTestId('research-checkpoint').scrollIntoViewIfNeeded(); await screenshot(page,'step17-report-awaiting.png');
    await page.getByRole('button',{name:'生成新报告',exact:true}).click(); await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    const latest=await page.evaluate(async()=>{const rows=await window.researchTrail.reportList();return window.researchTrail.report(rows[0].id);});
    assert.equal(latest.version,3); assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,3);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),rid),interrupted);
    assert.deepEqual(errors,[]);
  }finally{await instance.app.close();}
});

test('Step17 delayed abandon response survives report status refresh', {timeout:60000}, async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'report-checkpoint'});
  try{
    const page=instance.page; await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click(); await page.getByRole('radio',{name:/价值投资/}).check();
    await expect(page.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await page.getByRole('button',{name:'开始采集',exact:true}).click(); await expect(page.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    await page.getByRole('button',{name:'生成新报告',exact:true}).click(); await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','generating');
    await instance.app.evaluate(({ipcMain})=>{
      const original=ipcMain._invokeHandlers.get('research:abandon');
      ipcMain.removeHandler('research:abandon');
      ipcMain.handle('research:abandon',async(...args)=>{
        const result=await original(...args);
        await new Promise(resolve=>setTimeout(resolve,2000));
        return result;
      });
    });
    await page.getByRole('button',{name:'放弃原任务（保留历史）',exact:true}).click();
    await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','cancelled');
    await expect(page.getByTestId('research-checkpoint')).toHaveAttribute('data-stage','abandoned');
    await expect(page.getByTestId('research-run')).toContainText('已放弃原任务');
    await expect(page.getByRole('button',{name:'放弃原任务（保留历史）',exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'生成新报告',exact:true})).toBeDisabled();
    const saved=await page.evaluate(async()=>{const rows=await window.researchTrail.researchRuns();return window.researchTrail.researchRun(rows[0].id);});
    assert.ok(saved.abandoned_at);
    const reports=await page.evaluate(()=>window.researchTrail.reportList());
    assert.equal(reports.length,1); assert.equal(reports[0].status,'cancelled');
  }finally{await instance.app.close();}
});

test('Step16 saved reports, actual collected diff, original facts, Markdown dialog and restart', {timeout:90000}, async()=>{
  let instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'report-updated'});
  const path=instance.databasePath; let first,second;
  const exportPath=resolve(mkdtempSync(resolve(tmpdir(),'research-trail-report-export-')),'report.md');
  try{
    let page=instance.page; const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await waitForBackend(page); await page.getByRole('button',{name:'研究采集',exact:true}).click();
    const panel=page.getByRole('region',{name:'研究采集工作台'});
    await panel.getByRole('radio',{name:/价值投资/}).check();
    await expect(panel.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await panel.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    await panel.getByRole('button',{name:'生成新报告',exact:true}).click();
    await expect(panel.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    first=await page.evaluate(async()=>{const rows=await window.researchTrail.reportList();return window.researchTrail.report(rows[0].id);});
    assert.equal(first.requests_started,0); assert.equal(first.document.source_mode,'simulated');
    await expect(panel.getByTestId('research-report')).toContainText('不等于论断正确');
    await panel.getByRole('button',{name:/^查看原始事实 ev-/}).first().click();
    await expect(panel.getByTestId('report-original')).toContainText(first.document.source_run_id);
    await expect(panel.getByTestId('report-original')).toContainText('SHA256');
    await instance.app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});
    await panel.getByRole('button',{name:'导出 Markdown',exact:true}).click();
    await expect(panel.getByRole('status').filter({hasText:'已取消导出'})).toBeVisible();
    await instance.app.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},resolve(exportPath,'missing','report.md'));
    await panel.getByRole('button',{name:'导出 Markdown',exact:true}).click();
    await expect(panel.getByRole('alert')).toContainText('报告未保存');
    await instance.app.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},exportPath);
    await panel.getByRole('button',{name:'导出 Markdown',exact:true}).click();
    await expect(panel.getByRole('status').filter({hasText:'Markdown 已保存'})).toBeVisible();
    const md=readFileSync(exportPath,'utf8');
    assert.match(md,/## 摘要/); assert.match(md,/## 原始事实索引/); assert.match(md,/pe\\_ttm\\_ratio = 20/); assert.ok(md.includes(first.id));
    await panel.getByRole('button',{name:'生成新报告',exact:true}).click();
    await expect(panel.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    await expect(panel.getByLabel('已保存报告').locator('option')).toHaveCount(3);
    await panel.getByLabel('已保存报告').selectOption(first.id);
    await panel.getByRole('button',{name:'读取报告版本',exact:true}).click();
    await expect(panel.getByTestId('report-status')).toHaveAttribute('data-report-id',first.id);
    await panel.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    await panel.getByRole('button',{name:'生成新报告',exact:true}).click();
    await expect(panel.getByTestId('report-status')).toHaveAttribute('data-status','completed');
    second=await page.evaluate(async()=>{const rows=await window.researchTrail.reportList();return window.researchTrail.report(rows[0].id);});
    assert.notEqual(first.run_id,second.run_id);
    await panel.getByLabel('差异旧报告').selectOption(first.id); await panel.getByLabel('差异新报告').selectOption(second.id);
    await panel.getByRole('button',{name:'比较两份报告',exact:true}).click();
    await expect(panel.getByTestId('report-diff')).toContainText('company.valuation/pe_ttm_ratio');
    await expect(panel.getByTestId('report-diff')).toContainText('20 → 25');
    await panel.getByRole('button',{name:'查看旧原始事实',exact:true}).click();
    await expect(panel.getByTestId('report-original')).toContainText(first.run_id);
    await panel.getByRole('button',{name:'查看新原始事实',exact:true}).click();
    await expect(panel.getByTestId('report-original')).toContainText(second.run_id);
    const invalid=await page.evaluate(async id=>{try{await window.researchTrail.reportEvidence(id,'../../private');return 'unexpected';}catch(e){return e.message;}},first.id);
    assert.match(invalid,/证据引用无效/);
    await panel.getByTestId('research-report').scrollIntoViewIfNeeded(); await screenshot(page,'step16-report-wide.png');
    await page.setViewportSize({width:600,height:680});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(page,'step16-report-narrow.png');
    await panel.getByTestId('report-diff').scrollIntoViewIfNeeded(); await screenshot(page,'step16-diff.png');
    assert.deepEqual(errors,[]);
    await instance.app.close(); instance=await launch({RESEARCH_TRAIL_DB_PATH:path}); page=instance.page; await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click();
    await page.getByRole('button',{name:'读取已保存任务',exact:true}).click();
    await expect(page.getByTestId('report-status')).toHaveAttribute('data-report-id',second.id);
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.report(id),first.id),first);
    assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,3);
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,2);
  }finally{await instance.app.close();}
});

for(const scenario of ['research-partial','failure']) test(`Step16 ${scenario} report gaps and no all-failed synthesis`,{timeout:45000},async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:scenario});
  try{
    const page=instance.page; await waitForBackend(page); await page.getByRole('button',{name:'研究采集',exact:true}).click();
    await page.getByRole('radio',{name:/价值投资/}).check();
    await expect(page.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await page.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(page.getByTestId('research-run')).toHaveAttribute('data-status',scenario==='failure'?'failed':'partial');
    if(scenario==='failure'){
      await expect(page.getByRole('button',{name:'生成新报告',exact:true})).toBeDisabled();
      assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,0);
    }else{
      await page.getByRole('button',{name:'生成新报告',exact:true}).click();
      await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
      await expect(page.getByTestId('report-gaps')).toContainText('company.financials · NETWORK_ERROR');
      await page.getByLabel('报告合成器').selectOption('real');
      await page.getByRole('button',{name:'生成新报告',exact:true}).click();
      await expect(page.getByRole('alert')).toContainText('MODEL_UNCONFIGURED');
      await expect(page.getByTestId('report-status')).toHaveAttribute('data-status','completed');
      assert.equal((await page.evaluate(()=>window.researchTrail.reportList())).length,1);
      await page.getByTestId('report-gaps').scrollIntoViewIfNeeded(); await screenshot(page,'step16-partial-gaps.png');
    }
  }finally{await instance.app.close();}
});

const root = resolve(__dirname, '..');
const desktop = resolve(root, 'apps/desktop');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.RESEARCH_TRAIL_RENDERER_URL;
delete env.RESEARCH_TRAIL_LAUNCHER_PID;
delete env.RESEARCH_TRAIL_PYTHON;

test('Step15 contextual entry, strategy plan, saved data and restart without reexecution', {timeout:60000}, async()=>{
  let instance=await launch(); const path=instance.databasePath;
  let saved,record;
  try {
    const page=instance.page; await waitForBackend(page);
    await page.evaluate(()=>window.researchTrail.selectSecurity('MSFT.US'));
    await page.getByRole('button',{name:'证券工作台',exact:true}).click();
    await expect(page.getByTestId('security-symbol')).toHaveText('MSFT.US');
    await page.getByRole('button',{name:'采集此股票研究数据',exact:true}).click();
    const panel=page.getByRole('region',{name:'研究采集工作台'});
    await expect(panel.getByLabel('研究股票')).toHaveValue('MSFT.US');
    await expect(panel.getByRole('radio')).toHaveCount(8);
    await expect(panel.getByTestId('research-plan').locator('summary')).toContainText('16 项');
    await panel.getByRole('radio',{name:/价值投资/}).check();
    await expect(panel.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await panel.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-status','collected');
    record=await page.evaluate(async()=>{const b=window.researchTrail;const rows=await b.researchRuns();return b.researchRun(rows[0].id);});
    assert.equal(record.symbol,'MSFT.US'); assert.equal(record.succeeded,4); assert.equal(record.plan.input.concurrency,4);
    saved=await page.evaluate(id=>window.researchTrail.researchData(id,'company.profile'),record.id);
    assert.equal(saved.result.data.symbol,'MSFT.US'); assert.equal(saved.result.provenance.mode,'simulated');
    await panel.getByRole('button',{name:'读取结果 company.profile',exact:true}).click();
    await expect(panel.getByTestId('research-data')).toContainText(saved.result.provenance.fetched_at);
    await panel.getByRole('heading',{name:/已保存任务/}).scrollIntoViewIfNeeded();
    await screenshot(page,'step15-collected-wide.png');
    await page.setViewportSize({width:600,height:680});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(page,'step15-collected-narrow.png');
    const denied=await page.evaluate(async id=>{
      try{await window.researchTrail.researchData(id,'../../private');return 'unexpected';}catch(e){return e.message;}
    },record.id);
    assert.match(denied,/采集能力标识无效/);
    assert.equal(await page.locator('vite-error-overlay').count(),0);
    await instance.app.close(); instance=await launch({RESEARCH_TRAIL_DB_PATH:path});
    await waitForBackend(instance.page);
    await instance.page.getByRole('button',{name:'研究采集',exact:true}).click();
    const restored=instance.page.getByRole('region',{name:'研究采集工作台'});
    await restored.getByRole('button',{name:'读取已保存任务',exact:true}).click();
    await expect(restored.getByTestId('research-run')).toHaveAttribute('data-run-id',record.id);
    assert.deepEqual(await instance.page.evaluate(id=>window.researchTrail.researchRun(id),record.id),record);
    assert.deepEqual(await instance.page.evaluate(id=>window.researchTrail.researchData(id,'company.profile'),record.id),saved);
    assert.equal((await instance.page.evaluate(()=>window.researchTrail.researchRuns())).length,1);
    const dbCounts=execFileSync(resolve(root,'services/backend/.venv/Scripts/python.exe'),['-c',
      'import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); print(c.execute("select count(*) from runs").fetchone()[0],c.execute("select count(*) from research_steps").fetchone()[0])',path],{env,windowsHide:true,encoding:'utf8'}).trim();
    assert.equal(dbCounts,'0 4');
  } finally {await instance.app.close();}
});

for(const scenario of ['research-partial','failure']) test(`Step15 ${scenario} keeps exact collection states through Python`,{timeout:45000},async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:scenario});
  const errors=[]; instance.page.on('pageerror',e=>errors.push(e.message));
  try {
    const page=instance.page; await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click();
    const panel=page.getByRole('region',{name:'研究采集工作台'});
    await panel.getByRole('radio',{name:/价值投资/}).check();
    await expect(panel.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await panel.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-status',scenario==='failure'?'failed':'partial');
    await expect(panel.getByTestId('research-status')).toContainText(scenario==='failure'?'已采集 0':'已采集 3');
    await expect(panel.locator('[data-capability="company.financials"]')).toContainText('NETWORK_ERROR');
    await expect(panel.getByRole('button',{name:/^读取结果/})).toHaveCount(scenario==='failure'?0:3);
    await panel.getByRole('heading',{name:/已保存任务/}).scrollIntoViewIfNeeded();
    await screenshot(page,`step15-${scenario}.png`);
    assert.deepEqual(errors,[]);
  } finally {await instance.app.close();}
});

test('Step15 whole cancellation retains three successes and discards real late fixture return',{timeout:45000},async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'research-delayed'});
  try {
    const page=instance.page; await waitForBackend(page);
    await page.getByRole('button',{name:'研究采集',exact:true}).click();
    const panel=page.getByRole('region',{name:'研究采集工作台'});
    await panel.getByRole('radio',{name:/价值投资/}).check();
    await expect(panel.getByTestId('research-plan').locator('summary')).toContainText('4 项');
    await panel.getByRole('button',{name:'开始采集',exact:true}).click();
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-status','fetching');
    await expect(panel.getByTestId('research-status')).toContainText('已采集 3');
    const id=await panel.getByTestId('research-run').getAttribute('data-run-id');
    await panel.getByRole('button',{name:'取消整项采集',exact:true}).click();
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-status','cancelled');
    const cancelled=await page.evaluate(id=>window.researchTrail.researchRun(id),id);
    assert.equal(cancelled.succeeded,3);assert.equal(cancelled.failed,1);
    await expect(panel.getByRole('button',{name:/^读取结果/})).toHaveCount(3);
    await screenshot(page,'step15-cancelled.png');
    // Admission reopens only after the actual delayed Python call has exited.
    await expect.poll(()=>page.evaluate(async()=>{
      if(window.step15Followup)return 'started';
      try{window.step15Followup=await window.researchTrail.startResearch({symbol:'AAPL.US',strategy:'growth'});return 'started';}
      catch(e){return e.message;}
    }),{timeout:8000}).toBe('started');
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.researchRun(id),id),cancelled);
    await expect(panel.getByTestId('research-run')).toHaveAttribute('data-run-id',id);
    assert.equal(await page.evaluate(async()=>{const rows=await window.researchTrail.researchRuns();return rows.length;}),2);
  }finally{await instance.app.close();}
});

test('Step15 late plan cannot overwrite newer selected strategy',{timeout:45000},async()=>{
  const instance=await launch();
  try {
    const page=instance.page;await waitForBackend(page);
    const plans=await page.evaluate(async()=>{
      const b=window.researchTrail; return Promise.all(['value','technical','comprehensive'].map(strategy=>b.researchPlan({symbol:'AAPL.US',strategy})));
    });
    await instance.app.evaluate(({ipcMain},plans)=>{
      globalThis.planStarts=[];globalThis.planArrivals=[]; ipcMain.removeHandler('research:plan');
      ipcMain.handle('research:plan',async(_event,input)=>{
        globalThis.planStarts.push(input.strategy);const index=input.strategy==='value'?0:input.strategy==='technical'?1:2;
        await new Promise(r=>setTimeout(r,index===0?700:10));globalThis.planArrivals.push(input.strategy);return plans[index];
      });
    },plans);
    await page.getByRole('button',{name:'研究采集',exact:true}).click();
    const panel=page.getByRole('region',{name:'研究采集工作台'});
    await expect(panel.getByTestId('research-plan')).toHaveAttribute('data-strategy','comprehensive');
    await panel.getByRole('radio',{name:/价值投资/}).check();
    await expect.poll(()=>instance.app.evaluate(()=>globalThis.planStarts)).toContain('value');
    await panel.getByRole('radio',{name:/技术面/}).check();
    await expect(panel.getByTestId('research-plan')).toHaveAttribute('data-strategy','technical');
    await expect.poll(()=>instance.app.evaluate(()=>globalThis.planArrivals)).toContain('value');
    await expect(panel.getByTestId('research-plan')).toHaveAttribute('data-strategy','technical');
    await expect(panel.getByTestId('research-plan').locator('summary')).toContainText('5 项');
    assert.equal((await page.evaluate(()=>window.researchTrail.researchRuns())).length,0);
  } finally {await instance.app.close();}
});

test('Step14 skill resources, disable, Agent refusal, persistence and shared availability', { timeout: 60000 }, async () => {
  let instance = await launch();
  const databasePath = instance.databasePath;
  const errors=[];
  const watch=page=>page.on('pageerror',e=>errors.push(e.message));
  try {
    watch(instance.page); await waitForBackend(instance.page);
    await instance.page.getByRole('button',{name:'能力与技能',exact:true}).click();
    let panel=instance.page.getByTestId('skills-panel');
    let technical=panel.getByTestId('skill-longbridge-technical');
    await expect(technical.getByTestId('skill-status')).toContainText('部分就绪');
    await expect(panel.getByTestId('skill-longbridge-market-data').getByTestId('skill-status')).toContainText('部分就绪');
    await technical.getByText('参考资料与来源',{exact:true}).click();
    await technical.getByRole('button',{name:'读取 references/technical.md',exact:true}).click();
    await expect(panel.getByTestId('skill-resource')).toContainText('longbridge-technical/references/technical.md');
    await screenshot(instance.page,'step14-resource-wide.png');
    await technical.getByRole('button',{name:'禁用技能',exact:true}).click();
    await expect(technical.getByTestId('skill-status')).toContainText('已禁用');
    await expect(panel.getByTestId('skill-resource')).toHaveCount(0);
    await assert.rejects(instance.page.evaluate(()=>window.researchTrail.readSkillResource('longbridge-technical','references/technical.md',{mode:'simulated',provider:'longbridge'})),/SKILL_DISABLED/);
    await assert.rejects(instance.page.evaluate(()=>window.researchTrail.readSkillResource('longbridge-technical','../private.md',{mode:'simulated',provider:'longbridge'})),/资料路径无效/);
    const r=await instance.page.evaluate(async()=>{const b=window.researchTrail;const s=await b.createSession('技能状态验收');return {sid:s.id,run:await b.startAgentRun(s.id,'技能 longbridge-technical 状态')};});
    await expect.poll(async()=> (await instance.page.evaluate(r=>window.researchTrail.getRun(r.sid,r.run.id),r)).status).toBe('completed');
    const messages=await instance.page.evaluate(r=>window.researchTrail.sessionMessages(r.sid),r);
    assert.ok(messages.some(m=>String(m.content).includes('SKILL_DISABLED')));
    const tools=await instance.page.evaluate(()=>window.researchTrail.capabilities({mode:'simulated',provider:'longbridge'}));
    assert.deepEqual(tools.filter(c=>c.tool_exposed).map(c=>c.id).sort(),['market.kline','market.quote','portfolio.risk','stocks.compare']);
    await instance.app.close(); instance=await launch({RESEARCH_TRAIL_DB_PATH:databasePath}); watch(instance.page); await waitForBackend(instance.page);
    await instance.page.getByRole('button',{name:'能力与技能',exact:true}).click();
    panel=instance.page.getByTestId('skills-panel'); technical=panel.getByTestId('skill-longbridge-technical');
    await expect(technical.getByTestId('skill-status')).toContainText('已禁用');
    await technical.getByRole('button',{name:'启用技能',exact:true}).click();
    await expect(technical.getByTestId('skill-status')).toContainText('部分就绪');
    await panel.getByLabel('技能数据模式').selectOption('real');
    await expect(technical.getByTestId('skill-status')).toContainText('不可用');
    await expect(technical).toContainText('UNCONFIGURED');
    await panel.getByLabel('技能数据模式').selectOption('simulated');
    await panel.getByLabel('技能数据提供商').selectOption('massive');
    await expect(panel.getByTestId('skill-longbridge-market-data').getByTestId('skill-status')).toContainText('不可用');
    await expect(panel.getByTestId('skill-longbridge-market-data')).toContainText('PROVIDER_UNSUPPORTED');
    await instance.page.setViewportSize({width:600,height:680});
    await screenshot(instance.page,'step14-unavailable-narrow.png');
    assert.equal(await instance.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
  } finally { await instance.app.close(); }
});

test('Step14 missing reference displayed and stale resource cannot reappear after navigation', { timeout: 45000 }, async()=>{
  const instance=await launch();
  try {
    await waitForBackend(instance.page);
    // UI branch injection only; actual missing-file rejection is covered through Python in test_skills.
    const entries=await instance.page.evaluate(()=>window.researchTrail.skills({mode:'simulated',provider:'longbridge'}));
    await instance.app.evaluate(({ipcMain},entries)=>{
      entries[0].status='unavailable'; entries[0].code='RESOURCE_MISSING'; entries[0].missing_resources=['references/missing.md'];
      ipcMain.removeHandler('skills:list'); ipcMain.handle('skills:list',()=>entries);
    },entries);
    await instance.page.getByRole('button',{name:'能力与技能',exact:true}).click();
    const panel=instance.page.getByTestId('skills-panel');
    await expect(panel).toContainText('缺少资料：references/missing.md');
    const missing=panel.getByTestId('skill-longbridge-market-data');
    await missing.getByText('参考资料与来源',{exact:true}).click();
    await expect(missing.getByRole('button',{name:'读取 SKILL.md',exact:true})).toBeDisabled();
    await screenshot(instance.page,'step14-missing-reference.png');
    const technical=panel.getByTestId('skill-longbridge-technical');
    await technical.getByText('参考资料与来源',{exact:true}).click();
    const resource=await instance.page.evaluate(()=>window.researchTrail.readSkillResource('longbridge-technical','references/technical.md',{mode:'simulated',provider:'longbridge'}));
    await instance.app.evaluate(({ipcMain},resource)=>{
      globalThis.skillArrived=false;
      ipcMain.removeHandler('skills:resource'); ipcMain.handle('skills:resource',async()=>{await new Promise(r=>setTimeout(r,500));globalThis.skillArrived=true;return resource;});
    },resource);
    await technical.getByRole('button',{name:'读取 references/technical.md',exact:true}).click();
    await instance.page.getByRole('button',{name:'模拟行情',exact:true}).click();
    await instance.page.getByRole('button',{name:'能力与技能',exact:true}).click();
    await expect.poll(()=>instance.app.evaluate(()=>globalThis.skillArrived)).toBe(true);
    await expect(instance.page.getByTestId('skills-panel').getByTestId('skill-resource')).toHaveCount(0);
  } finally { await instance.app.close(); }
});

function children(pid) {
  const result = execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `@(Get-CimInstance Win32_Process -Filter "ParentProcessId = ${Number(pid)}" | Where-Object { $_.Name -eq 'python.exe' } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress`,
  ], { encoding: 'utf8', windowsHide: true }).trim();
  const parsed = result ? JSON.parse(result) : [];
  return Array.isArray(parsed) ? parsed : [parsed];
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

const portfolioCSV='record_type,symbol,currency,quantity,cost_price,market_price,amount\nholding,AAPL.US,USD,2,100,120,\ncash,,USD,,,,100';

test('Step13 hand risk page and Agent share snapshot, four-stock comparison and narrow layout', { timeout:60000 }, async () => {
  const instance=await launch(); const errors=[];
  instance.page.on('pageerror',e=>errors.push(e.message));
  instance.page.on('console',e=>{if(['error','warning'].includes(e.type()))errors.push(e.text());});
  try {
    const page=instance.page; await waitForBackend(page);
    assert.equal(await page.title(),'研迹 · ResearchTrail'); assert.match(page.url(),/dist\/renderer\/index\.html$/);
    const authored=await page.evaluate(async()=>{
      const b=window.researchTrail; const p=(await b.portfolioList()).find(p=>p.kind==='manual');
      const draft=await b.previewPortfolio(p.id,'record_type,symbol,currency,quantity,cost_price,market_price,amount\nholding,AAPL.US,USD,1,100,600,\nholding,MSFT.US,USD,1,100,400,\ncash,,USD,,,,100');
      await b.confirmPortfolio(p.id,draft.draft_id); return p;
    });
    await page.getByRole('button',{name:'风险与对比',exact:true}).click();
    const panel=page.getByRole('region',{name:'风险与对比工作台'});
    await panel.getByLabel('风险组合').selectOption(authored.id);
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await expect(panel.getByTestId('risk-Top1权重-USD')).toHaveText('0.6');
    await expect(panel.getByTestId('risk-HHI集中度-USD')).toHaveText('0.52');
    const report=await page.evaluate(id=>window.researchTrail.portfolioRisk({portfolio_id:id}),authored.id);
    await expect(panel.getByTestId('risk-result')).toHaveAttribute('data-snapshot',report.snapshot_id);
    await panel.getByRole('heading',{name:'组合风险摘要'}).scrollIntoViewIfNeeded();
    await screenshot(page,'step13-risk-wide.png');
    const started=await page.evaluate(async id=>{const b=window.researchTrail; const s=await b.createSession('Step13风险共享验收'); return {sid:s.id,run:await b.startAgentRun(s.id,'分析组合'+id+'风险')};},authored.id);
    await expect.poll(()=>page.evaluate(async r=>(await window.researchTrail.getRun(r.sid,r.run.id)).status,started)).toBe('completed');
    const events=await page.evaluate(r=>window.researchTrail.runEvents(r.sid,r.run.id),started);
    assert.deepEqual(events.find(e=>e.type==='tool_result').payload.result.data.report,report);
    await page.getByRole('button',{name:'会话与事件',exact:true}).click();
    await expect(page.getByTestId('tool-result').filter({has:page.getByTestId('risk-result')})).toBeVisible();
    await expect(page.getByTestId('risk-result')).toHaveAttribute('data-snapshot',report.snapshot_id);
    await page.getByRole('button',{name:'风险与对比',exact:true}).click();
    await panel.getByRole('button',{name:'股票对比',exact:true}).click();
    await panel.getByLabel('对比股票（2—4只，空格分隔）').fill('AAPL.US MSFT.US NVDA.US TSLA.US');
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await expect(panel.getByTestId('compare-result')).toHaveAttribute('data-status','partial');
    await expect(panel.locator('td[data-metric="price"][data-symbol="AAPL.US"]')).toContainText('189.43');
    await expect(panel.locator('td[data-metric="return_1y"][data-symbol="AAPL.US"]')).toContainText('—');
    await expect(panel.getByRole('table',{name:'股票统一指标对比'}).locator('tbody tr')).toHaveCount(13);
    await page.setViewportSize({width:600,height:680});
    await panel.getByRole('heading',{name:'股票对比表'}).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(page,'step13-compare-narrow.png');
    await panel.getByLabel('对比股票（2—4只，空格分隔）').fill('AAPL.US AAPL.US');
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await expect(panel.getByRole('alert')).toContainText('不符合契约');
    await expect(panel.getByTestId('compare-result')).toHaveCount(0);
    assert.equal(await page.locator('vite-error-overlay').count(),0); assert.deepEqual(errors,[]);
  } finally {await instance.app.close();}
});

for(const fixtureCase of ['missing','failure']) test(`Step13 analytics explicit ${fixtureCase} inputs through Python`, {timeout:45000}, async()=>{
  const instance=await launch({RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:fixtureCase});
  try{
    const page=instance.page; await waitForBackend(page);
    await page.getByRole('button',{name:'风险与对比',exact:true}).click();
    const panel=page.getByRole('region',{name:'风险与对比工作台'});
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await expect(panel.getByTestId('risk-result')).toHaveAttribute('data-status','partial');
    await expect(panel.getByTestId('risk-Top1权重-USD')).toHaveText('1');
    await expect(panel.getByRole('table',{name:'USD波动'})).toContainText('—');
    await panel.getByRole('button',{name:'股票对比',exact:true}).click();
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await expect(panel.getByTestId('compare-result')).toHaveAttribute('data-status','missing');
    await expect(panel.locator('td[data-metric="price"][data-symbol="AAPL.US"]')).toContainText('—');
    await panel.getByText(/数据来源与读取状态/).click();
    if(fixtureCase==='failure') await expect(panel.getByTestId('compare-result')).toContainText('NETWORK_ERROR');
    await screenshot(page,`step13-${fixtureCase}.png`);
  }finally{await instance.app.close();}
});

test('Step13 stale risk result cannot replace selected comparison', {timeout:45000}, async()=>{
  const instance=await launch();
  try{
    const page=instance.page; await waitForBackend(page);
    const reports=await page.evaluate(async()=>{
      const b=window.researchTrail; const p=(await b.portfolioList()).find(p=>p.kind==='simulated');
      return [await b.portfolioRisk({portfolio_id:p.id}),await b.compareStocks({symbols:['AAPL.US','MSFT.US']})];
    });
    await instance.app.evaluate(({ipcMain},reports)=>{
      globalThis.analysisArrivals=[];
      for(const [channel,delay,index] of [['analytics:risk',700,0],['analytics:compare',10,1]]){
        ipcMain.removeHandler(channel); ipcMain.handle(channel,async()=>{await new Promise(r=>setTimeout(r,delay));globalThis.analysisArrivals.push(index);return reports[index];});
      }
    },reports);
    await page.getByRole('button',{name:'风险与对比',exact:true}).click();
    const panel=page.getByRole('region',{name:'风险与对比工作台'});
    await expect(panel.getByLabel('风险组合')).not.toHaveValue('');
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await panel.getByRole('button',{name:'股票对比',exact:true}).click();
    await panel.getByRole('button',{name:'读取/分析',exact:true}).click();
    await expect.poll(()=>instance.app.evaluate(()=>globalThis.analysisArrivals)).toEqual([1,0]);
    await expect(panel.getByTestId('compare-result')).toHaveAttribute('data-snapshot',reports[1].snapshot_id);
    await expect(panel.getByTestId('risk-result')).toHaveCount(0);
  }finally{await instance.app.close();}
});

test('Step12 portfolio file preview, confirm, duplicate/invalid, multi-currency and undo in real window', { timeout: 60000 }, async () => {
  const instance=await launch(); const errors=[];
  instance.page.on('pageerror',e=>errors.push(e.message));
  instance.page.on('console',e=>{ if (['error','warning'].includes(e.type())) errors.push(e.text()); });
  try {
    const page=instance.page;
    await waitForBackend(page);
    assert.equal(await page.title(),'研迹 · ResearchTrail'); assert.match(page.url(),/dist\/renderer\/index\.html$/);
    await page.getByRole('button',{name:'组合工作台',exact:true}).click();
    const panel=page.getByRole('region',{name:'组合工作台',exact:true});
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','empty');
    await screenshot(page,'portfolio-entry-wide.png');
    const original=await page.evaluate(async ()=>{
      const p=(await window.researchTrail.portfolioList()).find(p=>p.kind==='manual');
      return window.researchTrail.portfolioView(p.id);
    });
    await panel.locator('input[type=file]').setInputFiles({name:'authored-standard.csv',mimeType:'text/csv',buffer:Buffer.from(portfolioCSV)});
    await expect(panel.getByLabel('CSV内容')).toHaveValue(portfolioCSV);
    await panel.getByRole('button',{name:'预览导入',exact:true}).click();
    await expect(panel.getByTestId('portfolio-preview-values').getByTestId('assets-USD')).toHaveText('340');
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','empty');
    assert.deepEqual(await page.evaluate(id=>window.researchTrail.portfolioView(id),original.id),original);
    await panel.getByRole('region',{name:'导入预览',exact:true}).scrollIntoViewIfNeeded();
    await screenshot(page,'portfolio-preview-wide.png');
    await panel.getByRole('button',{name:'确认替换并保存',exact:true}).click();
    await expect(panel.getByTestId('portfolio-values').getByTestId('assets-USD')).toHaveText('340');
    await expect(panel.getByRole('table',{name:'组合持仓'})).toContainText('200');
    await expect(panel.getByRole('table',{name:'组合持仓'})).toContainText('240');
    await expect(panel.getByRole('table',{name:'组合持仓'})).toContainText('40');
    await panel.getByTestId('portfolio-values').evaluate(el=>el.scrollIntoView({block:'start'})); await screenshot(page,'portfolio-saved-wide.png');
    await panel.getByLabel('CSV内容').fill(portfolioCSV); await panel.getByRole('button',{name:'预览导入',exact:true}).click();
    await expect(panel.getByRole('region',{name:'导入预览'})).toContainText('DUPLICATE_IMPORT');
    await expect(panel.getByRole('button',{name:'确认替换并保存',exact:true})).toBeDisabled();
    await panel.getByRole('button',{name:'取消预览',exact:true}).click();
    await panel.getByLabel('CSV内容').fill(portfolioCSV.replace(',2,100,',',NaN,100,'));
    await panel.getByRole('button',{name:'预览导入',exact:true}).click();
    await expect(panel.getByRole('region',{name:'导入预览'})).toContainText('INVALID_ROW');
    await expect(panel.getByRole('button',{name:'确认替换并保存',exact:true})).toBeDisabled();
    await panel.getByRole('button',{name:'取消预览',exact:true}).click();
    await panel.locator('input[type=file]').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from([0xff,0xfe,0x80])});
    await expect(panel.getByRole('alert')).toContainText('UTF-8');
    const multi=portfolioCSV+'\nholding,700.HK,HKD,2,10,,\ncash,,HKD,,,,100';
    await panel.getByLabel('CSV内容').fill(multi); await panel.getByRole('button',{name:'预览导入',exact:true}).click();
    await expect(panel.getByTestId('portfolio-preview-values').getByTestId('assets-HKD')).toHaveText('—');
    await panel.getByRole('button',{name:'确认替换并保存',exact:true}).click();
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','partial');
    await expect(panel.getByTestId('assets-USD')).toHaveText('340'); await expect(panel.getByTestId('assets-HKD')).toHaveText('—');
    await instance.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(600,680));
    await panel.getByTestId('portfolio-values').evaluate(el=>el.scrollIntoView({block:'start'}));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(page,'portfolio-multicurrency-narrow.png');
    await panel.getByRole('button',{name:'撤销最近导入',exact:true}).click();
    await expect(panel.getByTestId('assets-HKD')).toHaveCount(0); await expect(panel.getByTestId('assets-USD')).toHaveText('340');
    assert.equal(await page.locator('vite-error-overlay').count(),0); assert.deepEqual(errors,[]);
  } finally { await instance.app.close(); }
});

test('Step12 portfolio survives application restart, account isolation and unconfigured real query', { timeout: 60000 }, async () => {
  const first=await launch(); let second; let firstClosed=false;
  try {
    await waitForBackend(first.page);
    const saved=await first.page.evaluate(async csv=>{
      const b=window.researchTrail; const p=(await b.portfolioList()).find(p=>p.kind==='manual');
      const d=await b.previewPortfolio(p.id,csv); return b.confirmPortfolio(p.id,d.draft_id);
    },portfolioCSV);
    const owned=children(first.pid); await first.app.close(); firstClosed=true;
    for (const pid of owned) await expect.poll(()=>alive(pid)).toBe(false);
    second=await launch({RESEARCH_TRAIL_DB_PATH:first.databasePath});
    await waitForBackend(second.page);
    assert.deepEqual(await second.page.evaluate(id=>window.researchTrail.portfolioView(id),saved.id),saved);
    await second.page.getByRole('button',{name:'组合工作台',exact:true}).click();
    const panel=second.page.getByRole('region',{name:'组合工作台',exact:true});
    await expect(panel.getByTestId('assets-USD')).toHaveText('340');
    await panel.getByRole('button',{name:/手算模拟组合/}).click();
    await expect(panel.getByTestId('portfolio-name')).toHaveText('手算模拟组合');
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','ready');
    await expect(panel.getByRole('button',{name:'撤销最近导入',exact:true})).toBeDisabled();
    await panel.getByRole('button',{name:/Longbridge只读组合/}).click();
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','unverified');
    await expect(panel.getByRole('button',{name:'预览导入',exact:true})).toHaveCount(0);
    await panel.getByRole('button',{name:'查询真实只读账户',exact:true}).click();
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','unconfigured');
    await expect(panel.getByRole('table',{name:'组合持仓'}).locator('tbody tr')).toHaveCount(0);
    await panel.getByTestId('portfolio-name').scrollIntoViewIfNeeded(); await screenshot(second.page,'portfolio-readonly-unconfigured.png');
    await panel.getByRole('button',{name:/^CSV组合/}).click();
    await expect(panel.getByTestId('assets-USD')).toHaveText('340');
    await panel.getByRole('button',{name:'撤销最近导入',exact:true}).click();
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','empty');
    await panel.getByLabel('新组合名称').fill('独立组合验收');
    await panel.getByRole('button',{name:'创建独立组合',exact:true}).click();
    await expect(panel.getByTestId('portfolio-name')).toHaveText('独立组合验收');
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','empty');
    const all=await second.page.evaluate(()=>window.researchTrail.portfolioList());
    assert.equal(new Set(all.map(p=>p.account_id)).size,4); assert.equal(all.length,4);
    await assert.rejects(second.page.evaluate(()=>window.researchTrail.portfolioView('../private')),/ID格式无效/);
  } finally { if (!firstClosed) await first.app.close(); if (second) await second.app.close(); }
});

test('Step12 late portfolio snapshot cannot overwrite selected account', { timeout: 45000 }, async () => {
  const instance=await launch();
  try {
    await waitForBackend(instance.page);
    const snapshots=await instance.page.evaluate(async()=>{
      const b=window.researchTrail; const infos=await b.portfolioList();
      return Promise.all(['manual','simulated'].map(kind=>b.portfolioView(infos.find(p=>p.kind===kind).id)));
    });
    await instance.app.evaluate(({ipcMain},snapshots)=>{
      globalThis.portfolioArrivals=[]; ipcMain.removeHandler('portfolios:view');
      ipcMain.handle('portfolios:view',async(_e,id)=>{
        await new Promise(resolve=>setTimeout(resolve,id===snapshots[0].id?600:10));
        globalThis.portfolioArrivals.push(id); return snapshots.find(p=>p.id===id);
      });
    },snapshots);
    await instance.page.getByRole('button',{name:'组合工作台',exact:true}).click();
    const panel=instance.page.getByRole('region',{name:'组合工作台',exact:true});
    await panel.getByRole('button',{name:/手算模拟组合/}).click();
    await expect(panel.getByTestId('portfolio-name')).toHaveText('手算模拟组合');
    await expect(panel.getByTestId('assets-USD')).toHaveText('340');
    await expect.poll(()=>instance.app.evaluate(()=>globalThis.portfolioArrivals)).toEqual([snapshots[1].id,snapshots[0].id]);
    await expect(panel.getByTestId('portfolio-values')).toHaveAttribute('data-status','ready');
    await expect(panel.getByTestId('assets-USD')).toHaveText('340');
  } finally { await instance.app.close(); }
});

for (const fixtureCase of ['success', 'missing', 'failure']) {
  test(`Step11 seven security views: ${fixtureCase} through Python provider chain`, { timeout: 60000 }, async () => {
    const instance = await launch({ RESEARCH_TRAIL_OFFLINE: '1', RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE: fixtureCase });
    const errors = [];
    instance.page.on('pageerror', e => errors.push(e.message));
    instance.page.on('console', e => { if (['warning','error'].includes(e.type())) errors.push(e.text()); });
    const labels = { watchlist: '自选列表', overview: '证券概览', quote: '行情', kline: 'K线', financials: '财务报表', news: '新闻', status: '市场状态' };
    try {
      await waitForBackend(instance.page);
      assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
      assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
      await instance.page.getByRole('button', { name: '证券工作台', exact: true }).click();
      const workspace = instance.page.getByRole('region', { name: '证券工作台', exact: true });
      const stockLabel = workspace.getByRole('button', { name: '选择证券 AAPL.US', exact: true }).locator('strong');
      await expect(stockLabel).toBeVisible();
      const stockBox = await stockLabel.boundingBox();
      assert.ok(stockBox.width >= 70 && stockBox.height < 30, '股票代码不能被移除按钮挤成竖排');
      for (const [view,label] of Object.entries(labels)) {
        await workspace.getByRole('button', { name: label, exact: true }).click();
        const result = workspace.getByTestId('security-view');
        await expect(result).toHaveAttribute('data-view',view);
        await expect(result).toHaveAttribute('data-status',fixtureCase === 'success' ? 'ready' : fixtureCase === 'missing' ? 'missing' : 'failed');
        await expect(workspace.getByTestId('security-symbol')).toHaveText('AAPL.US');
        if (fixtureCase === 'success') {
          await expect(result.getByTestId('security-source').first()).toContainText('模拟数据');
          if (view === 'quote') await expect(result).toContainText('189.43');
          if (view === 'overview') await expect(result).toContainText('—');
          if (view === 'kline') {
            const chart=result.getByTestId('chart-canvas');
            await expect(chart).toHaveAttribute('data-loaded-symbol','AAPL.US');
            await expect(chart).toHaveAttribute('data-loaded-close','189.43');
            assert.ok(await chart.locator('canvas').count() > 0);
          }
          if (view === 'financials') await expect(result.getByRole('table')).toContainText('模拟经营现金流');
          if (view === 'news') {
            const url='https://example.com/research-trail-simulated-news?symbol=AAPL.US';
            await expect(result.getByRole('link')).toHaveAttribute('href',url);
            await instance.app.evaluate(({shell}) => { globalThis.newsOpened=[]; globalThis.originalNewsOpen=shell.openExternal; shell.openExternal=async url => { globalThis.newsOpened.push(url); }; });
            await result.getByRole('link').click();
            await expect.poll(() => instance.app.evaluate(() => globalThis.newsOpened)).toEqual([url]);
            await assert.rejects(instance.page.evaluate(() => window.researchTrail.openNewsSource('javascript:alert(1)')), /新闻链接无效/);
            await assert.rejects(instance.page.evaluate(() => window.researchTrail.openNewsSource('file:///private')), /新闻链接无效/);
            await instance.app.evaluate(({shell}) => { shell.openExternal=globalThis.originalNewsOpen; });
          }
          if (view === 'status') await expect(result).toContainText('Closed');
        } else if (fixtureCase === 'missing') {
          await expect(result).toContainText('—');
          await expect(result).toContainText('缺失数据');
          assert.equal(await result.locator('canvas').count(),0);
        } else {
          await expect(result.getByRole('alert').first()).toContainText('NETWORK_ERROR');
          assert.equal(await result.locator('canvas').count(),0);
        }
        assert.equal(await instance.page.locator('vite-error-overlay').count(),0);
        await workspace.evaluate(el => el.scrollIntoView({block:'start'}));
        await screenshot(instance.page,`step11-${fixtureCase}-${view}-wide.png`);
      }
      await instance.app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(600,680));
      await workspace.getByRole('button', {name:'新闻',exact:true}).click();
      await expect(workspace.getByTestId('security-view')).toHaveAttribute('data-view','news');
      await expect(workspace.getByTestId('security-view')).toHaveAttribute('data-status',fixtureCase === 'success' ? 'ready' : fixtureCase === 'missing' ? 'missing' : 'failed');
      await workspace.evaluate(el => el.scrollIntoView({block:'start'}));
      assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
      await screenshot(instance.page,`step11-${fixtureCase}-news-compact.png`);
      await workspace.getByTestId('security-view').evaluate(el => el.scrollIntoView({block:'start'}));
      await screenshot(instance.page,`step11-${fixtureCase}-news-content-compact.png`);
      assert.deepEqual(errors,[]);
    } finally {
      const owned=children(instance.pid); await instance.app.close();
      await expect.poll(() => owned.every(pid => !alive(pid))).toBe(true);
    }
  });
}

test('Step11 context: late data, saved watchlist, navigation, source switch and restart', { timeout: 60000 }, async () => {
  const databasePath=resolve(mkdtempSync(resolve(tmpdir(),'research-trail-workspace-qa-')),'test.sqlite3');
  let instance=await launch({RESEARCH_TRAIL_DB_PATH:databasePath,RESEARCH_TRAIL_OFFLINE:'1',RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE:'delayed'});
  const errors=[];
  const watch=page => { page.on('pageerror',e => errors.push(e.message)); page.on('console',e => { if (['warning','error'].includes(e.type())) errors.push(e.text()); }); };
  watch(instance.page);
  try {
    await waitForBackend(instance.page);
    await instance.page.getByRole('button',{name:'证券工作台',exact:true}).click();
    let workspace=instance.page.getByRole('region',{name:'证券工作台',exact:true});
    await expect(workspace.getByRole('button',{name:'选择证券 NVDA.US',exact:true})).toBeEnabled();
    await expect(workspace.getByTestId('security-view-state')).toContainText('读取中');
    await workspace.getByRole('button',{name:'选择证券 NVDA.US',exact:true}).click();
    await expect(workspace.getByTestId('security-symbol')).toHaveText('NVDA.US');
    await expect(workspace.getByTestId('security-view')).toHaveAttribute('data-status','ready');
    await new Promise(resolve => setTimeout(resolve,1100)); // Controlled old AAPL profile response arrives after NVDA.
    await expect(workspace.getByTestId('security-block').first()).toContainText('NVDA.US');
    for (const label of ['行情','新闻','财务报表','市场状态','K线']) {
      await workspace.getByRole('button',{name:label,exact:true}).click();
      await expect(workspace.getByTestId('security-view')).toHaveAttribute('data-status','ready');
      await expect(workspace.getByTestId('security-symbol')).toHaveText('NVDA.US');
    }
    await expect(workspace.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol','NVDA.US');
    await workspace.getByLabel('证券K线周期',{exact:true}).selectOption('1w');
    await expect.poll(async () => JSON.parse(await workspace.getByTestId('chart-canvas').getAttribute('data-loaded-period') || '{}').type).toBe('week');
    await workspace.getByLabel('添加证券代码',{exact:true}).fill('700.HK');
    await workspace.getByRole('button',{name:'加入自选',exact:true}).click();
    await expect(workspace.getByRole('button',{name:'选择证券 700.HK',exact:true})).toBeVisible();
    await workspace.getByRole('button',{name:'自选列表',exact:true}).click();
    await expect(workspace.getByRole('button',{name:'下一组自选',exact:true})).toBeEnabled();
    await workspace.getByRole('button',{name:'下一组自选',exact:true}).click();
    await expect(workspace.getByTestId('security-view')).toContainText('NO_DATA');
    await instance.page.getByRole('button',{name:'会话与事件',exact:true}).click();
    await instance.page.getByRole('button',{name:'证券工作台',exact:true}).click();
    await expect(workspace.getByTestId('security-symbol')).toHaveText('NVDA.US');
    await workspace.getByLabel('证券提供商',{exact:true}).selectOption('massive');
    await workspace.getByRole('button',{name:'新闻',exact:true}).click();
    await expect(workspace.getByTestId('security-view')).toContainText('UNSUPPORTED_CAPABILITY');
    await expect(workspace.getByTestId('security-symbol')).toHaveText('NVDA.US');
    await workspace.getByLabel('证券数据模式',{exact:true}).selectOption('real');
    await expect(workspace.getByTestId('security-view-state')).toContainText('等待显式查询');
    assert.equal(await workspace.getByTestId('security-view').count(),0);
    await workspace.getByRole('button',{name:'行情',exact:true}).click();
    await workspace.getByRole('button',{name:'查询当前视图真实数据',exact:true}).click();
    await expect(workspace.getByTestId('security-view')).toContainText('PROVIDER_UNCONFIGURED');
    const saved=await instance.page.evaluate(() => window.researchTrail.workspaceState());
    const owned=children(instance.pid); await instance.app.close();
    await expect.poll(() => owned.every(pid => !alive(pid))).toBe(true);
    instance=await launch({RESEARCH_TRAIL_DB_PATH:databasePath,RESEARCH_TRAIL_OFFLINE:'1'}); watch(instance.page);
    await waitForBackend(instance.page);
    assert.deepEqual(await instance.page.evaluate(() => window.researchTrail.workspaceState()),saved);
    await instance.page.getByRole('button',{name:'证券工作台',exact:true}).click();
    workspace=instance.page.getByRole('region',{name:'证券工作台',exact:true});
    await expect(workspace.getByTestId('security-symbol')).toHaveText('NVDA.US');
    await expect(workspace.getByLabel('证券数据模式',{exact:true})).toHaveValue('simulated');
    await workspace.getByRole('button',{name:'移除证券 NVDA.US',exact:true}).click();
    await expect(workspace.getByTestId('security-symbol')).toHaveText('AAPL.US');
    await expect(workspace.getByRole('button',{name:'选择证券 NVDA.US',exact:true})).toHaveCount(0);
    await assert.rejects(instance.page.evaluate(() => window.researchTrail.securityPage({view:'portfolio'})),/不符合契约/);
    assert.deepEqual(errors,[]);
  } finally { await instance.app.close(); }
});

test('Step10 provider settings, simulated readonly data and isolated capability status', { timeout: 60000 }, async () => {
  const instance = await launch();
  const errors = [];
  instance.page.on('pageerror', e => errors.push(e.message));
  instance.page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.text()); });
  try {
    await waitForBackend(instance.page);
    await instance.page.getByRole('button', { name: '数据与只读账户', exact: true }).click();
    await expect(instance.page.getByTestId('provider-editor')).toContainText('未配置');
    await instance.page.getByRole('button', { name: '验证模拟查询', exact: true }).click();
    await expect(instance.page.getByTestId('provider-result')).toContainText('模拟数据');
    await expect(instance.page.getByTestId('provider-result')).toContainText('189.43');
    await expect(instance.page.getByTestId('provider-capabilities').getByText('market.quote', { exact: false })).toContainText('模拟通过');
    await expect(instance.page.getByTestId('provider-capabilities').getByText('market.kline', { exact: false })).toContainText('未验证');
    await screenshot(instance.page, 'step10-simulated-wide.png');
    await instance.page.getByLabel('查询模式', { exact: true }).selectOption('real');
    await expect(instance.page.getByTestId('provider-result')).toHaveCount(0);
    await instance.page.getByRole('button', { name: '执行一次真实只读查询', exact: true }).click();
    await expect(instance.page.getByTestId('provider-result')).toContainText('PROVIDER_UNCONFIGURED');
    await instance.page.getByRole('button', { name: '保存提供商配置', exact: true }).click();
    await expect(instance.page.getByTestId('provider-editor')).toContainText('已保存');
    await instance.page.getByRole('button', { name: '执行一次真实只读查询', exact: true }).click();
    await expect(instance.page.getByTestId('provider-result')).toContainText('CREDENTIAL_MISSING');
    // Test sentinel goes to native Windows vault, never a real vendor request.
    for (const label of ['Longbridge App Key', 'Longbridge App Secret', 'Longbridge Access Token']) await instance.page.getByLabel(label, { exact: true }).fill('test-only-provider-credential');
    await instance.page.getByRole('button', { name: '保存提供商凭证', exact: true }).click();
    await expect(instance.page.getByTestId('provider-editor')).toContainText('已保存（不回显）');
    await expect(instance.page.getByLabel('Longbridge App Key', { exact: true })).toHaveValue('');
    await instance.page.getByRole('button', { name: '删除提供商凭证', exact: true }).click();
    await expect(instance.page.getByTestId('provider-editor')).toContainText('未保存');
    await instance.page.getByLabel('数据提供商', { exact: true }).selectOption('longbridge-account');
    await expect(instance.page.getByTestId('provider-result')).toHaveCount(0);
    await expect(instance.page.getByTestId('provider-editor')).toContainText('未配置');
    await instance.page.getByLabel('查询模式', { exact: true }).selectOption('simulated');
    await instance.page.getByRole('button', { name: '验证模拟查询', exact: true }).click();
    await expect(instance.page.getByTestId('provider-result')).toContainText('模拟持仓');
    await expect(instance.page.getByTestId('provider-capabilities').getByText('account.assets', { exact: false })).toContainText('未验证');
    await screenshot(instance.page, 'step10-account-wide.png');
    await instance.page.getByLabel('数据提供商', { exact: true }).selectOption('massive');
    await instance.page.getByRole('button', { name: '验证模拟查询', exact: true }).click();
    await expect(instance.page.getByTestId('provider-result')).toContainText('模拟数据');
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 680));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(instance.page, 'step10-massive-compact.png');
    const profiles = await instance.page.evaluate(() => window.researchTrail.providerProfiles());
    assert.equal(profiles.find(p => p.provider === 'longbridge').credential_present, false);
    assert.equal(profiles.find(p => p.provider === 'massive').configured, false);
    assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
    assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await instance.page.evaluate(() => window.researchTrail.deleteProvider('longbridge')).catch(() => {});
    await instance.app.close();
  }
});

test('OpenAI compatible UI: simulated HTTP tool loop, limits, cancel and persisted identity', { timeout: 90000 }, async () => {
  const { createServer } = require('node:http');
  const work = mkdtempSync(resolve(tmpdir(), 'research-trail-model-qa-'));
  const databasePath = resolve(work, 'model.sqlite3');
  const sentinel = 'test-only-loopback-model-key';
  const requests = [], errors = [], serverErrors = [];
  let mode = 'success', blocked = false, disconnected = false;
  const server = createServer(async (req, res) => {
    try {
      if (req.url !== '/v1/chat/completions' || req.headers.authorization !== `Bearer ${sentinel}`) throw new Error('Unexpected model transport route/auth');
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw); requests.push(body);
      if (mode === 'blocked') {
        res.writeHead(200, { 'content-type': 'application/json', 'content-length': '500' }); res.flushHeaders();
        blocked = true; res.on('close', () => { disconnected = true; }); return;
      }
      const tool = body.messages.at(-1).role === 'tool';
      if (tool) {
        const result = JSON.parse(body.messages.at(-1).content);
        assert.equal(result.data.quote.last_price, 189.43); assert.equal(result.data.data_label, '模拟数据');
      }
      const calls = mode === 'limit' || !tool;
      const message = calls ? { role: 'assistant', content: null, tool_calls: [{ id: `call_${requests.length}`, type: 'function',
        function: { name: 'market_quote', arguments: '{"symbol":"AAPL.US"}' } }] } :
        { role: 'assistant', content: '模型协议模拟响应：AAPL.US 189.43 USD，模拟数据，非实时行情。' };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ finish_reason: calls ? 'tool_calls' : 'stop', message }] }));
    } catch (error) { serverErrors.push(error.message); res.writeHead(500); res.end('Fixture protocol failed'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
  const watch = page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  };
  watch(instance.page);
  try {
    await waitForBackend(instance.page);
    assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
    assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
    await screenshot(instance.page, 'step9-initial.png');
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByLabel('会话标题', { exact: true }).fill('第9步模拟协议');
    await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('第9步模拟协议');
    await instance.page.getByLabel('运行模型', { exact: true }).selectOption('openai_agent');
    await instance.page.getByLabel('测试输入', { exact: true }).fill('查询AAPL.US行情');
    await instance.page.getByRole('button', { name: '运行真实模型', exact: true }).click();
    await expect(instance.page.getByTestId('run-error')).toContainText('MODEL_UNCONFIGURED');
    assert.equal(requests.length, 0);
    await instance.page.getByRole('button', { name: '设置与诊断', exact: true }).click();
    const model = instance.page.getByTestId('connection-model');
    await model.getByLabel('服务地址').fill(`http://127.0.0.1:${server.address().port}/v1`);
    await model.getByLabel('模型名称').fill('loopback-protocol-fixture');
    await model.getByLabel('工具轮数').fill('1');
    await model.getByLabel('整体超时').fill('10');
    await model.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('待测试');
    await model.getByLabel('新凭证').fill(sentinel);
    await model.getByRole('button', { name: '保存凭证', exact: true }).click();
    await expect(model.getByLabel('新凭证')).toHaveValue('');
    await expect(model).toContainText('已保存（不回显）');
    await screenshot(instance.page, 'step9-model-settings.png');
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByLabel('运行模型', { exact: true }).selectOption('openai_agent');
    const execute = async () => {
      await instance.page.getByLabel('测试输入', { exact: true }).fill('查询AAPL.US行情');
      await instance.page.getByRole('button', { name: '运行真实模型', exact: true }).click();
    };
    await execute();
    await expect(instance.page.getByTestId('run-state')).toContainText('OpenAI兼容／真实模型 · 已完成');
    await expect(instance.page.getByTestId('message-history')).toContainText('模型协议模拟响应');
    await expect(instance.page.getByTestId('tool-result')).toContainText('189.43');
    assert.equal(requests.length, 2);
    await instance.page.getByTestId('run-state').scrollIntoViewIfNeeded();
    await screenshot(instance.page, 'step9-loopback-completed.png');
    const ids = await instance.page.evaluate(() => window.researchTrail.listSessions());
    const sid = ids[0].id;
    const snapshot = await instance.page.evaluate(id => window.researchTrail.sessionSnapshot(id), sid);
    const successful = snapshot.runs.find(run => run.status === 'completed');
    assert.equal(successful.kind, 'openai_agent');
    assert.equal(successful.model_label, 'OpenAI兼容／真实模型');
    assert.deepEqual(snapshot.events.filter(e => e.run_id === successful.id && e.type.startsWith('tool_')).map(e => e.type), ['tool_started', 'tool_result']);
    mode = 'limit'; await execute();
    await expect(instance.page.getByTestId('run-error')).toContainText('TOOL_LIMIT');
    assert.equal(requests.length, 4);
    mode = 'blocked'; await execute();
    await expect.poll(() => blocked).toBe(true);
    await instance.page.getByRole('button', { name: '取消运行', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('已取消');
    await expect.poll(() => disconnected).toBe(true);
    await screenshot(instance.page, 'step9-cancelled.png');
    await instance.page.getByLabel('运行模型', { exact: true }).selectOption('fake_agent');
    await instance.page.getByLabel('测试输入', { exact: true }).fill('查询AAPL.US行情');
    await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('规则演示／假模型 · 已完成');
    assert.equal(requests.length, 5);
    const before = await instance.page.evaluate(id => window.researchTrail.sessionSnapshot(id), sid);
    assert.equal(JSON.stringify(before).includes(sentinel), false);
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(instance.page, 'step9-compact.png');
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    await instance.app.close();
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath }); watch(instance.page);
    await waitForBackend(instance.page);
    assert.deepEqual(await instance.page.evaluate(id => window.researchTrail.sessionSnapshot(id), sid), before);
    assert.equal(requests.length, 5);
    assert.deepEqual(errors, []); assert.deepEqual(serverErrors, []);
  } finally {
    try { await instance.page.evaluate(() => window.researchTrail.deleteConnection('model')); } catch {}
    await instance.app.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    execFileSync(resolve(root, 'services/backend/.venv/Scripts/python.exe'), ['-c',
      'import sqlite3,sys; from hashlib import sha256; from research_trail.credentials import WindowsCredentialVault; from pathlib import Path; p=Path(sys.argv[1]).resolve(); n=sha256(str(p).casefold().encode()).hexdigest()[:32]; c=sqlite3.connect(p); refs=[r[0] for r in c.execute("select credential_ref from connections where credential_ref is not null")]; c.close(); v=WindowsCredentialVault(); [v.delete("ResearchTrail/"+n+"/"+r) for r in refs]', databasePath],
      { cwd: resolve(root, 'services/backend'), env, windowsHide: true });
  }
});

test('settings: independent fake health, native credentials, profile, redacted export and restart', { timeout: 90000 }, async () => {
  const work = mkdtempSync(resolve(tmpdir(), 'research-trail-settings-qa-'));
  const databasePath = resolve(work, 'settings.sqlite3');
  const sentinel = 'test-only-desktop-credential-no-real-service';
  const reportPath = resolve(work, 'diagnostics.json');
  let instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    page.on('dialog', dialog => void dialog.accept());
  };
  watch(instance.page);
  try {
    await waitForBackend(instance.page);
    assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
    assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
    await instance.page.getByRole('button', { name: '设置与诊断', exact: true }).click();
    const model = instance.page.getByTestId('connection-model');
    await expect(model.getByTestId('connection-status')).toHaveText('未配置');
    await screenshot(instance.page, 'step8-overview.png');
    await model.getByLabel('服务地址').fill('https://203.0.113.1/v1');
    await model.getByLabel('模型名称').fill('demo-model');
    await model.getByLabel('测试前要求已保存凭证').check();
    await model.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('已失效');
    await model.getByLabel('新凭证').fill(sentinel);
    await model.getByRole('button', { name: '保存凭证', exact: true }).click();
    await expect(model).toContainText('已保存（不回显）');
    await expect(model.getByLabel('新凭证')).toHaveValue('');
    await model.getByRole('button', { name: '测试假连接', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('假连接成功');
    await model.getByLabel('模型名称').fill('demo-model-updated');
    await expect(model.getByRole('button', { name: '测试假连接', exact: true })).toBeDisabled();
    await model.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('已失效');
    await model.getByRole('button', { name: '测试假连接', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('假连接成功');
    await instance.page.getByRole('button', { name: '重新读取状态', exact: true }).click();
    await expect(model.getByTestId('connection-status')).toHaveText('假连接成功');
    const before = await instance.page.evaluate(() => window.researchTrail.connections());
    assert.equal(before.filter(row => row.kind !== 'model').every(row => row.status === 'unconfigured'), true);
    assert.equal(JSON.stringify(before).includes(sentinel), false);
    assert.equal(await instance.page.evaluate(value => Object.values(sessionStorage).some(item => item.includes(value)), sentinel), false);
    await screenshot(instance.page, 'step8-model.png');
    await instance.page.getByRole('button', { name: '连接设置', exact: true }).click();
    for (const [kind, result, status] of [['market', 'failure', '失败'], ['account', 'invalid', '已失效']]) {
      const card = instance.page.getByTestId(`connection-${kind}`);
      await expect(card.getByTestId('connection-status')).toHaveText('未配置');
      await card.getByLabel('假连接结果').selectOption(result);
      await card.getByRole('button', { name: '保存配置', exact: true }).click();
      await expect(card.getByTestId('connection-status')).toHaveText('待测试');
      await card.getByRole('button', { name: '测试假连接', exact: true }).click();
      await expect(card.getByTestId('connection-status')).toHaveText(status);
    }
    await expect(instance.page.getByTestId('connection-skills').getByTestId('connection-status')).toHaveText('未配置');
    await expect(instance.page.getByTestId('connection-runtime').getByTestId('connection-status')).toHaveText('未配置');
    await screenshot(instance.page, 'step8-connections.png');
    await instance.page.getByRole('button', { name: '个人资料', exact: true }).click();
    await instance.page.getByLabel('显示名称').fill('第8步研究者');
    await instance.page.getByLabel('研究偏好').selectOption('cautious');
    await instance.page.getByRole('button', { name: '保存资料', exact: true }).click();
    await expect(instance.page.getByRole('status')).toContainText('个人资料已保存');
    await instance.page.getByRole('button', { name: '诊断', exact: true }).click();
    await instance.page.getByRole('button', { name: '读取诊断', exact: true }).click();
    await expect(instance.page.getByTestId('diagnostics-json')).toContainText('DEMO_FAILED');
    const diagnostic = await instance.page.getByTestId('diagnostics-json').innerText();
    for (const value of [sentinel, '203.0.113.1', '第8步研究者', 'credential_ref', databasePath]) assert.equal(diagnostic.includes(value), false);
    await instance.app.evaluate(({ dialog }, path) => {
      globalThis.originalSettingsSaveDialog = dialog.showSaveDialog;
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
    }, reportPath);
    await instance.page.getByRole('button', { name: '导出脱敏诊断', exact: true }).click();
    await expect(instance.page.getByRole('status')).toContainText('脱敏诊断已保存');
    const file = readFileSync(reportPath, 'utf8');
    assert.equal(JSON.parse(file).real_requests_sent, false);
    for (const value of [sentinel, '203.0.113.1', '第8步研究者', databasePath]) assert.equal(file.includes(value), false);
    await instance.app.evaluate(({ dialog }) => { dialog.showSaveDialog = globalThis.originalSettingsSaveDialog; });
    await screenshot(instance.page, 'step8-diagnostics.png');
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    await instance.page.getByRole('button', { name: '连接设置', exact: true }).click();
    await expect(instance.page.getByRole('button', { name: '连接设置', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(instance.page.getByTestId('connection-market')).toBeVisible();
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await screenshot(instance.page, 'step8-compact.png');
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    const saved = await instance.page.evaluate(() => window.researchTrail.connections());
    const owned = children(instance.pid);
    await instance.app.close();
    await expect.poll(() => owned.every(pid => !alive(pid))).toBe(true);
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
    watch(instance.page);
    await waitForBackend(instance.page);
    assert.deepEqual(await instance.page.evaluate(() => window.researchTrail.connections()), saved);
    assert.equal((await instance.page.evaluate(() => window.researchTrail.profile())).display_name, '第8步研究者');
    await instance.page.getByRole('button', { name: '设置与诊断', exact: true }).click();
    await expect(instance.page.getByTestId('connection-model')).toContainText('已保存（不回显）');
    await instance.page.getByTestId('connection-model').getByRole('button', { name: '删除凭证', exact: true }).click();
    await expect(instance.page.getByTestId('connection-model').getByTestId('connection-status')).toHaveText('已失效');
    await instance.page.getByTestId('connection-model').getByRole('button', { name: '删除配置', exact: true }).click();
    await expect(instance.page.getByTestId('connection-model').getByTestId('connection-status')).toHaveText('未配置');
    await assert.rejects(instance.page.evaluate(() => window.researchTrail.testConnection('../health')), /未知连接类别/);
    await instance.page.getByRole('button', { name: '个人资料', exact: true }).click();
    await instance.page.getByRole('button', { name: '删除资料', exact: true }).click();
    await expect(instance.page.getByLabel('显示名称')).toHaveValue('');
    assert.deepEqual(errors, []);
  } finally {
    // Remove only this test's generated system-vault entry, never enumerate other apps.
    try { await instance.page.evaluate(() => window.researchTrail.deleteConnection('model')); } catch {}
    await instance.app.close();
    const python = resolve(root, 'services/backend/.venv/Scripts/python.exe');
    execFileSync(python, ['-c', 'import sqlite3,sys; from hashlib import sha256; from research_trail.credentials import WindowsCredentialVault; from pathlib import Path; p=Path(sys.argv[1]).resolve(); n=sha256(str(p).casefold().encode()).hexdigest()[:32]; c=sqlite3.connect(p); refs=[r[0] for r in c.execute("select credential_ref from connections where credential_ref is not null")]; c.close(); v=WindowsCredentialVault(); [v.delete("ResearchTrail/"+n+"/"+r) for r in refs]', databasePath], { cwd: resolve(root, 'services/backend'), env, windowsHide: true });
  }
});
async function screenshot(page, name) {
  if (!process.env.RESEARCH_TRAIL_QA_DIR) return;
  mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
  await page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, name), fullPage: false, animations: 'disabled' });
}
async function launch(extraEnv = {}) {
  const databasePath = extraEnv.RESEARCH_TRAIL_DB_PATH || resolve(mkdtempSync(resolve(tmpdir(), 'research-trail-qa-')), 'test.sqlite3');
  // Playwright deliberately removes NODE_OPTIONS from Electron's environment.
  // Load the same offline guard explicitly, before the application entry point.
  const args = env.RESEARCH_TRAIL_OFFLINE === '1' ? ['-r', resolve(root, 'scripts/offline/electron.cjs'), desktop] : [desktop];
  const app = await electron.launch({ args, cwd: root, env: { ...env, RESEARCH_TRAIL_DB_PATH: databasePath, ...extraEnv } });
  const page = await app.firstWindow();
  return { app, page, pid: await app.evaluate(() => process.pid), databasePath };
}

test('real window, isolated bridge, health, interruption/retry, scoped shutdown', { timeout: 90000 }, async () => {
  const first = await launch();
  let second;
  let firstClosed = false;
  try {
    const errors = [];
    first.page.on('pageerror', (error) => errors.push(error.message));
    await waitForBackend(first.page);
    if (process.env.RESEARCH_TRAIL_OFFLINE === '1') {
      assert.equal(await first.app.evaluate(() => globalThis[Symbol.for('research-trail.offline')]), true);
      assert.equal(await first.app.evaluate(() => {
        const socket = new (process.getBuiltinModule('node:net').Socket)();
        try { socket.connect({ host: '203.0.113.1', port: 443 }); return false; }
        catch (error) { return error.message.includes('Offline verification'); }
        finally { socket.destroy(); }
      }), true);
      assert.equal(await first.app.evaluate(async ({ BrowserWindow }) => {
        try {
          await BrowserWindow.getAllWindows()[0].webContents.session.fetch('http://203.0.113.1/');
          return false;
        } catch (error) { return error.message.includes('ERR_BLOCKED_BY_CLIENT'); }
      }), true);
    }
    assert.equal(await first.page.title(), '研迹 · ResearchTrail');
    assert.equal(await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true);
    assert.match(first.page.url(), /dist\/renderer\/index\.html$/);
    assert.deepEqual(await first.page.evaluate(() => ({
      bridge: Object.keys(window.researchTrail).sort(),
      node: typeof window.require,
      process: typeof window.process,
    })), { bridge: ['checkHealth', 'marketSnapshot', 'marketSymbols', 'onStatus', 'retryBackend', 'status',
      'listSessions', 'createSession', 'getSession', 'deleteSession', 'sessionMessages', 'sessionRuns', 'sessionSnapshot', 'startRun', 'startAgentRun', 'cancelRun', 'getRun', 'runEvents', 'subscribeRun',
      'connections', 'saveConnection', 'deleteConnection', 'saveCredential', 'deleteCredential', 'testConnection', 'profile', 'saveProfile', 'deleteProfile', 'diagnostics', 'exportDiagnostics',
      'providerProfiles', 'saveProvider', 'deleteProvider', 'saveProviderCredential', 'deleteProviderCredential', 'providerCapabilities', 'queryProvider',
      'workspaceState', 'addWatch', 'removeWatch', 'selectSecurity', 'securityPage', 'openNewsSource',
      'screeningTasks', 'startScreening', 'screeningRuns', 'screeningRun', 'cancelScreening', 'screeningEvidence',
      'calendarSources','refreshCalendar','calendarHistory','calendarView','calendarOriginal',
      'thesisList', 'createThesis', 'thesis', 'thesisVersion', 'editThesis', 'evaluateThesis', 'judgeThesis', 'thesisReview',
      'reportList', 'generateReport', 'report', 'cancelReport', 'reportEvidence', 'exportReport', 'reportDiff',
      'researchCheckpoint', 'resumeResearch', 'restartResearch', 'abandonResearch',
      'capabilities', 'skills', 'setSkillEnabled', 'readSkillResource', 'researchStrategies', 'researchPlan', 'researchRuns', 'startResearch', 'researchRun', 'cancelResearch', 'researchData', 'portfolioRisk', 'compareStocks', 'portfolioList', 'createPortfolio', 'portfolioView', 'previewPortfolio', 'confirmPortfolio', 'undoPortfolio', 'refreshPortfolio'].sort(), node: 'undefined', process: 'undefined' });
    assert.deepEqual(await first.app.evaluate(({ BrowserWindow }) => {
      const pref = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: pref.sandbox, nodeIntegration: pref.nodeIntegration, contextIsolation: pref.contextIsolation };
    }), { sandbox: true, nodeIntegration: false, contextIsolation: true });
    const original = children(first.pid);
    assert.equal(original.length, 1);
    const oldState = await first.page.evaluate(() => window.researchTrail.status());
    await first.page.getByRole('button', { name: '重新检查' }).click();
    await expect.poll(() => first.page.evaluate(() => window.researchTrail.status().then((s) => s.checkedAt))).not.toBe(oldState.checkedAt);
    await screenshot(first.page, 'healthy.png');
    assert.equal(await first.page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);

    process.kill(original[0]); // Only the Python PID owned by this test instance.
    await expect(first.page.getByRole('heading', { name: '连接未就绪' })).toBeVisible();
    await screenshot(first.page, 'interrupted.png');
    await first.page.getByRole('button', { name: '重试启动' }).click();
    await waitForBackend(first.page);
    const replacement = children(first.pid);
    assert.equal(replacement.length, 1);
    assert.notEqual(replacement[0], original[0]);

    second = await launch();
    await waitForBackend(second.page);
    const unrelated = children(second.pid);
    assert.equal(unrelated.length, 1);
    await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    await expect.poll(() => alive(replacement[0])).toBe(false);
    await expect.poll(() => alive(first.pid)).toBe(false);
    firstClosed = true;
    assert.equal(alive(unrelated[0]), true);
    const healthy = await second.page.evaluate(() => window.researchTrail.checkHealth());
    assert.equal(healthy.phase, 'healthy');
    await second.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    await screenshot(second.page, 'compact.png');
    assert.equal(await second.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await second.app.close();
    await expect.poll(() => alive(unrelated[0])).toBe(false);
    second = undefined;
  } finally {
    if (!firstClosed) await first.app.close();
    if (second) await second.app.close();
  }
});

test('missing Python startup explains failure and retry remains honest', { timeout: 45000 }, async () => {
  const instance = await launch({ RESEARCH_TRAIL_PYTHON: resolve(root, 'missing-python-for-test.exe') });
  try {
    await expect(instance.page.getByText(/未找到 Python 可执行文件/)).toBeVisible();
    await screenshot(instance.page, 'startup-failure.png');
    await instance.page.getByRole('button', { name: '重试启动' }).click();
    await expect(instance.page.getByText(/未找到 Python 可执行文件/)).toBeVisible();
    assert.equal(children(instance.pid).length, 0);
  } finally { await instance.app.close(); }
});

test('Electron forced exit closes owner pipe and backend exits', { timeout: 45000 }, async () => {
  const instance = await launch();
  try {
    await waitForBackend(instance.page);
    const owned = children(instance.pid);
    assert.equal(owned.length, 1);
    process.kill(instance.pid);
    await expect.poll(() => alive(owned[0]), { timeout: 10000 }).toBe(false);
  } finally { if (alive(instance.pid)) await instance.app.close(); }
});

test('Vite development renderer, CSP, bridge and hot reload', { timeout: 45000 }, async () => {
  const desktopRequire = createRequire(resolve(desktop, 'package.json'));
  const { createServer } = await import(pathToFileURL(desktopRequire.resolve('vite')).href);
  const server = await createServer({ root: desktop, configFile: resolve(desktop, 'vite.config.ts'), server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  let instance;
  try {
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    instance = await launch({ RESEARCH_TRAIL_RENDERER_URL: url, RESEARCH_TRAIL_LAUNCHER_PID: String(process.pid) });
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    instance.page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await waitForBackend(instance.page);
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'AAPL.US');
    assert.equal(instance.page.url(), url);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    assert.equal(await instance.page.evaluate(() => getComputedStyle(document.documentElement).fontFamily.includes('Microsoft YaHei')), true);
    const owned = children(instance.pid);
    assert.equal(owned.length, 1);
    server.ws.send({ type: 'full-reload' });
    await waitForBackend(instance.page);
    await expect(instance.page.getByRole('button', { name: '重新检查' })).toBeEnabled();
    assert.deepEqual(children(instance.pid), owned);
    await screenshot(instance.page, 'development.png');
    assert.deepEqual(errors, []);
    await instance.app.close();
    await expect.poll(() => alive(owned[0])).toBe(false);
    instance = undefined;
  } finally {
    if (instance) await instance.app.close();
    await server.close();
  }
});

test('four fixture stocks, actual canvas loader, unknown symbol, repeat provenance and shutdown', { timeout: 60000 }, async () => {
  const instance = await launch();
  let closed = false;
  try {
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    const expected = { 'AAPL.US': '189.43', 'NVDA.US': '880.12', 'MSFT.US': '412.60', 'TSLA.US': '175.22' };
    await waitForBackend(instance.page);
    for (const [symbol, price] of Object.entries(expected)) {
      await instance.page.getByRole('button', { name: symbol, exact: true }).click();
      await expect(instance.page.getByTestId('quote-card')).toHaveAttribute('data-symbol', symbol);
      await expect(instance.page.getByTestId('quote-price')).toHaveText(price);
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', symbol);
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-close', String(Number(price)));
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-count', '10');
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-visible-from', '0');
      await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-visible-to', '10');
      const geometry = await instance.page.getByTestId('chart-canvas').evaluate((el) => ({
        x: Number(el.dataset.lastX), y: Number(el.dataset.lastY), width: el.clientWidth, height: el.clientHeight,
      }));
      assert.ok(geometry.x >= 0 && geometry.x < geometry.width && geometry.y >= 0 && geometry.y < geometry.height, JSON.stringify(geometry));
      assert.ok(await instance.page.getByTestId('chart-canvas').locator('canvas').count() > 0);
      await expect(instance.page.getByTestId('market-time')).toHaveText('2024-01-16 21:00:00.000 UTC');
    }
    const before = await instance.page.getByTestId('fetched-at').textContent();
    await instance.page.getByRole('button', { name: '重新查询', exact: true }).click();
    await expect(instance.page.getByTestId('fetched-at')).not.toHaveText(before);
    await expect(instance.page.getByTestId('quote-price')).toHaveText('175.22');
    await expect(instance.page.getByTestId('market-time')).toHaveText('2024-01-16 21:00:00.000 UTC');
    await expect(instance.page.getByText('模拟数据 · 固定示例')).toBeVisible();
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-visible-to', '10');
    await instance.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'market-tsla.png'), fullPage: true });
    }
    await instance.page.getByLabel('查询代码', { exact: true }).fill('ZZZZ.US');
    await instance.page.getByRole('button', { name: '查询', exact: true }).click();
    await expect(instance.page.getByRole('alert')).toContainText('未知股票代码：ZZZZ.US');
    assert.equal(await instance.page.getByTestId('quote-card').count(), 0);
    assert.equal(await instance.page.getByTestId('chart-canvas').count(), 0);
    await screenshot(instance.page, 'market-unknown.png');
    assert.equal((await instance.page.evaluate(() => window.researchTrail.marketSnapshot('../health'))).error.code, 'INVALID_SYMBOL');
    assert.equal((await instance.page.evaluate(() => window.researchTrail.marketSnapshot({ url: '/health' }))).error.code, 'INVALID_SYMBOL');
    await instance.page.getByRole('button', { name: 'AAPL.US', exact: true }).click();
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'market-compact.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
    const owned = children(instance.pid);
    await instance.app.close(); closed = true;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (!closed) await instance.app.close(); }
});

test('late earlier response cannot overwrite the latest stock selection', { timeout: 45000 }, async () => {
  const instance = await launch();
  try {
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    const samples = await instance.page.evaluate(async () => ({
      aapl: await window.researchTrail.marketSnapshot('AAPL.US'),
      tsla: await window.researchTrail.marketSnapshot('TSLA.US'),
    }));
    // Test-only main-process delay; production code and real backend data remain unchanged.
    await instance.app.evaluate(({ ipcMain }, samples) => {
      globalThis.marketTestCompleted = [];
      ipcMain.removeHandler('market:snapshot');
      ipcMain.handle('market:snapshot', async (_event, symbol) => {
        await new Promise((resolve) => setTimeout(resolve, symbol === 'AAPL.US' ? 600 : 10));
        globalThis.marketTestCompleted.push(symbol);
        return symbol === 'AAPL.US' ? samples.aapl : samples.tsla;
      });
    }, samples);
    await instance.page.getByRole('button', { name: 'AAPL.US', exact: true }).click();
    await instance.page.getByRole('button', { name: 'TSLA.US', exact: true }).click();
    await expect(instance.page.getByTestId('quote-price')).toHaveText('175.22');
    await expect.poll(() => instance.app.evaluate(() => globalThis.marketTestCompleted)).toEqual(['TSLA.US', 'AAPL.US']);
    await expect(instance.page.getByTestId('quote-card')).toHaveAttribute('data-symbol', 'TSLA.US');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'TSLA.US');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-close', '175.22');
  } finally { await instance.app.close(); }
});

test('persistent sessions, scoped messages, SSE replay, restart and deletion', { timeout: 90000 }, async () => {
  let instance = await launch();
  const databasePath = instance.databasePath;
  const errors = [];
  try {
    instance.page.on('pageerror', (e) => errors.push(e.message));
    await waitForBackend(instance.page);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    const createAndRun = async (title, input) => {
      await instance.page.getByLabel('会话标题', { exact: true }).fill(title);
      await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
      await expect(instance.page.getByTestId('current-session')).toHaveText(title);
      await instance.page.getByLabel('测试输入', { exact: true }).fill(input);
      await instance.page.getByRole('button', { name: '启动固定测试运行', exact: true }).click();
      await expect(instance.page.getByTestId('message-history')).toContainText(input);
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    };
    await createAndRun('甲会话', '只属于甲的输入');
    await createAndRun('乙会话', '只属于乙的输入');
    await expect(instance.page.getByTestId('message-history')).not.toContainText('只属于甲的输入');
    const records = await instance.page.evaluate(() => window.researchTrail.listSessions());
    const a = records.find((s) => s.title === '甲会话'), b = records.find((s) => s.title === '乙会话');
    const runA = (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), a.id))[0];
    const runB = (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), b.id))[0];
    assert.equal(runA.kind, 'fixture');
    const tail = await instance.page.evaluate(({ id, run }) => window.researchTrail.runEvents(id, run, 4), { id: a.id, run: runA.id });
    assert.deepEqual(tail.map((e) => e.sequence), [5, 6, 7]);
    await assert.rejects(instance.page.evaluate(({ id, run }) => window.researchTrail.runEvents(id, run), { id: b.id, run: runA.id }), /不属于当前会话/);
    await assert.rejects(instance.page.evaluate(() => window.researchTrail.getSession('../health')), /ID格式无效/);
    await assert.rejects(instance.page.evaluate(({ id, run }) => window.researchTrail.runEvents(id, run, -1), { id: b.id, run: runB.id }), /非负整数/);
    await instance.page.getByRole('button', { name: /甲会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('甲会话');
    await expect(instance.page.getByTestId('message-history')).not.toContainText('只属于乙的输入');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    for (let n = 0; n < 2; n++) {
      await instance.page.getByRole('button', { name: '重新读取事件' }).click();
      await expect(instance.page.getByRole('button', { name: '重新读取事件' })).toBeEnabled();
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    }
    assert.equal((await instance.page.evaluate((id) => window.researchTrail.getSession(id), a.id)).message_count, 2);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'sessions-events.png'), fullPage: true });
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'sessions-compact.png'), fullPage: true });
    const oldChildren = children(instance.pid);
    await instance.app.close();
    instance = undefined;
    for (const pid of oldChildren) await expect.poll(() => alive(pid)).toBe(false);
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
    instance.page.on('pageerror', (e) => errors.push(e.message));
    await waitForBackend(instance.page);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByRole('button', { name: /甲会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('甲会话');
    await expect(instance.page.getByTestId('message-history')).toContainText('只属于甲的输入');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
    await instance.page.getByRole('button', { name: '删除当前会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('乙会话');
    await expect(instance.page.getByTestId('message-history')).toContainText('只属于乙的输入');
    await expect(instance.page.getByRole('button', { name: /甲会话/ })).toHaveCount(0);
    assert.equal((await instance.page.evaluate(({ id, run }) => window.researchTrail.getRun(id, run), { id: b.id, run: runB.id })).id, runB.id);
    assert.deepEqual(errors, []);
    const owned = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (instance) await instance.app.close(); }
});

test('database migration startup failure is visible and leaves no backend', { timeout: 45000 }, async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'research-trail-invalid-db-'));
  const instance = await launch({ RESEARCH_TRAIL_DB_PATH: directory });
  try {
    await expect(instance.page.getByRole('heading', { name: '连接未就绪' })).toBeVisible();
    await expect(instance.page.getByText(/unable to open database file/)).toBeVisible();
    await expect(instance.page.getByRole('button', { name: '重试启动' })).toBeEnabled();
    await expect.poll(() => children(instance.pid)).toEqual([]);
    await screenshot(instance.page, 'database-startup-failure.png');
  } finally { await instance.app.close(); }
});

test('rule agent invokes Python data tools, renders saved cards and exposes failures', { timeout: 90000 }, async () => {
  let instance = await launch();
  const databasePath = instance.databasePath;
  const errors = [];
  try {
    instance.page.on('pageerror', (e) => errors.push(e.message));
    instance.page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await waitForBackend(instance.page);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByText('规则演示／假模型', { exact: true })).toBeVisible();
    await instance.page.getByLabel('会话标题', { exact: true }).fill('规则演示验收');
    await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('规则演示验收');
    const sid = (await instance.page.evaluate(() => window.researchTrail.listSessions()))[0].id;
    const runPrompt = async (input, count) => {
      await instance.page.getByLabel('测试输入', { exact: true }).fill(input);
      await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
      await expect(instance.page.getByTestId('message-history')).toContainText(input);
      await expect(instance.page.getByRole('button', { name: '重新读取事件' })).toBeEnabled();
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(count);
      return (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), sid))[0];
    };
    const quote = await runPrompt('查询AAPL.US行情', 8);
    await expect(instance.page.getByTestId('run-state')).toContainText('规则演示／假模型 · 已完成');
    await expect(instance.page.getByTestId('tool-result')).toHaveAttribute('data-tool', 'market.quote');
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await expect(instance.page.getByTestId('message-history')).toContainText('AAPL.US最新价 189.43 USD');
    await expect(instance.page.getByTestId('event-list')).toContainText('调用Python工具 market.quote，参数 AAPL.US');
    const fetchedAt = await instance.page.getByTestId('tool-fetched-at').textContent();
    const trace = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: quote.id });
    assert.equal(trace[3].payload.call_id, trace[4].payload.call_id);
    assert.equal(trace[4].payload.result.data.quote.last_price, 189.43);
    assert.equal(quote.kind, 'fake_agent');
    assert.equal(quote.error, null);
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      mkdirSync(process.env.RESEARCH_TRAIL_QA_DIR, { recursive: true });
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-quote.png'), fullPage: true });
    }
    const kline = await runPrompt('查看NVDA.US的K线', 8);
    await expect(instance.page.getByTestId('tool-result')).toHaveAttribute('data-tool', 'market.kline');
    await expect(instance.page.getByTestId('agent-kline-summary')).toHaveText('10 根日K线 · 最后收盘 880.12 USD');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'NVDA.US');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-close', '880.12');
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-count', '10');
    assert.ok(await instance.page.getByTestId('chart-canvas').locator('canvas').count() > 0);
    assert.equal(await instance.page.getByTestId('quote-card').count(), 0);
    assert.match(kline.answer, /880\.12/);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(quote.id);
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetchedAt);
    await instance.page.getByRole('button', { name: '重新读取事件' }).click();
    await expect(instance.page.getByRole('button', { name: '重新读取事件' })).toBeEnabled();
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
    assert.equal((await instance.page.evaluate((id) => window.researchTrail.getSession(id), sid)).message_count, 4);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(kline.id);
    await expect(instance.page.getByTestId('chart-canvas')).toHaveAttribute('data-loaded-symbol', 'NVDA.US');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-kline.png'), fullPage: true });
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-compact.png'), fullPage: true });
    const unsupported = await runPrompt('请帮我推荐股票', 6);
    await expect(instance.page.getByTestId('message-history')).toContainText('当前规则演示只支持');
    assert.equal(unsupported.status, 'completed');
    assert.equal(await instance.page.getByTestId('tool-result').count(), 0);
    assert.equal(await instance.page.getByTestId('chart-canvas').count(), 0);
    const failed = await runPrompt('查询ZZZZ.US行情', 9);
    await expect(instance.page.getByTestId('run-state')).toContainText('运行失败');
    await expect(instance.page.getByTestId('run-error')).toContainText('UNKNOWN_SYMBOL');
    await expect(instance.page.getByTestId('tool-failure')).toContainText('未知股票代码：ZZZZ.US');
    assert.equal(await instance.page.getByTestId('quote-card').count(), 0);
    assert.equal(await instance.page.getByTestId('chart-canvas').count(), 0);
    assert.equal(failed.status, 'failed');
    const failureTrace = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: failed.id });
    assert.equal(failureTrace[4].payload.result.ok, false);
    assert.equal(failureTrace.at(-1).payload.stop_reason, 'error');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'agent-failure.png'), fullPage: true });
    await assert.rejects(instance.page.evaluate((sid) => window.researchTrail.startAgentRun(sid, { command: 'anything' }), sid), /输入需要/);
    const owned = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
    instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
    await waitForBackend(instance.page);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByTestId('run-error')).toContainText('UNKNOWN_SYMBOL');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(9);
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(quote.id);
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetchedAt);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    const replacement = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of replacement) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (instance) await instance.app.close(); }
});

test('run lifecycle cancels, times out, deletes active session and marks backend crash interrupted', { timeout: 90000 }, async () => {
  const databasePath = resolve(mkdtempSync(resolve(tmpdir(), 'research-trail-lifecycle-')), 'test.sqlite3');
  let instance = await launch({ RESEARCH_TRAIL_DB_PATH: databasePath });
  try {
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    instance.page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
    await waitForBackend(instance.page);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await instance.page.getByLabel('会话标题', { exact: true }).fill('生命周期验收');
    await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('生命周期验收');
    let sid = (await instance.page.evaluate(() => window.researchTrail.listSessions()))[0].id;
    const start = async (scenario, expected = '运行中') => {
      await instance.page.getByLabel('模拟工具时序', { exact: true }).selectOption(scenario);
      await instance.page.getByLabel('测试输入', { exact: true }).fill('查询AAPL.US行情');
      await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
      await expect(instance.page.getByTestId('run-state')).toContainText(expected);
      return (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), sid))[0];
    };
    const proof = async (record, status) => {
      const result = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.getRun(sid, rid), { sid, rid: record.id });
      const trace = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: record.id });
      assert.equal(result.status, status);
      assert.equal(trace.filter((e) => e.type === 'run_completed').length, 1);
      assert.equal(trace.filter((e) => e.type === 'message_completed').length, 1);
      assert.equal(trace.at(-1).type, 'run_completed');
      assert.equal(trace.filter((e) => e.type === 'tool_result' && e.payload.result.ok).length, 0);
      const messages = await instance.page.evaluate((id) => window.researchTrail.sessionMessages(id), sid);
      assert.equal(messages.filter((m) => m.run_id === record.id).length, 2);
      return trace;
    };
    await assert.rejects(instance.page.evaluate((id) => window.researchTrail.startAgentRun(id, '查询AAPL.US行情', 'shell'), sid), /未知模拟工具时序/);
    const cancelled = await start('delayed');
    await expect(instance.page.getByTestId('event-list')).toContainText('tool_started');
    await expect(instance.page.getByRole('button', { name: '取消运行', exact: true })).toBeEnabled();
    await instance.page.getByRole('button', { name: '取消运行', exact: true }).click();
    await expect(instance.page.getByTestId('run-state')).toContainText('已取消');
    await expect(instance.page.getByRole('button', { name: '取消运行', exact: true })).toBeDisabled();
    const cancelTrace = await proof(cancelled, 'cancelled');
    assert.equal(await instance.page.getByTestId('tool-result').count(), 0);
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'lifecycle-cancelled.png'), fullPage: true });
    const timedOut = await start('timeout', '已超时');
    await expect(instance.page.getByTestId('run-error')).toContainText('TOOL_TIMEOUT');
    await proof(timedOut, 'timed_out');
    await instance.page.getByLabel('运行记录', { exact: true }).selectOption(cancelled.id);
    await expect(instance.page.getByTestId('run-state')).toContainText('已取消');
    const unchanged = await instance.page.evaluate(({ sid, rid }) => window.researchTrail.runEvents(sid, rid), { sid, rid: cancelled.id });
    assert.deepEqual(unchanged, cancelTrace);
    const other = await instance.page.evaluate(() => window.researchTrail.createSession('保留会话'));
    const deleted = await start('delayed');
    await instance.page.getByRole('button', { name: '删除当前会话', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('保留会话');
    await assert.rejects(instance.page.evaluate(({ sid, rid }) => window.researchTrail.getRun(sid, rid), { sid, rid: deleted.id }), /不存在或已删除/);
    sid = other.id;
    const interrupted = await start('delayed');
    await expect(instance.page.getByTestId('event-list')).toContainText('tool_started');
    const backend = children(instance.pid);
    assert.equal(backend.length, 1);
    process.kill(backend[0]);
    await expect(instance.page.getByRole('heading', { name: '连接未就绪' })).toBeVisible();
    await instance.page.getByRole('button', { name: '重试启动', exact: true }).click();
    await waitForBackend(instance.page);
    await expect(instance.page.getByTestId('current-session')).toHaveText('保留会话');
    await expect(instance.page.getByTestId('run-state')).toContainText('已中断');
    await expect(instance.page.getByTestId('run-error')).toContainText('BACKEND_INTERRUPTED');
    await expect(instance.page.getByText('保存内容已保留。请在输入框重新发起；不会自动调用工具或模型。', { exact: true })).toBeVisible();
    await proof(interrupted, 'interrupted');
    assert.equal((await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), sid)).length, 1);
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RESEARCH_TRAIL_QA_DIR) {
      await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'lifecycle-interrupted.png'), fullPage: true });
      await instance.page.evaluate(() => window.scrollTo(0, 0));
      await screenshot(instance.page, 'lifecycle-compact-viewport.png');
    }
    const explicit = await start('normal', '已完成');
    await expect(instance.page.getByTestId('quote-price')).toHaveText('189.43');
    assert.equal(explicit.status, 'completed');
    assert.deepEqual(errors, []);
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0);
    const final = children(instance.pid);
    await instance.app.close(); instance = undefined;
    for (const pid of final) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (instance) await instance.app.close(); }
});

test('snapshot first, real stream reconnect, active refresh and session unsubscribe restore without duplicate messages', { timeout: 90000 }, async () => {
  const instance = await launch();
  let closed = false;
  try {
    const errors = [];
    instance.page.on('pageerror', (error) => errors.push(error.message));
    instance.page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await waitForBackend(instance.page);
    // Test-only main HTTP observation and disconnect; real Python remains live.
    await instance.app.evaluate(() => {
      const http = process.getBuiltinModule('node:http'), original = http.request;
      globalThis.streamQa = [];
      http.request = function (...args) {
        const req = original.apply(this, args), url = String(args[0]);
        const item = { url, method: args[1]?.method || 'GET', cursor: args[1]?.headers?.['Last-Event-ID'], req };
        if (url.includes('/sessions/')) globalThis.streamQa.push(item);
        if (url.includes('follow=true')) {
          // The initial snapshot may end before or after tool_started. Observe
          // complete frames after the production decoder, not the start cursor.
          item.lastReceivedCursor = item.cursor;
          let buffer = '';
          req.on('response', (response) => response.on('data', (chunk) => {
            buffer = (buffer + chunk.toString()).replaceAll('\r\n', '\n');
            let end;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
              const id = frame.match(/^id: ([^\n]+)$/m);
              if (id) item.lastReceivedCursor = id[1];
            }
          }));
        }
        return req;
      };
    });
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    for (const title of ['流甲会话', '流乙会话']) {
      await instance.page.getByLabel('会话标题', { exact: true }).fill(title);
      await instance.page.getByRole('button', { name: '创建会话', exact: true }).click();
      await expect(instance.page.getByTestId('current-session')).toHaveText(title);
    }
    const list = await instance.page.evaluate(() => window.researchTrail.listSessions());
    const a = list.find((item) => item.title === '流甲会话'), b = list.find((item) => item.title === '流乙会话');
    await instance.page.getByRole('button', { name: /流甲会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText(a.title);
    const start = async (text) => {
      await instance.page.getByLabel('模拟工具时序', { exact: true }).selectOption('delayed');
      await instance.page.getByLabel('测试输入', { exact: true }).fill(text);
      await instance.page.getByRole('button', { name: '运行规则演示', exact: true }).click();
      await expect(instance.page.getByTestId('run-state')).toContainText('运行中');
      await expect(instance.page.getByTestId('stream-state')).toContainText('事件已连接');
      return (await instance.page.evaluate((id) => window.researchTrail.sessionRuns(id), a.id))[0];
    };
    const first = await start('查询AAPL.US行情');
    await expect(instance.page.getByTestId('event-list')).toContainText('tool_started');
    const disconnectedCursor = await instance.app.evaluate(() => {
      const item = globalThis.streamQa.findLast((item) => item.url.includes('follow=true') && !item.req.destroyed);
      if (!item) throw new Error('Expected real live SSE request');
      // Capture and destroy in one main-process turn: no frame can advance the
      // expected waterline between separate renderer/main evaluation requests.
      const cursor = item.lastReceivedCursor;
      item.req.destroy(new Error('test-only stream disconnect'));
      return cursor;
    });
    await expect(instance.page.getByTestId('stream-state')).toContainText('中断');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'stream-reconnecting.png'), fullPage: true });
    await expect(instance.page.getByTestId('run-state')).toContainText('已完成');
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
    await expect(instance.page.getByTestId('tool-result')).toHaveCount(1);
    const trace = await instance.app.evaluate(() => globalThis.streamQa.map(({ url, method, cursor }) => ({ url, method, cursor })));
    const streams = trace.filter((item) => item.url.includes(first.id) && item.url.includes('follow=true'));
    assert.equal(streams.length, 2);
    assert.match(streams[1].cursor, new RegExp(`${first.id}:\\d+$`));
    assert.equal(streams[1].cursor, disconnectedCursor);
    const snapshotIndex = trace.findIndex((item) => item.url.endsWith(`/sessions/${a.id}/snapshot`));
    assert.ok(snapshotIndex >= 0 && snapshotIndex < trace.findIndex((item) => item.url.includes('follow=true')));
    const fetched = await instance.page.getByTestId('tool-fetched-at').textContent();
    await instance.page.getByTestId('tool-activity-toggle').click();
    await expect(instance.page.getByTestId('tool-activity-call')).toContainText('已返回');
    if (process.env.RESEARCH_TRAIL_QA_DIR) await instance.page.screenshot({ path: resolve(process.env.RESEARCH_TRAIL_QA_DIR, 'stream-restored-history.png'), fullPage: true });
    await instance.page.reload();
    await expect(instance.page.getByTestId('current-session')).toHaveText(a.title);
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    await expect(instance.page.getByTestId('tool-fetched-at')).toHaveText(fetched);
    for (let n = 0; n < 2; n++) {
      await instance.page.getByRole('button', { name: '重新读取事件', exact: true }).click();
      await expect(instance.page.getByRole('button', { name: '重新读取事件', exact: true })).toBeEnabled();
      await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(8);
      await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(2);
    }
    const second = await start('查看NVDA.US的K线');
    await instance.page.reload();
    await expect(instance.page.getByTestId('current-session')).toHaveText(a.title);
    await expect(instance.page.getByTestId('stream-state')).toContainText('事件已连接');
    await instance.page.getByRole('button', { name: /流乙会话/ }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText(b.title);
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(0);
    await expect.poll(() => instance.app.evaluate(() => globalThis.streamQa.filter((item) => item.url.includes('follow=true') && !item.req.destroyed).length)).toBe(0);
    await expect.poll(() => instance.page.evaluate(({ sid, rid }) => window.researchTrail.getRun(sid, rid).then((run) => run.status), { sid: a.id, rid: second.id })).toBe('completed');
    await expect(instance.page.getByTestId('current-session')).toHaveText(b.title);
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(0);
    assert.equal(await instance.page.getByTestId('tool-result').count(), 0);
    await instance.page.getByRole('button', { name: /流甲会话/ }).click();
    await expect(instance.page.getByTestId('message-history').locator('article')).toHaveCount(4);
    const saved = await instance.page.evaluate((id) => window.researchTrail.sessionSnapshot(id), a.id);
    const kline = saved.events.find((item) => item.run_id === second.id && item.type === 'tool_result').payload.result.data;
    await expect(instance.page.getByTestId('agent-kline-summary')).toContainText(kline.klines.at(-1).close.toFixed(2));
    assert.equal(await instance.app.evaluate(() => globalThis.streamQa.filter((item) => item.method === 'POST' && /\/runs$/.test(item.url)).length), 2);
    assert.equal(saved.runs.length, 2); assert.equal(saved.messages.length, 4);
    const ids = await instance.page.getByTestId('message-history').locator('article').evaluateAll((items) => items.map((item) => item.dataset.messageId));
    assert.equal(new Set(ids).size, 4);
    await instance.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 620));
    assert.equal(await instance.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await instance.page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(instance.page, 'stream-compact.png');
    assert.match(instance.page.url(), /dist\/renderer\/index\.html$/);
    assert.equal(await instance.page.title(), '研迹 · ResearchTrail');
    assert.equal(await instance.page.locator('vite-error-overlay').count(), 0); assert.deepEqual(errors, []);
    const owned = children(instance.pid);
    await instance.app.close(); closed = true;
    for (const pid of owned) await expect.poll(() => alive(pid)).toBe(false);
  } finally { if (!closed) await instance.app.close(); }
});

test('late earlier session snapshot cannot overwrite selected session', { timeout: 45000 }, async () => {
  const instance = await launch();
  try {
    await waitForBackend(instance.page);
    const samples = await instance.page.evaluate(async () => {
      const bridge = window.researchTrail;
      const a = await bridge.createSession('慢快照甲'), b = await bridge.createSession('快快照乙');
      await bridge.startRun(a.id, '只属于慢甲'); await bridge.startRun(b.id, '只属于快乙');
      return [await bridge.sessionSnapshot(a.id), await bridge.sessionSnapshot(b.id)];
    });
    await instance.app.evaluate(({ ipcMain }, samples) => {
      globalThis.snapshotQa = [];
      ipcMain.removeHandler('sessions:snapshot');
      ipcMain.handle('sessions:snapshot', async (_event, id) => {
        await new Promise((done) => setTimeout(done, id === samples[0].session.id ? 600 : 10));
        globalThis.snapshotQa.push(id); return samples.find((sample) => sample.session.id === id);
      });
    }, samples);
    await instance.page.getByRole('button', { name: '会话与事件', exact: true }).click();
    await expect(instance.page.getByTestId('current-session')).toHaveText('快快照乙');
    await instance.app.evaluate(() => { globalThis.snapshotQa = []; });
    await instance.page.getByRole('button', { name: /慢快照甲/ }).click();
    await instance.page.getByRole('button', { name: /快快照乙/ }).click();
    await expect.poll(() => instance.app.evaluate(() => globalThis.snapshotQa)).toEqual([samples[1].session.id, samples[0].session.id]);
    await expect(instance.page.getByTestId('current-session')).toHaveText('快快照乙');
    await expect(instance.page.getByTestId('message-history')).toContainText('只属于快乙');
    await expect(instance.page.getByTestId('message-history')).not.toContainText('只属于慢甲');
    await expect(instance.page.getByTestId('event-list').locator('li')).toHaveCount(7);
  } finally { await instance.app.close(); }
});
