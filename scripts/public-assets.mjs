// Exact public artwork allowlist. Private screenshots and other binary candidates remain blocked.
import {readFileSync,lstatSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
const icons=['apps/desktop/public/brand/research-trail.png','apps/desktop/assets/research-trail.ico'];
const photos=['workbench','research-report','portfolio-risk','today','calendar','thesis-review','evaluation','opportunities'].map(name=>'docs/assets/features/'+name+'.png');
export const publicAssetPaths=Object.freeze([...icons,...photos]);
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
export function validatePublicAsset(entry,bytes){
  if(!publicAssetPaths.includes(entry.path))throw new Error('Unapproved public asset path');
  const kind=icons.includes(entry.path)?'imagegen-original':'actual-electron-simulated';
  if(entry.origin!==kind || entry.review!=='isolated public artwork, no private data')throw new Error('Missing public asset provenance/review');
  if(!/^[a-f0-9]{64}$/.test(entry.sha256) || entry.sha256!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Public asset differs from reviewed SHA256');
  if(entry.bytes!==bytes.length || !bytes.length || bytes.length>8*1024*1024)throw new Error('Invalid public asset size');
  if(entry.path.endsWith('.png')){
    if(bytes.length<33 || !bytes.subarray(0,8).equals(pngSignature) || bytes.toString('ascii',12,16)!=='IHDR')throw new Error('Invalid public PNG');
    if(entry.width!==bytes.readUInt32BE(16) || entry.height!==bytes.readUInt32BE(20) || entry.width<16 || entry.height<16 || entry.width>2400 || entry.height>2400)throw new Error('Public PNG dimensions differ');
  }else{
    if(bytes.length<118 || bytes.readUInt16LE(0)!==0 || bytes.readUInt16LE(2)!==1 || bytes.readUInt16LE(4)!==7)throw new Error('Invalid public ICO');
    const expected=[16,24,32,48,64,128,256];
    for(let i=0;i<7;i++){
      const at=6+i*16,offset=bytes.readUInt32LE(at+12),length=bytes.readUInt32LE(at+8);
      if((bytes[at]||256)!==expected[i] || (bytes[at+1]||256)!==expected[i] || offset<118 || length<33 || offset+length>bytes.length || !bytes.subarray(offset,offset+8).equals(pngSignature))throw new Error('Invalid public ICO frame');
    }
  }
  return entry.path;
}
export function auditPublicAssets(root){
  const manifest=JSON.parse(readFileSync(resolve(root,'docs/PUBLIC-ASSETS.json'),'utf8'));
  if(manifest.schema!==1 || manifest.assets.length!==publicAssetPaths.length)throw new Error('Unexpected public asset manifest');
  const accepted=new Set();
  for(const entry of manifest.assets){
    const path=resolve(root,entry.path);
    if(!path.startsWith(resolve(root)+sep) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())throw new Error('Unsafe public asset');
    const name=validatePublicAsset(entry,readFileSync(path));
    if(accepted.has(name))throw new Error('Duplicate public asset');
    accepted.add(name);
  }
  return accepted;
}
