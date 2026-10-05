import { useEffect, useRef, useState } from 'react';
import type { CapabilityView, ProviderConfiguration, ProviderCredentials, ProviderId, ProviderProfile, ProviderResult, ReadQuery } from '../provider-types';

const names = { longbridge: 'Longbridge 行情', 'longbridge-account': 'Longbridge 只读账户', massive: 'Massive 美股' };
const states = { unverified: '未验证', simulated: '模拟通过', real: '真实查询通过', restricted: '权限受限', failed: '失败' };

function ProviderEditor({ profile, refresh }: { profile: ProviderProfile; refresh: () => Promise<void> }) {
  const [config, setConfig] = useState<ProviderConfiguration>({ enabled: profile.enabled, region: profile.region,
    timeout_seconds: profile.timeout_seconds, cache_ttl_seconds: profile.cache_ttl_seconds, timeliness: profile.timeliness, cli_path: profile.cli_path });
  const [secrets, setSecrets] = useState<ProviderCredentials>({});
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  async function action(work: () => Promise<unknown>) {
    setBusy(true); setNotice('');
    try { await work(); await refresh(); setNotice('已保存当前操作。'); }
    catch { setNotice('操作失败，请检查配置或系统凭证存储。'); }
    finally { setSecrets({}); setBusy(false); }
  }
  const fields: (keyof ProviderCredentials)[] = profile.provider === 'massive' ? ['api_key'] : ['app_key', 'app_secret', 'access_token'];
  return <section className="connection settings-card" data-testid="provider-editor">
    <h3>{names[profile.provider]}配置</h3>
    <p>配置：{profile.configured ? '已保存' : '未配置'} · 凭证：{profile.credential_present ? '已保存（不回显）' : '未保存'} · Windows 凭证管理器</p>
    <form onSubmit={e => { e.preventDefault(); void action(() => window.researchTrail!.saveProvider(profile.provider, config)); }}>
      <label><input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} />启用此数据提供商</label>
      <label>服务区域<select aria-label="服务区域" value={config.region} onChange={e => setConfig({ ...config, region: e.target.value as 'global' | 'cn' })}><option value="global">全球</option><option value="cn">中国</option></select></label>
      <label>查询超时（秒）<input type="number" min="1" max="60" required value={config.timeout_seconds} onChange={e => setConfig({ ...config, timeout_seconds: Number(e.target.value) })} /></label>
      <label>行情缓存（秒，账户不缓存）<input type="number" min="0" max="300" required value={config.cache_ttl_seconds} onChange={e => setConfig({ ...config, cache_ttl_seconds: Number(e.target.value) })} /></label>
      <label>行情时效声明<select aria-label="行情时效声明" value={config.timeliness} onChange={e => setConfig({ ...config, timeliness: e.target.value as ProviderConfiguration['timeliness'] })}><option value="unknown">未知</option><option value="realtime">实时（自行声明）</option><option value="delayed">延迟（自行声明）</option><option value="historical">历史</option></select></label>
      <p>时效声明不证明服务商已授予实时权限。单项成功不代表其他能力可用。</p>
      {profile.provider !== 'massive' && <><label>Longbridge CLI 绝对路径（可选）<input value={config.cli_path} onChange={e => setConfig({ ...config, cli_path: e.target.value })} placeholder="C:\\tools\\longbridge.exe" /></label><p>CLI 仅补充账户身份、组合及部分日历查询，使用你已配置的 CLI 会话；其登录和存储由 CLI 管理，研迹不会发起登录。</p></>}
      <button disabled={busy}>保存提供商配置</button>
    </form>
    <form onSubmit={e => { e.preventDefault(); const input = { ...secrets }; setSecrets({}); void action(() => window.researchTrail!.saveProviderCredential(profile.provider, input)); }}>
      {fields.map(field => <label key={field}>{field === 'api_key' ? 'Massive API Key' : field === 'app_key' ? 'Longbridge App Key' : field === 'app_secret' ? 'Longbridge App Secret' : 'Longbridge Access Token'}<input type="password" autoComplete="off" required value={secrets[field] || ''} onChange={e => setSecrets({ ...secrets, [field]: e.target.value })} /></label>)}
      <p>先保存配置，再在本机输入凭证。行情与账户配置分别保存；不要把密钥发进聊天。</p>
      <button disabled={busy || !profile.configured}>保存提供商凭证</button>
      <button type="button" disabled={busy} onClick={() => void action(() => window.researchTrail!.deleteProviderCredential(profile.provider))}>删除提供商凭证</button>
      <button type="button" disabled={busy} onClick={() => void action(() => window.researchTrail!.deleteProvider(profile.provider))}>删除提供商配置</button>
    </form>
    <p role="status">{notice}</p>
  </section>;
}

