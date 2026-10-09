import { join } from 'node:path';

export interface PackagedLaunch { executable: string; cwd: string; env: NodeJS.ProcessEnv }

export function packagedLaunch(resources: string, userData: string, inherited: NodeJS.ProcessEnv): PackagedLaunch {
  // Developer fixture flags, interpreter overrides, proxy settings and secrets
  // cannot redirect a production launch. Credentials remain in the Windows vault.
  const env: NodeJS.ProcessEnv = {};
  const allowed = new Set(['SYSTEMROOT', 'WINDIR', 'SYSTEMDRIVE', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'PATH']);
  for (const [key, value] of Object.entries(inherited)) if (allowed.has(key.toUpperCase())) env[key] = value;
  env.RESEARCH_TRAIL_DB_PATH = join(userData, 'data', 'research-trail.sqlite3');
  return { executable: join(resources, 'backend', 'research-trail-backend.exe'), cwd: userData, env };
}
