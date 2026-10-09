// Internal candidate only. This command does not publish, tag or create a Release.
import { build, Platform, Arch } from 'electron-builder';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { collectUiNotices } from './ui-notices.mjs';
import { auditNative } from './native-audit.mjs';

const root = resolve(import.meta.dirname, '..');
const stage = mkdtempSync(join(root, 'build/windows/app-'));
const notices = join(root, 'build/windows/notices');
const desktopRequire = createRequire(join(root, 'apps/desktop/package.json'));
const version = process.argv[2] ?? '1.0.0-internal.24';
if (!/^1\.0\.0(?:-[a-z0-9.]+)?$/.test(version)) throw new Error('Expected explicit reviewed 1.0.0 version');
const output = version==='1.0.0-internal.24' ? join(root,'release/windows-internal') : join(root,'release/windows',version);
function git(args) { const r=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error('Cannot record source identity');return r.stdout.trim(); }
const sourceCommit=git(['rev-parse','HEAD']);const sourceTree=git(['rev-parse','HEAD^{tree}']);
const dirty=git(['status','--porcelain'])!=='';
if(version==='1.0.0' && dirty) throw new Error('Commit reviewed sources before building the formal candidate');
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows x64 build required');
if (!existsSync(join(root,'build/windows/python/backend/research-trail-backend.exe'))) throw new Error('Build Python backend first');
auditNative(root,join(root,'build/windows/python/backend/_internal'));
const backendIdentity=JSON.parse(readFileSync(join(root,'build/windows/backend-source.json'),'utf8'));
if(version==='1.0.0' && (backendIdentity.source_commit!==sourceCommit || backendIdentity.source_tree!==sourceTree || backendIdentity.source_dirty))throw new Error('Python build does not match the clean reviewed source');
mkdirSync(stage, {recursive:true}); mkdirSync(output, {recursive:true});
cpSync(join(root,'apps/desktop/dist'), join(stage,'dist'), {recursive:true});
writeFileSync(join(stage,'package.json'), JSON.stringify({name:'research-trail-desktop',version,
  description:'ResearchTrail local investment research workbench',author:'ResearchTrail contributors',
  main:'dist/main.cjs',private:true},null,2)+'\n');
// The renderer and main/preload are already bundled. No repository/node_modules
// directory is included, and no broad project copy can collect private runtime state.
const ui = collectUiNotices(join(root,'apps/desktop/package.json'), join(notices, 'ui'));
writeFileSync(join(notices,'ui-dependencies.json'),JSON.stringify(ui,null,2)+'\n');
const sourceDocs = readdirSync(join(root,'docs')).filter(f=>/^SOURCES.*\.json$/.test(f));
mkdirSync(join(notices,'sources'),{recursive:true});
for (const f of sourceDocs) cpSync(join(root,'docs',f),join(notices,'sources',f));
for (const f of ['BUNDLE-NOTICE.md','WINDOWS-INSTALL.md']) cpSync(join(root,'docs',f),join(notices,f));
cpSync(join(root,'docs/third-party'),join(notices,'third-party'),{recursive:true});
// Fail rather than retaining unreviewed stale app files from an earlier build.
const allowed = new Set(['dist','package.json']);
if(readdirSync(stage).some(f=>!allowed.has(f))) throw new Error('Unexpected file in application stage');
const electronDist = join(dirname(desktopRequire.resolve('electron/package.json')),'dist');
await build({projectDir:root,targets:Platform.WINDOWS.createTarget(['nsis'],Arch.x64),config:{
  appId:'io.github.ydflow.researchtrail',productName:'ResearchTrail',electronVersion:'44.5.1',electronDist,
  directories:{app:stage,output},files:['package.json','dist/**/*'],asar:true,
  extraResources:[{from:join(root,'build/windows/python/backend'),to:'backend',filter:['**/*']},
    {from:join(root,'skills'),to:'skills',filter:['**/*.md','LICENSE','catalog.json']},
    {from:notices,to:'notices',filter:['**/*']}],
  win:{target:[{target:'nsis',arch:['x64']}],signExecutable:false,
    artifactName:'ResearchTrail-${version}-windows-x64-setup.${ext}'},
  nsis:{oneClick:false,perMachine:false,allowElevation:false,allowToChangeInstallationDirectory:true,
    runAfterFinish:false,deleteAppDataOnUninstall:false,createDesktopShortcut:false,createStartMenuShortcut:true},
  publish:null
}});
const files = readdirSync(output).filter(f=>f.endsWith('.exe'));
if(files.length!==1) throw new Error('Expected exactly one installer, inspect stale output manually');
const installer=files[0];const sha=createHash('sha256').update(readFileSync(join(output,installer))).digest('hex');
writeFileSync(join(output,'SHA256SUMS.txt'),`${sha}  ${installer}\n`);
const manifest=[];
function walk(folder) {for(const name of readdirSync(folder)) {const path=join(folder,name);if(statSync(path).isDirectory())walk(path);
  else manifest.push({path:path.slice(join(output,'win-unpacked').length+1).replaceAll('\\','/'),bytes:statSync(path).size,
    sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}}
walk(join(output,'win-unpacked'));
if(manifest.some(f=>f.path !== 'resources/backend/_internal/certifi/cacert.pem' && /(^|\/)(runtime|user-data|\.env|\.git|node_modules)(\/|$)|\.(sqlite3?|db|log|csv|pem|key)$/i.test(f.path))) throw new Error('Disallowed runtime/private file in bundle');
writeFileSync(join(output,'bundle-manifest.json'),JSON.stringify({version,installer,sha256:sha,source_commit:sourceCommit,
  source_tree:sourceTree,source_dirty:dirty,built_at:new Date().toISOString(),files:manifest},null,2)+'\n');
console.log(`[package] ${installer}\nSHA256 ${sha}\nSource ${sourceCommit}; candidate pending explicit installer acceptance; no publication.`);
