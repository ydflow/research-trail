// Offline notice and binary identity checks; no credential or network access.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function auditNative(root, binaryRoot) {
  const base=join(root,'docs/third-party/longbridge');
  const manifest=JSON.parse(readFileSync(join(base,'native/manifest.json'),'utf8'));
  if(manifest.source_commit!=='b2f749a3c68cc4f05642b37fc790fb711d2dfb13'||manifest.crates.length!==263||manifest.local_crates.length!==9||manifest.errors.length||manifest.missing.length)throw new Error('Native notice closure is incomplete');
  let count=0;
  for(const crate of manifest.crates) {
    if(!crate.license_files.length)throw new Error('Missing crate license terms');
    if(crate.license.includes('MPL-2.0')&&(crate.source_offer?.url!==crate.artifact_url||crate.source_offer.modified!==false))throw new Error('MPL source offer is missing');
    for(const f of crate.license_files) {
      const path=resolve(base,f.path);
      if(!path.startsWith(base+sep)||sha(readFileSync(path))!==f.sha256)throw new Error('Native license identity mismatch');
      count++;
    }
  }
  for(const f of ['rust-1.98.1/LICENSE-MIT','rust-1.98.1/LICENSE-APACHE'])if(!existsSync(join(base,'native',f)))throw new Error('Rust runtime license missing');
  if(binaryRoot) {
    const identity=JSON.parse(readFileSync(join(base,'native/wheel-identity.json'),'utf8'));
    for(const f of identity.binary_matches)if(sha(readFileSync(join(binaryRoot,f.path)))!==f.sha256)throw new Error('SDK native binary differs from reviewed wheel');
  }
  return {compiled_external_crates:manifest.crates.length,local_crates:manifest.local_crates.length,license_texts:count};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))console.log(JSON.stringify(auditNative(resolve(import.meta.dirname,'..')),null,2));
