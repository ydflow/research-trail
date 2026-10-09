import { createRequire } from 'node:module';
import { dirname, join, parse } from 'node:path';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';

// Resolve at the importing package, so multiple locked versions are preserved.
function packageFile(resolver, name) {
  try { return resolver.resolve(name + '/package.json'); }
  catch {
    let folder = dirname(resolver.resolve(name));
    while (folder !== parse(folder).root) {
      const candidate = join(folder, 'package.json');
      if (existsSync(candidate) && JSON.parse(readFileSync(candidate, 'utf8')).name === name) return candidate;
      folder = dirname(folder);
    }
    throw new Error(`Cannot identify runtime dependency: ${name}`);
  }
}

export function collectUiNotices(desktopPackage, destination) {
  const desktop = JSON.parse(readFileSync(desktopPackage, 'utf8'));
  const visited = new Set(), rows = [];
  function visit(name, resolver) {
    const path = packageFile(resolver, name), pkg = JSON.parse(readFileSync(path, 'utf8'));
    const identity = `${pkg.name}@${pkg.version}`;
    if (visited.has(identity)) return;
    visited.add(identity);
    const files = readdirSync(dirname(path)).filter(file => /^(license|copying|notice)/i.test(file) && statSync(join(dirname(path), file)).isFile());
    if (!files.length) throw new Error(`Runtime license text missing: ${identity}`);
    const target = join(destination, pkg.name, pkg.version);
    mkdirSync(target, { recursive: true });
    for (const file of files) cpSync(join(dirname(path), file), join(target, file));
    rows.push({ name: pkg.name, version: pkg.version, license: pkg.license, license_files: files });
    const child = createRequire(path);
    for (const dependency of Object.keys(pkg.dependencies || {}).sort()) visit(dependency, child);
  }
  const resolver = createRequire(desktopPackage);
  for (const dependency of Object.keys(desktop.dependencies || {}).sort()) visit(dependency, resolver);
  return rows.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
}
