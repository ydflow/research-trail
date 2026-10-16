import { createRequire } from 'node:module';
import { join } from 'node:path';
import { validateAppFiles, sha256 } from './package-policy.mjs';

// Use the existing Electron Builder dependency; no new package is installed.
const require=createRequire(import.meta.url);
const builderRequire=createRequire(require.resolve('electron-builder'));
const asar=createRequire(builderRequire.resolve('app-builder-lib'))('@electron/asar');
export function auditAppArchive(path, desktop) {
  const native=p=>join(...p.split('/'));
  const files=asar.listPackage(path).map(p=>p.replaceAll('\\','/').replace(/^\//,'')).filter(p=>!asar.statFile(path,native(p)).files);
  if (!files.includes('package.json') || files.some(p=>p!=='package.json' && !p.startsWith('dist/'))) throw new Error('Unexpected ASAR payload');
  const built=files.filter(p=>p!=='package.json').map(p=>({path:p.slice(5),sha256:sha256(asar.extractFile(path,native(p)))}));
  validateAppFiles(built);
  if (built.length!==desktop.files.length || built.some(f=>!desktop.files.some(d=>d.path===f.path && d.sha256===f.sha256))) throw new Error('ASAR differs from reviewed Electron build');
  const pkg=JSON.parse(asar.extractFile(path,'package.json'));
  if (pkg.dependencies || pkg.optionalDependencies || pkg.main!=='dist/main.cjs') throw new Error('Unexpected packaged runtime dependency');
  return {version:pkg.version,files:files.sort(),pi_worker_included:false,pi_node_dependencies_included:false,proof:'Every ASAR file is a hashed desktop build output or the dependency-free staged package.json'};
}
