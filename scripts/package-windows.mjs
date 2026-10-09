// Internal candidate only. This command does not publish, tag or create a Release.
import { build, Platform, Arch } from 'electron-builder';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const stage = mkdtempSync(join(root, 'build/windows/app-'));
const notices = join(root, 'build/windows/notices');
const output = join(root, 'release/windows-internal');
const desktopRequire = createRequire(join(root, 'apps/desktop/package.json'));
const version = '1.0.0-internal.24';
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows x64 build required');
if (!existsSync(join(root,'build/windows/python/backend/research-trail-backend.exe'))) throw new Error('Build Python backend first');
mkdirSync(stage, {recursive:true}); mkdirSync(output, {recursive:true});
cpSync(join(root,'apps/desktop/dist'), join(stage,'dist'), {recursive:true});
writeFileSync(join(stage,'package.json'), JSON.stringify({name:'research-trail-desktop',version,
  description:'ResearchTrail Windows internal acceptance candidate',author:'ResearchTrail contributors',
  main:'dist/main.cjs',private:true},null,2)+'\n');
// The renderer and main/preload are already bundled. No repository/node_modules
// directory is included, and no broad project copy can collect private runtime state.
const ui = [];
for (const name of ['react','react-dom','scheduler','klinecharts']) {
  const resolver = name === 'scheduler' ? createRequire(desktopRequire.resolve('react-dom/package.json')) : desktopRequire;
  const pkgPath = resolver.resolve(name + '/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath,'utf8'));
  const files = readdirSync(dirname(pkgPath)).filter(f=>/^(license|copying|notice)/i.test(f));
  const dest = join(notices, 'ui', name);mkdirSync(dest,{recursive:true});
  for (const f of files) if(statSync(join(dirname(pkgPath),f)).isFile()) cpSync(join(dirname(pkgPath),f),join(dest,f));
  ui.push({name,version:pkg.version,license:pkg.license,license_files:files});
}
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
writeFileSync(join(output,'bundle-manifest.json'),JSON.stringify({version,installer,sha256:sha,files:manifest},null,2)+'\n');
console.log(`[package] ${installer}\nSHA256 ${sha}\nInternal candidate only; clean Windows acceptance pending.`);
