// Explicit local installer acceptance; never runs in deterministic offline CI.
const assert = require('node:assert/strict');
const { _electron: electron, expect } = require('@playwright/test');
const { spawnSync, execFileSync } = require('node:child_process');
const { join, resolve } = require('node:path');
const { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const root = resolve(__dirname, '..');
const out = join(root, 'release/windows-internal');
const installer = join(out, 'ResearchTrail-1.0.0-internal.24-windows-x64-setup.exe');
const qa = mkdtempSync(join(tmpdir(), 'research-trail package QA-'));
const install = join(qa, 'installed app');
const data = join(qa, 'user data');
const exe = join(install, 'ResearchTrail.exe');
const checks = [], errors = [], warnings = [];
const quote = value => "'" + value.replaceAll("'", "''") + "'";
function ps(code) {return execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command',code],{encoding:'utf8',windowsHide:true}).trim();}
function check(name, detail) {checks.push({name,detail,status:'passed'});console.log('[package QA] '+name);}
function runInstaller(path, args) {
  // NSIS /D must be the final unquoted argument, including when it has spaces.
  const result = ps(`$p=Start-Process -FilePath ${quote(path)} -ArgumentList ${quote(args)} -WindowStyle Hidden -Wait -PassThru; $p.ExitCode`);
  assert.equal(result,'0');
}
function owned(pid) {
  const raw=ps(`@(Get-CimInstance Win32_Process -Filter "ParentProcessId = ${Number(pid)}" | Select-Object ProcessId,Name,ExecutablePath) | ConvertTo-Json -Compress`);
  const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[rows];
}
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const env = Object.fromEntries(Object.entries(process.env).filter(([k])=>['SYSTEMROOT','WINDIR','SYSTEMDRIVE','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'].includes(k.toUpperCase())));
env.PATH=join(process.env.SystemRoot,'System32');
// Poisoned development overrides must have no effect on an installed launch.
env.RESEARCH_TRAIL_PYTHON='Z:/missing/python.exe';env.RESEARCH_TRAIL_RENDERER_URL='http://127.0.0.1:9/';
env.RESEARCH_TRAIL_DB_PATH=join(qa,'must-not-exist.sqlite3');env.RESEARCH_TRAIL_WORKSPACE_FIXTURE_CASE='outcome-history';env.RESEARCH_TRAIL_OFFLINE='1';
async function launch(userData=data) {
  const app=await electron.launch({executablePath:exe,args:[`--research-trail-data-dir=${userData}`],cwd:qa,env,timeout:45000});
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());if(e.type()==='warning')warnings.push(e.text());});
  await expect(page.getByRole('heading',{name:'连接就绪'})).toBeVisible({timeout:45000});
  assert.equal(await page.title(),'研迹 · ResearchTrail');assert.match(page.url(),/app\.asar\/dist\/renderer\/index\.html$/);
  assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
  assert.equal(await app.evaluate(({app})=>app.getPath('userData')),userData);
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  assert.equal(await page.locator('vite-error-overlay').count(),0);
  assert.equal(existsSync(env.RESEARCH_TRAIL_DB_PATH),false);
  const pid=await app.evaluate(()=>process.pid);const children=owned(pid);const backend=children.find(c=>c.Name==='research-trail-backend.exe');
  assert.ok(backend);assert.equal(backend.ExecutablePath,join(install,'resources/backend/research-trail-backend.exe'));
  return {app,page,pid,children};
}
async function close(instance, force=false) {
  const children=owned(instance.pid);
  if(force) {instance.app.process().kill();await instance.app.close().catch(()=>{});}else await instance.app.close();
  for(const child of children)await expect.poll(()=>alive(child.ProcessId),{timeout:12000}).toBe(false);
}
async function main() {
  assert.equal(process.platform,'win32');
  const existing=ps("@(Get-ChildItem HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall | ForEach-Object {Get-ItemProperty $_.PSPath} | Where-Object {$_.DisplayName -match '^ResearchTrail(?: |$)'}) | ConvertTo-Json -Compress");
  assert.ok(!existing || existing==='[]','Existing ResearchTrail installation: stop rather than overwrite it');
  const manifest=JSON.parse(readFileSync(join(out,'bundle-manifest.json'),'utf8'));
  assert.equal(createHash('sha256').update(readFileSync(installer)).digest('hex'),manifest.sha256);
  runInstaller(installer,`/S /D=${install}`);assert.ok(existsSync(exe));check('actual NSIS first installation',install);
  const backendExe=join(install,'resources/backend/research-trail-backend.exe');
  const bundle=spawnSync(backendExe,['--bundle-check'],{env,encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(bundle.status,0,bundle.stderr);const bundleInfo=JSON.parse(bundle.stdout);assert.equal(bundleInfo.frozen,true);assert.ok(bundleInfo.skill_files>=29);
  check('bundled Python native SDK sqlite TLS timezone skills',bundleInfo);
  const worker=spawnSync(backendExe,['--provider-worker'],{env,input:JSON.stringify({provider:'longbridge',configuration:{},credentials:{},query:{capability:'market.quote',symbol:'AAPL.US',mode:'real'}}),encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(worker.status,0,worker.stderr);assert.equal(JSON.parse(worker.stdout).code,'CREDENTIAL_MISSING');
  check('frozen SDK worker rejects missing credentials without starting HTTP server or connecting',JSON.parse(worker.stdout));
  let instance=await launch();let snapshot,session,research,report,experiment;
  try {
    const page=instance.page;
    const second=spawnSync(exe,[`--research-trail-data-dir=${data}`],{cwd:qa,env,encoding:'utf8',windowsHide:true,timeout:15000});
    assert.equal(second.status,0,second.stderr);
    assert.equal(owned(instance.pid).filter(p=>p.Name==='research-trail-backend.exe').length,1);
    await expect(page.getByRole('heading',{name:'连接就绪'})).toBeVisible();
    check('same user data single-instance launch exits without a second backend');
    const tabs=await page.getByRole('navigation',{name:'工作区'}).getByRole('button').allTextContents();
    assert.equal(tabs.length,15);
    for(const tab of tabs){await page.getByRole('navigation',{name:'工作区'}).getByRole('button',{name:tab,exact:true}).click();
      await expect(page.getByRole('navigation',{name:'工作区'}).getByRole('button',{name:tab,exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('main')).not.toContainText('正在打开');await expect(page.locator('main')).not.toContainText('桌面通信桥不可用');}
    check('all 15 packaged navigation views render',tabs);
    const initial=await page.evaluate(async()=>({connections:await window.researchTrail.connections(),trace:await window.researchTrail.tracingConfigurations(),rules:await window.researchTrail.monitoringRules()}));
    assert.equal(initial.rules.length,0);assert.ok(initial.trace.every(t=>!t.enabled));
    const skills=await page.evaluate(()=>window.researchTrail.skills({mode:'simulated',provider:'longbridge'}));assert.equal(skills.length,2);
    const skill=await page.evaluate(()=>window.researchTrail.readSkillResource('longbridge-market-data','SKILL.md',{mode:'simulated',provider:'longbridge'}));assert.match(skill.content,/longbridge-market-data/);
    session=await page.evaluate(()=>window.researchTrail.createSession('安装版原创持久化验收'));
    const run=await page.evaluate(id=>window.researchTrail.startRun(id,'查询AAPL.US行情'),session.id);
    await expect.poll(()=>page.evaluate(({s,r})=>window.researchTrail.getRun(s,r).then(v=>v.status),{s:session.id,r:run.id}),{timeout:10000}).toBe('completed');
    snapshot=await page.evaluate(id=>window.researchTrail.sessionSnapshot(id),session.id);
    assert.equal(snapshot.messages.length,2);assert.equal(snapshot.runs.length,1);
    research=await page.evaluate(()=>window.researchTrail.startResearch({symbol:'AAPL.US',strategy:'comprehensive',mode:'simulated',provider:'longbridge'}));
    await expect.poll(()=>page.evaluate(id=>window.researchTrail.researchRun(id).then(v=>v.status),research.id),{timeout:30000}).toBe('collected');
    report=await page.evaluate(id=>window.researchTrail.generateReport(id,'fixed'),research.id);
    await expect.poll(()=>page.evaluate(id=>window.researchTrail.report(id).then(v=>v.status),report.id),{timeout:15000}).toBe('completed');
    const cases=await page.evaluate(()=>window.researchTrail.evaluationCases());assert.equal(cases.length,12);
    experiment=await page.evaluate(()=>window.researchTrail.createExperiment({request_id:crypto.randomUUID(),name:'安装包离线正常错误恢复回归',case_ids:['quote-aapl','model-shape','restart-interrupted','minimal-redaction'],profile:'baseline'}));
    await page.evaluate(id=>window.researchTrail.startExperiment(id),experiment.id);
    await expect.poll(()=>page.evaluate(id=>window.researchTrail.evaluationExperiment(id).then(v=>v.status),experiment.id),{timeout:45000}).toBe('passed');
    check('packaged business interfaces: skill text, Agent, research/report, evaluation migration sandbox',{session:session.id,research:research.id,report:report.id,experiment:experiment.id});
    await page.getByRole('button',{name:'会话与事件',exact:true}).click();await expect(page.getByTestId('message-history')).toContainText('AAPL.US');
    await page.screenshot({path:join(qa,'installed-session-wide.png'),fullPage:true});
    await page.getByRole('button',{name:'投资结果',exact:true}).click();await expect(page.getByTestId('outcome-panel')).toContainText('工具正确率不代表盈利能力');
    await page.getByTestId('outcome-opinions').getByRole('button').first().click();
    await expect(page.getByTestId('outcome-detail')).toHaveAttribute('data-status','not_run');
    await page.getByTestId('outcome-detail').getByRole('button',{name:'读取后续行情并评估',exact:true}).click();
    await expect(page.getByTestId('outcome-detail')).toHaveAttribute('data-status','pending');
    await page.screenshot({path:join(qa,'installed-outcomes-wide.png'),fullPage:true});
    await page.getByTestId('outcome-detail').scrollIntoViewIfNeeded();
    await page.screenshot({path:join(qa,'installed-outcome-detail-wide.png'),fullPage:false});
    await instance.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(620,760));
    await page.screenshot({path:join(qa,'installed-outcomes-compact.png'),fullPage:true});
    await page.getByTestId('outcome-detail').scrollIntoViewIfNeeded();
    await page.screenshot({path:join(qa,'installed-outcome-detail-compact.png'),fullPage:false});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const clipped=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-testid="outcome-panel"] p')).filter(p=>{
      const r=p.getBoundingClientRect();return r.right>innerWidth+1 || r.left<0;
    }).map(p=>p.textContent));
    assert.deepEqual(clipped,[],'Narrow layout paragraphs must stay inside the viewport');
    check('identity, nonblank, no overlay, desktop and compact screenshots and interactions',{widths:[1100,620]});
  } finally {await close(instance);}
  check('graceful close removes owned backend/desktop child processes');
  instance=await launch();try {
    assert.deepEqual(await instance.page.evaluate(id=>window.researchTrail.sessionSnapshot(id),session.id),snapshot);
    assert.equal((await instance.page.evaluate(()=>window.researchTrail.researchRuns())).length,1);
    assert.equal((await instance.page.evaluate(()=>window.researchTrail.evaluationExperiments())).length,1);
    assert.equal((await instance.page.evaluate(()=>window.researchTrail.outcomeOpinions())).length,1);
    check('restart preserves exact history and does not duplicate research/report/evaluation');
  }finally {await close(instance,true);}
  check('abnormal main exit stops owned backend via parent pipe');
  const oldData=join(qa,'old user data');const oldDB=join(oldData,'data/research-trail.sqlite3');
  const prepared=spawnSync(join(root,'services/backend/.venv/Scripts/python.exe'),[join(root,'tests/prepare-package-upgrade.py'),oldDB],{cwd:join(root,'services/backend'),encoding:'utf8',windowsHide:true});
  assert.equal(prepared.status,0,prepared.stderr);
  instance=await launch(oldData);try {
    const sessions=await instance.page.evaluate(()=>window.researchTrail.listSessions());assert.ok(sessions.some(s=>s.title==='原创旧库升级验收'));
  }finally{await close(instance);}
  const upgraded=spawnSync(join(root,'services/backend/.venv/Scripts/python.exe'),['-c',"import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); print(c.execute('select version_num from alembic_version').fetchone()[0]); assert c.execute('PRAGMA foreign_key_check').fetchone() is None",oldDB],{encoding:'utf8',windowsHide:true});
  assert.equal(upgraded.status,0,upgraded.stderr);assert.equal(upgraded.stdout.trim(),'0018_outcomes');
  check('installed frozen backend migrates synthetic 0017 to 0018 preserving original session',upgraded.stdout.trim());
  const database=join(data,'data/research-trail.sqlite3');const before=createHash('sha256').update(readFileSync(database)).digest('hex');
  const uninstall=readdirSync(install).find(f=>/^Uninstall.*\.exe$/i.test(f));assert.ok(uninstall);
  runInstaller(join(install,uninstall),'/S');await expect.poll(()=>existsSync(exe),{timeout:15000}).toBe(false);
  assert.ok(existsSync(database));assert.equal(createHash('sha256').update(readFileSync(database)).digest('hex'),before);
  check('actual silent uninstall removes app and preserves byte-identical custom user database');
  runInstaller(installer,`/S /D=${install}`);instance=await launch();try {
    assert.deepEqual(await instance.page.evaluate(id=>window.researchTrail.sessionSnapshot(id),session.id),snapshot);
  }finally{await close(instance);}
  runInstaller(join(install,uninstall),'/S');check('actual reinstall reads retained history, final uninstall cleans app registration');
  await expect.poll(()=>existsSync(exe),{timeout:15000}).toBe(false);
  const leftover=ps("@(Get-ChildItem HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall | ForEach-Object {Get-ItemProperty $_.PSPath} | Where-Object {$_.DisplayName -match '^ResearchTrail(?: |$)'}) | ConvertTo-Json -Compress");
  assert.ok(!leftover || leftover==='[]');
  assert.deepEqual(errors,[]);check('page and console errors',errors);
  writeFileSync(join(qa,'acceptance.json'),JSON.stringify({time:new Date().toISOString(),installer,sha256:manifest.sha256,host:'development Windows; NOT clean Windows',browser:'Browser plugin not available; existing Playwright Electron',qa,checks,errors,warnings,cleanWindows:'pending',realConnections:'not executed'},null,2)+'\n');
  console.log('PASS local installer acceptance. Evidence: '+qa);
}
main().catch(error=>{writeFileSync(join(qa,'failure.json'),JSON.stringify({checks,errors,warnings,error:String(error),stack:error.stack},null,2));console.error(error);console.error('Evidence: '+qa);process.exitCode=1;});
