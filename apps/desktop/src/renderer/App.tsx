import { lazy, Suspense, useEffect, useState } from 'react';
import type { BackendState, ResearchTrailBridge } from '../bridge';
import { MarketPanel } from './market/MarketPanel';
import { SessionPanel } from './SessionPanel';
import { SettingsPanel } from './settings/SettingsPanel';
import { ProviderPanel } from './ProviderPanel';
import { SecurityWorkspace } from './securities/SecurityWorkspace';
const AnalyticsPanel = lazy(() => import('./analytics/AnalyticsPanel').then(module => ({ default: module.AnalyticsPanel })));
const PortfolioPanel = lazy(() => import('./portfolio/PortfolioPanel').then(module => ({ default: module.PortfolioPanel })));

declare global { interface Window { researchTrail?: ResearchTrailBridge } }
const unavailable: BackendState = { phase: 'failed', detail: '桌面通信桥不可用。请通过 start-dev.cmd 打开研迹桌面应用。' };
const titles = { idle: '准备连接', starting: '正在连接', healthy: '连接就绪', failed: '连接未就绪', stopping: '正在关闭' };
const labels = { idle: '尚未启动', starting: '启动中', healthy: '运行正常', failed: '连接失败', stopping: '关闭中' };

const SkillsPanel = lazy(() => import('./skills/SkillsPanel').then(m => ({ default: m.SkillsPanel })));
const ResearchPanel = lazy(() => import('./research/ResearchPanel').then(m => ({ default: m.ResearchPanel })));

const DiscoverPanel = lazy(() => import('./discover/DiscoverPanel').then(m => ({ default: m.DiscoverPanel })));
const CalendarPanel = lazy(() => import('./calendar/CalendarPanel').then(m => ({ default: m.CalendarPanel })));
const ThesisPanel = lazy(() => import('./theses/ThesisPanel').then(m => ({ default: m.ThesisPanel })));