export function ProviderPanel({ available }: { available: boolean }) {
  const [provider, setProvider] = useState<ProviderId>('longbridge');
  const [profiles, setProfiles] = useState<ProviderProfile[]>([]), [caps, setCaps] = useState<CapabilityView[]>([]);
  const [capability, setCapability] = useState<ReadQuery['capability']>('market.quote');
  const [mode, setMode] = useState<'simulated' | 'real'>('simulated'), [symbol, setSymbol] = useState('AAPL.US');
  const [period, setPeriod] = useState<ReadQuery['period']>('1d'), [eventType, setEventType] = useState<ReadQuery['event_type']>('report');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState<ProviderResult>();
  const generation = useRef(0);
  async function refresh() {
    const [rows, coverage] = await Promise.all([window.researchTrail!.providerProfiles(), window.researchTrail!.providerCapabilities()]);
    setProfiles(rows); setCaps(coverage);
  }
  useEffect(() => {
    let active = true;
    if (available && window.researchTrail) void Promise.all([window.researchTrail.providerProfiles(), window.researchTrail.providerCapabilities()])
      .then(([rows, coverage]) => { if (active) { setProfiles(rows); setCaps(coverage); } }).catch(() => { if (active) setError('无法读取提供商配置。'); });
    return () => { active = false; generation.current++; };
  }, [available]);
  const selected = profiles.find(p => p.provider === provider);
  const choices = caps.filter(c => c.provider === provider);
  function clear() { generation.current++; setResult(undefined); setError(''); setBusy(false); }
  async function query() {
    const id = ++generation.current; setBusy(true); setError(''); setResult(undefined);
    try {
      const supportsSymbol = !['market.sentiment', 'market.status', 'account.accounts', 'account.portfolio', 'account.assets'].includes(capability);
      const response = await window.researchTrail!.queryProvider(provider, { capability, mode, symbol: supportsSymbol ? symbol || null : null, period, event_type: eventType, count: 5, use_cache: true, market: 'US', kind: 'ALL' });
      if (id === generation.current) { setResult(response); await refresh(); }
    } catch { if (id === generation.current) setError('查询入口失败，请检查本地服务。'); }
    finally { if (id === generation.current) setBusy(false); }
  }
  return <section aria-label="数据与只读账户" className="provider-panel settings-card">
    <h2>数据与只读账户</h2>
    <p>默认使用自主编写的模拟数据。真实模式失败会直接显示错误；此入口不提供下单功能。现有会话行情工具仍使用模拟数据。</p>
    <label>数据提供商<select aria-label="数据提供商" disabled={!available || busy} value={provider} onChange={e => { clear(); const p = e.target.value as ProviderId; setProvider(p); setCapability(p === 'longbridge-account' ? 'account.positions' : 'market.quote'); }}>{Object.entries(names).map(([p, name]) => <option key={p} value={p}>{name}</option>)}</select></label>
    {selected && <ProviderEditor key={`${provider}-${selected.revision}-${selected.configured}`} profile={selected} refresh={async () => { clear(); await refresh(); }} />}
    <section className="connection">
      <h3>只读查询验收</h3>
      <label>查询模式<select aria-label="查询模式" disabled={busy} value={mode} onChange={e => { clear(); setMode(e.target.value as 'simulated' | 'real'); }}><option value="simulated">模拟响应（不请求服务商）</option><option value="real">真实查询（需要本机凭证与权限）</option></select></label>
      <label>查询能力<select aria-label="查询能力" disabled={busy} value={capability} onChange={e => { clear(); setCapability(e.target.value as ReadQuery['capability']); }}>{choices.map(c => <option key={c.capability} value={c.capability}>{c.capability}</option>)}</select></label>
      <label>股票代码（可留空查询全部账户）<input disabled={busy} value={symbol} onChange={e => { clear(); setSymbol(e.target.value); }} /></label>
      {capability === 'market.kline' && <label>K线周期<select aria-label="K线周期" disabled={busy} value={period} onChange={e => { clear(); setPeriod(e.target.value as ReadQuery['period']); }}>{['1m', '5m', '15m', '1h', '1d', '1w'].map(p => <option key={p}>{p}</option>)}</select></label>}
      {capability === 'research.events' && <label>日历类型<select aria-label="日历类型" disabled={busy} value={eventType} onChange={e => { clear(); setEventType(e.target.value as ReadQuery['event_type']); }}>{['financial', 'report', 'dividend', 'ipo', 'macrodata', 'closed'].map(p => <option key={p}>{p}</option>)}</select></label>}
      <button disabled={!available || busy || !choices.length} onClick={() => void query()}>{busy ? '正在查询…' : mode === 'real' ? '执行一次真实只读查询' : '验证模拟查询'}</button>
      <p>逐笔、新闻和K线最多显示5项；账户结果仅在本页显示，不写入运行数据库、行情缓存或诊断文件。</p>
      {error && <p role="alert">{error}</p>}
      {result && <div data-testid="provider-result" aria-live="polite">
        {result.ok ? <><p>{result.provenance.data_label} · {result.provenance.cached ? '缓存命中' : '本次获取'} · {result.provenance.transport}</p>
          <p>时效：{result.provenance.timeliness}（依据：{result.provenance.timeliness_basis}） · 权限：{result.provenance.permission}</p>
          <p>获取时间：{result.provenance.fetched_at} · 市场时间：{result.provenance.market_time || '未知'}</p>
          <pre style={{ overflowX: 'auto', maxHeight: 360 }}>{JSON.stringify(result.data, null, 2)}</pre></> : <p role="alert">{result.state === 'restricted' ? '权限受限' : result.state === 'unconfigured' ? '未配置' : '查询失败'} · {result.code} · {result.message}</p>}
      </div>}
    </section>
    <h3>当前提供商逐项状态</h3>
    <p>模拟通过只验证接口流程；每一项真实能力需要单独验收。</p>
    <ul data-testid="provider-capabilities">{choices.map(c => <li key={c.capability}>{c.capability} · {c.transport}{['research.events', 'company.financials'].includes(c.capability) ? '/部分条件 CLI' : ''} · {states[c.validation]} {c.code || ''}</li>)}</ul>
  </section>;
}
