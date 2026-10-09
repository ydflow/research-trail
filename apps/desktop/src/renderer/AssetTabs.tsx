import { useEffect, useState } from 'react';
import type { WorkspaceState } from '../workspace-types';

export function AssetTabs({ available, view, onOpen }: { available: boolean; view: string; onOpen: () => void }) {
  const [state, setState] = useState<WorkspaceState>();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    if (!available || !window.researchTrail) { setState(undefined); return; }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try { const next = await window.researchTrail!.workspaceState(); if (active) { setState(next); setError(''); } }
      catch { if (active) setError('资产页签读取失败'); }
      finally { if (active) timer = setTimeout(() => void refresh(), 5000); }
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [available, view]);
  async function open(symbol: string) {
    if (busy) return;
    setBusy(true); setError('');
    try { setState(await window.researchTrail!.selectSecurity(symbol)); onOpen(); }
    catch { setError('证券选择未完成'); }
    finally { setBusy(false); }
  }
  return <section className="asset-strip" aria-label="常驻资产页签">
    <nav aria-label="自选资产">{state?.entries.map(entry => <button key={entry.symbol} disabled={busy || !available}
      aria-pressed={state.active_symbol === entry.symbol} onClick={() => void open(entry.symbol)}>{entry.symbol}<small>{entry.name}</small></button>)}</nav>
    {!state?.entries.length && <p>尚无自选资产；请在证券工作台添加。</p>}
    {error && <p role="status">{error}</p>}
  </section>;
}
