// Only an explicit renderer click opens a normal article URL. Never run a custom scheme.
export function originalNewsUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000 || /[\\\s\u0000-\u001f]/u.test(value)) throw new Error('新闻链接无效。');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('新闻链接无效。'); }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('新闻链接无效。');
  return value;
}