export function App() {
  const [state, setState] = useState<BackendState>({ phase: 'idle', detail: '等待本地服务启动。' });
  const [busy, setBusy] = useState(false);
  const [researchSymbol, setResearchSymbol] = useState<string>();
  const [researchEventRef,setResearchEventRef]=useState<import('../calendar-types').EventResearchRef>();
  const [discoveryTarget,setDiscoveryTarget]=useState<{symbols:string[]; mode:'simulated'|'real'; provider:'longbridge'|'massive'}>();
  const [view, setView] = useState<'market' | 'sessions' | 'settings' | 'providers' | 'securities' | 'portfolios' | 'analytics' | 'skills' | 'research' | 'theses' | 'discover' | 'calendar'>(() => {
    const saved = sessionStorage.getItem('research-trail.view');
    return saved === 'sessions' || saved === 'settings' || saved === 'providers' || saved === 'securities' || saved === 'portfolios' || saved === 'analytics' || saved === 'skills' || saved === 'research' || saved === 'theses' || saved === 'discover' || saved === 'calendar' ? saved : 'market';
  });
  useEffect(() => { sessionStorage.setItem('research-trail.view', view); }, [view]);
  useEffect(() => {
    const bridge = window.researchTrail;
    if (!bridge) { setState(unavailable); return; }
    let active = true;
    let receivedEvent = false;
    const unsubscribe = bridge.onStatus((next) => { receivedEvent = true; if (active) setState(next); });
    void bridge.status().then((initial) => { if (active && !receivedEvent) setState(initial); }).catch(() => { if (active) setState(unavailable); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const action = async () => {
    if (!window.researchTrail) { setState(unavailable); return; }
    setBusy(true);
    try {
      setState(await (state.phase === 'healthy' ? window.researchTrail.checkHealth() : window.researchTrail.retryBackend()));
    } catch { setState({ phase: 'failed', detail: '桌面通信请求失败。请关闭应用并重新运行 start-dev.cmd。' }); }
    finally { setBusy(false); }
  };
  const pending = busy || state.phase === 'starting' || state.phase === 'stopping';
  return (
    <div className="shell">
      <header><span className="brand">研迹</span><span className="english">ResearchTrail</span></header>
      <main>
      <section className="connection" aria-live="polite" aria-busy={pending}>
        <h1>{titles[state.phase]}</h1>
        <p className="detail">{state.detail}</p>
        <div className={`health-row ${state.phase}`}>
          <span className="health-name"><span className="dot" />后端健康</span>
          <span data-testid="health-label">{labels[state.phase]}</span>
        </div>
        <p className="timestamp">上次检查：{state.checkedAt ? new Date(state.checkedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '尚未完成'}</p>
        <button onClick={action} disabled={pending}>{pending ? '正在处理…' : state.phase === 'healthy' ? '重新检查' : '重试启动'}</button>
      </section>
      <nav className="view-tabs" aria-label="工作区">
        <button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>事件日历</button>
        <button aria-pressed={view === 'discover'} onClick={() => setView('discover')}>机会发现</button>
        <button aria-pressed={view === 'theses'} onClick={() => setView('theses')}>投资论点</button>
        <button aria-pressed={view === 'research'} onClick={() => setView('research')}>研究采集</button>
        <button aria-pressed={view === 'skills'} onClick={() => setView('skills')}>能力与技能</button>
        <button aria-pressed={view === 'analytics'} onClick={() => setView('analytics')}>风险与对比</button>
        <button aria-pressed={view === 'portfolios'} onClick={() => setView('portfolios')}>组合工作台</button>
        <button aria-pressed={view === 'securities'} onClick={() => setView('securities')}>证券工作台</button>
        <button aria-pressed={view === 'market'} onClick={() => setView('market')}>模拟行情</button>
        <button aria-pressed={view === 'sessions'} onClick={() => setView('sessions')}>会话与事件</button>
        <button aria-pressed={view === 'settings'} onClick={() => setView('settings')}>设置与诊断</button>
        <button aria-pressed={view === 'providers'} onClick={() => setView('providers')}>数据与只读账户</button>
      </nav>
      {view === 'calendar' ? <Suspense fallback={<p role="status">正在打开事件日历…</p>}><CalendarPanel available={state.phase === 'healthy'} onResearch={target=>{setResearchEventRef(target.event_ref);setDiscoveryTarget({symbols:[target.symbol],mode:target.mode,provider:target.provider});setResearchSymbol(target.symbol);setView('research');}} /></Suspense> : view === 'discover' ? <Suspense fallback={<p role="status">正在打开机会发现…</p>}><DiscoverPanel available={state.phase === 'healthy'} onCompare={target => {setDiscoveryTarget(target);setView('analytics');}} onResearch={target => {setResearchEventRef(undefined);setDiscoveryTarget(target);setResearchSymbol(target.symbols[0]);setView('research');}} /></Suspense> : view === 'theses' ? <Suspense fallback={<p role="status">正在打开投资论点…</p>}><ThesisPanel available={state.phase === 'healthy'} /></Suspense> : view === 'research' ? <Suspense fallback={<p role="status">正在打开研究采集…</p>}><ResearchPanel available={state.phase === 'healthy'} initialSymbol={researchSymbol} initialMode={discoveryTarget?.mode} initialProvider={discoveryTarget?.provider} initialEventRef={researchEventRef} /></Suspense> : view === 'skills' ? <Suspense fallback={<p role="status">正在打开技能目录…</p>}><SkillsPanel available={state.phase === 'healthy'} /></Suspense> : view === 'analytics' ? <Suspense fallback={<p role="status">正在打开风险与对比…</p>}><AnalyticsPanel available={state.phase === 'healthy'} initialSymbols={discoveryTarget?.symbols.join(' ')} initialMode={discoveryTarget?.mode} initialProvider={discoveryTarget?.provider} /></Suspense> : view === 'portfolios' ? <Suspense fallback={<p role="status">正在打开组合工作台…</p>}><PortfolioPanel available={state.phase === 'healthy'} /></Suspense> : view === 'securities' ? <SecurityWorkspace available={state.phase === 'healthy'} onResearch={symbol => { setResearchEventRef(undefined);setDiscoveryTarget(undefined);setResearchSymbol(symbol); setView('research'); }} /> : view === 'market' ? <MarketPanel available={state.phase === 'healthy'} /> : view === 'sessions' ? <SessionPanel available={state.phase === 'healthy'} /> : view === 'providers' ? <ProviderPanel available={state.phase === 'healthy'} /> : <SettingsPanel available={state.phase === 'healthy'} />}
      </main>
      <footer>每次研究，都有据可查。</footer>
    </div>
  );
}
