import { useEffect, useRef, useState } from 'react';
import type { CapabilityState, SkillContext, SkillResource, SkillView } from '../../skill-types';
import './skills.css';

const status = { ready: '依赖就绪', partial: '部分就绪', unavailable: '不可用', disabled: '已禁用', invalid: '资料无效' };
export function SkillsPanel({ available }: { available: boolean }) {
  const [mode, setMode] = useState<SkillContext['mode']>('simulated');
  const [provider, setProvider] = useState<SkillContext['provider']>('longbridge');
  const [entries, setEntries] = useState<SkillView[]>([]);
  const [caps, setCaps] = useState<CapabilityState[]>([]);
  const [resource, setResource] = useState<SkillResource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const context = { mode, provider };

  useEffect(() => {
    const ticket = ++generation.current;
    setResource(null); setEntries([]); setCaps([]); setError('');
    if (!available || !window.researchTrail) { setBusy(false); return; }
    setBusy(true);
    void Promise.all([window.researchTrail.skills({ mode, provider }), window.researchTrail.capabilities({ mode, provider })])
      .then(([skills, capabilities]) => { if (ticket === generation.current) { setEntries(skills); setCaps(capabilities); } })
      .catch(() => { if (ticket === generation.current) setError('技能目录读取失败，请检查本机服务后刷新。'); })
      .finally(() => { if (ticket === generation.current) setBusy(false); });
    return () => { ++generation.current; };
  }, [available, mode, provider]);

  async function act(action: (ticket: number) => Promise<void>) {
    const ticket = ++generation.current;
    setBusy(true); setResource(null); setError('');
    try { await action(ticket); }
    catch (e) { if (ticket === generation.current) setError(e instanceof Error ? e.message : '操作失败。'); }
    finally { if (ticket === generation.current) setBusy(false); }
  }
  const disabled = busy || !available;
  return <section className="skills-panel" data-testid="skills-panel" aria-busy={busy}>
    <h2>能力与技能</h2>
    <p>依赖状态来自 Python 同一注册表。就绪只表示当前模式下的声明依赖可用；不证明数据完整、指标或研究策略已实现。</p>
    <label>技能数据模式<select aria-label="技能数据模式" value={mode} disabled={disabled} onChange={e => setMode(e.target.value as SkillContext['mode'])}><option value="simulated">模拟</option><option value="real">真实（逐项验证）</option></select></label>
    <label>技能数据提供商<select aria-label="技能数据提供商" value={provider} disabled={disabled} onChange={e => setProvider(e.target.value as SkillContext['provider'])}><option value="longbridge">Longbridge</option><option value="massive">Massive</option><option value="longbridge-account">Longbridge只读账户</option></select></label>
    <button disabled={disabled} onClick={() => void act(async ticket => { const [s, c] = await Promise.all([window.researchTrail!.skills(context), window.researchTrail!.capabilities(context)]); if (ticket === generation.current) { setEntries(s); setCaps(c); } })}>刷新技能状态</button>
    {error && <p role="alert">{error}</p>}
    {!busy && available && !entries.length && !error && <p>技能目录为空。</p>}
    {entries.map(s => <article key={s.id} data-testid={`skill-${s.id}`}>
      <h3>{s.name}</h3><p data-testid="skill-status">{status[s.status]} · {s.code} · {s.mode}</p>
      <details><summary>原技能说明（不代表当前实现）</summary><p>{s.description}</p></details>
      <button disabled={disabled} onClick={() => void act(async ticket => { await window.researchTrail!.setSkillEnabled(s.id, !s.enabled, context); const entries = await window.researchTrail!.skills(context); if (ticket === generation.current) setEntries(entries); })}>{s.enabled ? '禁用技能' : '启用技能'}</button>
      <ul>{[...s.required, ...s.optional].map((c, i) => <li key={`${c.id}:${i}`}>{i < s.required.length ? '必要' : '可选'} · {c.id} · {c.available ? '可用' : '不可用'} · {c.code}</li>)}</ul>
      {s.missing_resources.length > 0 && <p role="alert">缺少资料：{s.missing_resources.join('、')}</p>}
      <details><summary>参考资料与来源</summary><p>{s.source}</p><p>只在点击后读取文本；不运行脚本、CLI或资料指令。</p>
        <div className="skill-resources">{s.resources.map(path => <button key={path} disabled={disabled || s.missing_resources.includes(path) || !['ready', 'partial'].includes(s.status)} onClick={() => void act(async ticket => { const r = await window.researchTrail!.readSkillResource(s.id, path, context); if (ticket === generation.current) setResource(r); })}>读取 {path}</button>)}</div>
      </details>
    </article>)}
    {resource && <section data-testid="skill-resource"><h3>{resource.skill_id}/{resource.path}</h3><p>{resource.label}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 420, overflow: 'auto' }}>{resource.content}</pre></section>}
    <details><summary>当前能力注册表（{caps.length}）</summary><ul>{caps.map(c => <li key={c.id}>{c.id} · {c.available ? '可用' : '不可用'} · {c.code} · {c.tool_exposed ? 'Agent工具已暴露' : '无Agent工具暴露'}</li>)}</ul></details>
  </section>;
}
