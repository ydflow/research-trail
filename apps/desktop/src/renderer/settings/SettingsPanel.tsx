/** Folio UI flow adaptation: SettingsView, ModelsTab, ConnectionsCenter,
 * ProfileSecurityView and DiagnosticsTab, source ba5dcdfd31b162f5edb8b908f7f099a560389326.
 * Retains tab/card/form semantics; all state comes from the Python settings API.
 * No Folio client, Jotai, i18n, account backend or TS kernel is imported.
 */
import { useEffect, useRef, useState } from 'react';
import type { ConnectionInput, ConnectionKind, ConnectionView, Diagnostics, Profile } from '../../settings-types';

const titles: Record<ConnectionKind, string> = { model: '模型', market: '行情', account: '账户', skills: '技能', runtime: '运行时' };
const statuses = { unconfigured: '未配置', untested: '待测试', ready: '假连接成功', failed: '失败', invalid: '已失效', disabled: '已停用' };
type Tab = 'model' | 'connections' | 'profile' | 'diagnostics';
const tabs: [Tab, string][] = [['model', '模型设置'], ['connections', '连接设置'], ['profile', '个人资料'], ['diagnostics', '诊断']];
const emptyProfile: Profile = { display_name: '', research_style: 'balanced' };

function ConnectionCard({ connection, available, onChange }: { connection: ConnectionView; available: boolean; onChange: (value: ConnectionView) => void }) {
  const [form, setForm] = useState<ConnectionInput>({ enabled: connection.enabled, endpoint: connection.endpoint,
    model: connection.model, requires_credential: connection.requires_credential, fake_result: connection.fake_result,
    max_tool_rounds: connection.max_tool_rounds, run_timeout_seconds: connection.run_timeout_seconds,
    request_timeout_seconds: connection.request_timeout_seconds, reasoning_effort: connection.reasoning_effort });
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const run = async (work: () => Promise<ConnectionView>, credential = false) => {
    setBusy(true); setError('');
    if (credential) setSecret(''); // Remove the input immediately, including failed saves.
    try { const next = await work(); if (live.current) onChange(next); }
    catch (error) { if (live.current) setError(error instanceof Error && error.message.includes('系统凭证存储不可用')
      ? '系统凭证存储不可用；凭证未保存到明文文件。' : '操作未完成。请检查地址格式、配置与系统凭证存储后重试。'); }
    finally { if (live.current) setBusy(false); }
  };
  const bridge = window.researchTrail!;
  const credentialKind = ['model', 'market', 'account'].includes(connection.kind);
  const dirty = form.enabled !== connection.enabled || form.endpoint !== connection.endpoint || form.model !== connection.model ||
    form.requires_credential !== connection.requires_credential || form.fake_result !== connection.fake_result ||
    form.max_tool_rounds !== connection.max_tool_rounds || form.run_timeout_seconds !== connection.run_timeout_seconds ||
    form.request_timeout_seconds !== connection.request_timeout_seconds || form.reasoning_effort !== connection.reasoning_effort;
  return <section className="settings-card" aria-label={`${titles[connection.kind]}连接`} data-testid={`connection-${connection.kind}`}>
    <div className="settings-card-heading"><h3>{titles[connection.kind]}</h3><span className={`settings-status ${connection.status}`} data-testid="connection-status">{statuses[connection.status]}</span></div>
    {connection.kind === 'skills' && <p>此处保留历史配置的假连接测试，不表示技能就绪。实际目录、开关和依赖状态请在“能力与技能”查看。</p>}
    <p className="detail">{connection.detail}</p>
    <p className="timestamp">测试模式：假连接 · 上次测试：{connection.checked_at ? new Date(connection.checked_at).toLocaleString('zh-CN') : '尚未测试'}</p>
    <fieldset disabled={!available || busy}>
      <label className="settings-check"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />启用此连接</label>
      {credentialKind ? <>
        <label>服务地址{connection.kind === 'model' ? '（Base URL，含/v1；真实运行时请求）' : '（选填，本步不请求）'}<input type="url" maxLength={200} value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })} placeholder="https://example.com/v1" /></label>
        {connection.kind === 'model' ? <label>模型名称（选填）<input maxLength={80} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="demo-model" /></label> : null}
        <label className="settings-check"><input type="checkbox" checked={form.requires_credential} onChange={e => setForm({ ...form, requires_credential: e.target.checked })} />测试前要求已保存凭证</label>
      </> : null}
      {connection.kind === 'model' ? <>
        <label>思考强度<select value={form.reasoning_effort} onChange={e => setForm({ ...form, reasoning_effort: e.target.value as ConnectionInput['reasoning_effort'] })}>
          <option value="default">服务商默认（不附加参数）</option><option value="none">关闭思考</option>
          <option value="low">低</option><option value="medium">中</option><option value="high">高</option>
        </select></label><p className="detail">仅适用于支持相应参数的模型；默认不附加思考参数。DeepSeek映射关闭/高，低/中会明确拒绝。开启思考的多轮工具协议仍需单独真实验证，不把回复中的推理元数据当作公开答案。</p>
        <label>工具轮数及累计调用上限<input type="number" min={1} max={32} value={form.max_tool_rounds} onChange={e => setForm({ ...form, max_tool_rounds: Number(e.target.value) })} /></label>
        <label>整体超时（秒）<input type="number" min={1} max={600} value={form.run_timeout_seconds} onChange={e => setForm({ ...form, run_timeout_seconds: Number(e.target.value) })} /></label>
        <label>单次模型请求超时（秒）<input type="number" min={1} max={120} value={form.request_timeout_seconds} onChange={e => setForm({ ...form, request_timeout_seconds: Number(e.target.value) })} /></label>
        <p className="detail">真实运行必须有Base URL、模型ID和系统存储中的API Key。远程地址使用HTTPS，本机可用HTTP。下面的“测试假连接”不请求模型；真实验证请到会话选择真实模型并运行。</p>
      </> : null}
      <label>假连接结果<select value={form.fake_result} onChange={e => setForm({ ...form, fake_result: e.target.value as ConnectionInput['fake_result'] })}>
        <option value="success">成功</option><option value="failure">失败</option><option value="invalid">失效</option>
      </select></label>
      <div className="settings-actions">
        <button onClick={() => void run(() => bridge.saveConnection(connection.kind, form))}>保存配置</button>
        <button disabled={!connection.configured || dirty} onClick={() => void run(() => bridge.testConnection(connection.kind))}>测试假连接</button>
        <button className="secondary" disabled={!connection.configured} onClick={() => {
          if (window.confirm(`删除${titles[connection.kind]}配置及其系统凭证？`)) void run(() => bridge.deleteConnection(connection.kind));
        }}>删除配置</button>
      </div>
      {dirty ? <p className="timestamp">有未保存修改；保存后再测试。</p> : null}
      {credentialKind ? <div className="credential-form">
        <p className="timestamp">系统凭证：{connection.credential_present ? '已保存（不回显）' : '未保存'} · 仅存于Windows凭证管理器</p>
        <label>新凭证<input type="password" autoComplete="new-password" maxLength={2560} value={secret} onChange={e => setSecret(e.target.value)} placeholder="假连接可留空；验收只用测试占位值" /></label>
        <div className="settings-actions">
          <button disabled={!connection.configured || !secret.trim()} onClick={() => { const value = secret; void run(() => bridge.saveCredential(connection.kind, value), true); }}>保存凭证</button>
          <button className="secondary" disabled={!connection.credential_present} onClick={() => {
            if (window.confirm(`删除${titles[connection.kind]}的系统凭证？`)) void run(() => bridge.deleteCredential(connection.kind), true);
          }}>删除凭证</button>
        </div>
      </div> : null}
    </fieldset>
    {error ? <p role="alert" className="settings-error">{error}</p> : null}
  </section>;
}

