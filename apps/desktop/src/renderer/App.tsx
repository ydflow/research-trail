import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { BackendState, ResearchTrailBridge } from '../bridge';
import { MarketPanel } from './market/MarketPanel';
import { SessionPanel } from './SessionPanel';
import { SettingsPanel } from './settings/SettingsPanel';
import { ProviderPanel } from './ProviderPanel';
import { SecuritySnapshots } from './securities/security-snapshots';
import { SecurityWorkspace } from './securities/SecurityWorkspace';
import { AssetTabs } from './AssetTabs';
import { Navigation, type WorkbenchView } from './ui/Navigation';
import { StatusIndicator } from './ui/Primitives';
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
const TodayPanel = lazy(() => import('./today/TodayPanel').then(m => ({ default: m.TodayPanel })));
const OutcomePanel = lazy(() => import('./outcomes/OutcomePanel').then(m => ({ default: m.OutcomePanel })));
const EvaluationPanel = lazy(() => import('./evaluation/EvaluationPanel').then(m => ({ default: m.EvaluationPanel })));
const ThesisPanel = lazy(() => import('./theses/ThesisPanel').then(m => ({ default: m.ThesisPanel })));

export function App() {
  const [state, setState] = useState<BackendState>({ phase: 'idle', detail: '等待本地服务启动。' });
  const [snapshots] = useState(() => new SecuritySnapshots());
  const [busy, setBusy] = useState(false);
  const [assetRevision, setAssetRevision] = useState(0);
  const [researchSymbol, setResearchSymbol] = useState<string>();
  const [researchEntry, setResearchEntry] = useState(0);
  const [reportContext, setReportContext] = useState<import('../conversation-types').ReportCandidate>();
  const clearReportContext = useCallback(() => setReportContext(undefined), []);
  const navigation = useRef(0);
  const [researchEventRef,setResearchEventRef]=useState<import('../calendar-types').EventResearchRef>();
  const [discoveryTarget,setDiscoveryTarget]=useState<{symbols:string[]; mode:'simulated'|'real'; provider:'longbridge'|'massive'}>();
  const [view, setView] = useState<WorkbenchView>(() => {
    const saved = sessionStorage.getItem('research-trail.view');
    return saved === 'sessions' || saved === 'settings' || saved === 'providers' || saved === 'securities' || saved === 'portfolios' || saved === 'analytics' || saved === 'skills' || saved === 'research' || saved === 'theses' || saved === 'discover' || saved === 'calendar' || saved === 'today' || saved === 'evaluation' || saved === 'outcomes' ? saved : 'market';
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
  useEffect(() => { if (state.phase !== 'healthy') snapshots.clear(); }, [state.phase, snapshots]);
  const pending = busy || state.phase === 'starting' || state.phase === 'stopping';
  const navigate = (next: WorkbenchView) => { ++navigation.current; if (next === 'securities' || next === 'market') clearReportContext(); setView(next); };
  return (
    <div className="shell">
      <header className="app-toolbar">
        <div className="app-brand"><img className="brand-icon" src="./brand/research-trail.png" alt="研迹图标" width="32" height="32" /><div><span className="brand">研迹</span><span className="english">ResearchTrail</span></div></div>
      <section className="connection" aria-live="polite" aria-busy={pending}>
        <h1 className="connection-title">{titles[state.phase]}</h1>
        <StatusIndicator tone={state.phase === 'healthy' ? 'success' : state.phase === 'failed' ? 'error' : state.phase === 'starting' ? 'warning' : 'neutral'}>
          后端健康 <span data-testid="health-label">{labels[state.phase]}</span>
        </StatusIndicator>
        <details className="connection-details" open={state.phase === 'failed'}>
          <summary>连接详情</summary>
          <div><p className="detail">{state.detail}</p>
            <p className="timestamp">上次检查：{state.checkedAt ? new Date(state.checkedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '尚未完成'}</p>
          </div>
        </details>
        <button className="secondary" onClick={action} disabled={pending}>{pending ? '正在处理…' : state.phase === 'healthy' ? '重新检查' : '重试启动'}</button>
      </section>
      </header>
      <div className={`workbench${view === 'sessions' ? ' sessions-workbench' : ''}`}>
      <aside className="workbench-navigation" aria-label="工作台导航">
        <Navigation view={view} onSelect={navigate} />
        <p className="navigation-caption">每次研究，都有据可查。</p>
      </aside>
      <main className="workbench-content">
      <AssetTabs available={state.phase === 'healthy'} view={view} onSelectionStart={() => { clearReportContext(); return ++navigation.current; }} onOpen={ticket => { if (ticket !== navigation.current) return; setAssetRevision(n => n + 1); navigate('securities'); }} />
      {view === 'outcomes' ? <Suspense fallback={<p role="status">正在打开投资结果…</p>}><OutcomePanel available={state.phase === 'healthy'} /></Suspense> : view === 'evaluation' ? <Suspense fallback={<p role="status">正在打开评测中心…</p>}><EvaluationPanel available={state.phase === 'healthy'} /></Suspense> : view === 'today' ? <Suspense fallback={<p role="status">正在打开Today…</p>}><TodayPanel available={state.phase === 'healthy'} /></Suspense> : view === 'calendar' ? <Suspense fallback={<p role="status">正在打开事件日历…</p>}><CalendarPanel available={state.phase === 'healthy'} onResearch={target=>{setResearchEventRef(target.event_ref);setDiscoveryTarget({symbols:[target.symbol],mode:target.mode,provider:target.provider});setResearchSymbol(target.symbol);clearReportContext();setResearchEntry(n => n + 1);navigate('research');}} /></Suspense> : view === 'discover' ? <Suspense fallback={<p role="status">正在打开机会发现…</p>}><DiscoverPanel available={state.phase === 'healthy'} onCompare={target => {setDiscoveryTarget(target);setView('analytics');}} onResearch={target => {setResearchEventRef(undefined);setDiscoveryTarget(target);setResearchSymbol(target.symbols[0]);clearReportContext();setResearchEntry(n => n + 1);navigate('research');}} /></Suspense> : view === 'theses' ? <Suspense fallback={<p role="status">正在打开投资论点…</p>}><ThesisPanel available={state.phase === 'healthy'} /></Suspense> : view === 'research' ? <Suspense fallback={<p role="status">正在打开研究采集…</p>}><ResearchPanel available={state.phase === 'healthy'} initialSymbol={researchSymbol} initialMode={discoveryTarget?.mode} initialProvider={discoveryTarget?.provider} initialEventRef={researchEventRef} entryKey={researchEntry} onTaskChange={clearReportContext} onAssociateReport={setReportContext} /></Suspense> : view === 'skills' ? <Suspense fallback={<p role="status">正在打开技能目录…</p>}><SkillsPanel available={state.phase === 'healthy'} /></Suspense> : view === 'analytics' ? <Suspense fallback={<p role="status">正在打开风险与对比…</p>}><AnalyticsPanel available={state.phase === 'healthy'} initialSymbols={discoveryTarget?.symbols.join(' ')} initialMode={discoveryTarget?.mode} initialProvider={discoveryTarget?.provider} /></Suspense> : view === 'portfolios' ? <Suspense fallback={<p role="status">正在打开组合工作台…</p>}><PortfolioPanel available={state.phase === 'healthy'} /></Suspense> : view === 'securities' ? <SecurityWorkspace snapshots={snapshots} key={assetRevision} available={state.phase === 'healthy'} onResearch={symbol => { setResearchEventRef(undefined);setDiscoveryTarget(undefined);setResearchSymbol(symbol); clearReportContext();setResearchEntry(n => n + 1);navigate('research'); }} /> : view === 'market' ? <MarketPanel available={state.phase === 'healthy'} onOpenSecurity={async symbol => { if (!['AAPL.US', 'MSFT.US', 'NVDA.US', 'TSLA.US'].includes(symbol)) throw new Error('不支持的总览详情'); const ticket = ++navigation.current; clearReportContext(); await window.researchTrail!.selectSecurity(symbol); if (ticket !== navigation.current) return; setAssetRevision(n => n + 1); navigate('securities'); }} /> : view === 'sessions' ? null : view === 'providers' ? <ProviderPanel onConfigurationChange={provider => snapshots.invalidate(provider)} available={state.phase === 'healthy'} /> : <SettingsPanel available={state.phase === 'healthy'} />}
      </main>
      <aside className={view === 'sessions' ? 'workbench-conversation full-session-host' : 'workbench-copilot'} aria-label={view === 'sessions' ? '完整研究会话' : '常驻研究助手'}>
        <SessionPanel available={state.phase === 'healthy'} compact={view !== 'sessions'} reportContext={reportContext} onClearContext={clearReportContext} />
      </aside>
      </div>
      <footer>每次研究，都有据可查。</footer>
    </div>
  );
}
