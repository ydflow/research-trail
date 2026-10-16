import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function sourceIdentity(root, {allowUnversioned=false}={}) {
  const git = args => {
    const result = spawnSync('git', args, { cwd:root, encoding:'utf8', windowsHide:true });
    if (result.status !== 0) throw new Error('Cannot identify build source');
    return result.stdout.trim();
  };
  try {
    return { source_commit:git(['rev-parse','HEAD']), source_tree:git(['rev-parse','HEAD^{tree}']), source_dirty:git(['status','--porcelain']) !== '' };
  } catch(error) {
    // Source ZIPs remain buildable, but can never claim formal release identity.
    if (!allowUnversioned) throw error;
    return {source_commit:null,source_tree:null,source_dirty:true};
  }
}
export function fileInventory(directory, prefix='') {
  return readdirSync(directory).sort().flatMap(name => {
    const path=join(directory,name), relative=prefix+name, info=lstatSync(path);
    if (info.isSymbolicLink()) throw new Error('Symlink in build payload');
    return info.isDirectory() ? fileInventory(path,relative+'/') : [{path:relative,bytes:info.size,sha256:sha256(readFileSync(path))}];
  });
}
export function validateRelease(version, source, ...builds) {
  if (!/^1\.(?:0|1)\.0(?:-[a-z0-9]+(?:[.-][a-z0-9]+)*)?$/.test(version)) throw new Error('Expected reviewed 1.0.0 or 1.1.0 version');
  // Only explicitly named internal development artifacts may record dirty work.
  // Changing a public version to rc/beta must never bypass release gates.
  if (!/^1\.(?:0|1)\.0-internal\./.test(version)) {
    if (source.source_dirty !== false || !/^[a-f0-9]{40}$/.test(source.source_commit) || !/^[a-f0-9]{40}$/.test(source.source_tree)) throw new Error('Formal release requires clean committed source');
    if (builds.length !== 2 || builds.some(b => !b || b.source_dirty !== false || b.source_commit !== source.source_commit || b.source_tree !== source.source_tree)) {
      throw new Error('Python and Electron builds must match the clean release source');
    }
  }
}
export function validateAppFiles(files) {
  const paths=files.map(f=>f.path);
  for (const required of ['main.cjs','preload.cjs','renderer/index.html']) if (!paths.includes(required)) throw new Error('Missing built desktop entry: '+required);
  for (const path of paths) {
    if (!/^(?:main\.cjs|preload\.cjs|renderer\/(?:index\.html|assets\/[^/]+\.(?:js|css)|brand\/[^/]+\.png))$/.test(path)) throw new Error('Unexpected application payload: '+path);
    if (/pi-worker|pi-agent-core|pi-ai|proxy-agent-negotiate|node_modules/i.test(path)) throw new Error('Experimental dependency in application');
  }
}