export function SettingsPanel({ available }: { available: boolean }) {
  const [tab, setTab] = useState<Tab>('model');
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [report, setReport] = useState<Diagnostics>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const id = ++generation.current;
    setConnections([]); setReport(undefined); setError(''); setProfile(emptyProfile); setNotice('');
    if (available && window.researchTrail) {
      setBusy(true);
      void Promise.all([window.researchTrail.connections(), window.researchTrail.profile()]).then(([rows, person]) => {
        if (id === generation.current) { setConnections(rows); setProfile(person); }
      }).catch(() => { if (id === generation.current) setError('设置读取失败，请重新进入设置页。'); })
        .finally(() => { if (id === generation.current) setBusy(false); });
    }
    return () => { generation.current++; };
  }, [available]);
  const work = async (action: (current: () => boolean) => Promise<void>) => {
    const id = generation.current;
    setBusy(true); setError(''); setNotice('');
    try { await action(() => id === generation.current); }
    catch { if (id === generation.current) setError('操作未完成，请检查本机连接后重试。'); }
    finally { if (id === generation.current) setBusy(false); }
  };
  const change = (value: ConnectionView) => {
    setConnections(rows => rows.map(row => row.kind === value.kind ? value : row));
    setReport(undefined);
  };
  const bridge = window.researchTrail;
  return <section className="settings-panel" aria-label="设置与诊断">
    <div className="market-heading"><h2>设置与诊断</h2><span className="mock-badge">连接探针仍为假测试</span></div>
    <p className="detail">五类连接分别保存和测试。假连接成功只说明状态流程通过；会话可主动选择真实模型，行情工具仍为模拟数据。</p>
    <div className="settings-actions"><button disabled={!available || busy || !bridge} onClick={() => void work(async current => {
      const values = await bridge!.connections(); if (current()) { setConnections(values); setReport(undefined); setNotice('已重新读取各连接状态。'); }
    })}>重新读取状态</button></div>
    <nav className="view-tabs settings-tabs" aria-label="设置分区">{tabs.map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setNotice(''); }}>{label}</button>)}</nav>
    {!available ? <p role="status">后端未连接，设置操作暂不可用。</p> : null}
    {error ? <p role="alert" className="settings-error">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {busy ? <p role="status">正在处理…</p> : null}
    {available && !busy && (tab === 'model' || tab === 'connections') && !connections.length ? <p role="alert">设置尚未读取。请点击“重新读取状态”；若仍失败，请退出并重新打开研迹以加载当前后端及数据库迁移。</p> : null}
    {tab === 'model' || tab === 'connections' ? <div className={`settings-grid${tab === 'model' ? ' model-settings-grid' : ''}`}>{connections.filter(row => tab === 'model' ? row.kind === 'model' : row.kind !== 'model').map(row =>
      <ConnectionCard key={`${row.kind}:${row.revision}:${available}`} connection={row} available={available && !busy} onChange={change} />)}</div> : null}
    {tab === 'profile' ? <section className="settings-card" aria-label="个人资料">
      <h3>本机研究资料</h3><p className="detail">本步保存显示名称和研究偏好，不创建云端账户或交易账户。</p>
      <fieldset disabled={!available || busy || !bridge}>
        <label>显示名称<input maxLength={40} value={profile.display_name} onChange={e => setProfile({ ...profile, display_name: e.target.value })} /></label>
        <label>研究偏好<select value={profile.research_style} onChange={e => setProfile({ ...profile, research_style: e.target.value as Profile['research_style'] })}><option value="balanced">均衡</option><option value="cautious">审慎</option><option value="exploratory">探索</option></select></label>
        <div className="settings-actions"><button onClick={() => void work(async current => { const saved = await bridge!.saveProfile(profile); if (current()) { setProfile(saved); setNotice('个人资料已保存。'); } })}>保存资料</button>
          <button className="secondary" onClick={() => { if (window.confirm('删除本机个人资料？')) void work(async current => { const saved = await bridge!.deleteProfile(); if (current()) { setProfile(saved); setNotice('个人资料已删除。'); } }); }}>删除资料</button></div>
      </fieldset>
      <h3 className="profile-health-title">各连接独立状态</h3><ul className="profile-health">{connections.map(row => <li key={row.kind}>{titles[row.kind]}<span>{statuses[row.status]}</span></li>)}</ul>
    </section> : null}
    {tab === 'diagnostics' ? <section className="settings-card" aria-label="诊断">
      <h3>脱敏诊断</h3><p className="detail">仅包含五类连接探针状态、凭证是否存在和测试时间。test_mode及real_requests_sent仅描述这些假探针；真实模型结果与错误见会话运行记录。排除密钥、服务地址、个人资料、本机路径及环境变量。</p>
      <div className="settings-actions"><button disabled={!available || busy || !bridge} onClick={() => void work(async current => { const value = await bridge!.diagnostics(); if (current()) setReport(value); })}>读取诊断</button>
        <button disabled={!available || busy || !bridge} onClick={() => void work(async current => { const saved = await bridge!.exportDiagnostics(); if (current()) setNotice(saved ? '脱敏诊断已保存。' : '已取消导出。'); })}>导出脱敏诊断</button></div>
      {report ? <pre data-testid="diagnostics-json">{JSON.stringify(report, null, 2)}</pre> : null}
    </section> : null}
  </section>;
}
