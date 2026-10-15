import type { SecurityPage, SecurityQuery } from '../../workspace-types';

// Display snapshots only. Python remains the business-data authority. Never persisted.
export class SecuritySnapshots {
  controls = { view: 'overview', provider: 'longbridge', mode: 'simulated', period: '1d', kind: 'ALL', report: 'annual', offset: 0 } as Required<Omit<SecurityQuery, 'symbol'>>;
  private pages = new Map<string, SecurityPage>();
  private failures = new Map<string, string>();
  private pending = new Map<string, Promise<SecurityPage>>();
  private versions = new Map<string, string>();
  private epoch = 0;
  private revision = 0;
  private generations = new Map<string, number>();
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.revision;
  private changed() { this.revision++; for (const listener of this.listeners) listener(); }
  clear() { this.epoch++; this.generations.clear(); this.pages.clear(); this.failures.clear(); this.pending.clear(); this.versions.clear(); this.changed(); }
  invalidate(provider: string) {
    this.generations.set(provider, (this.generations.get(provider) ?? 0) + 1);
    for (const key of new Set([...this.pages.keys(), ...this.pending.keys()])) {
      if (JSON.parse(key)[1] === provider) { this.pages.delete(key); this.failures.delete(key); this.pending.delete(key); }
    }
    this.versions.delete(provider); this.changed();
  }
  version(provider: string, revision: number, configured: boolean, credential: boolean) {
    const next = JSON.stringify([revision, configured, credential]);
    if (this.versions.get(provider) !== next) { this.invalidate(provider); this.versions.set(provider, next); this.changed(); }
  }
  key(q: SecurityQuery, watchlist = '') {
    return JSON.stringify([q.symbol, q.provider, q.mode, q.view, q.period, q.kind, q.report, q.offset,
      this.versions.get(q.provider), q.view === 'watchlist' ? watchlist : '']);
  }
  get(key: string) { return this.pages.get(key); }
  error(key: string) { return this.failures.get(key); }
  async read(q: SecurityQuery, key: string, refresh = false): Promise<SecurityPage> {
    if (!refresh && this.pages.has(key)) return this.pages.get(key)!;
    if (this.pending.has(key)) return this.pending.get(key)!;
    const epoch = this.epoch, generation = this.generations.get(q.provider) ?? 0;
    const current = () => epoch === this.epoch && generation === (this.generations.get(q.provider) ?? 0);
    const request = window.researchTrail!.securityPage(q).then(page => {
      if (page.symbol !== q.symbol || page.provider !== q.provider || page.mode !== q.mode || page.view !== q.view) throw new Error('Context mismatch');
      if (!current()) throw new Error('Configuration changed');
      const old = this.pages.get(key);
      const failed = page.blocks.some(b => !['ready', 'missing'].includes(b.status));
      // Keep successful old blocks when a refresh partially fails, including provenance.
      const blocks = page.blocks.map(b => ['ready', 'missing'].includes(b.status) ? b : old?.blocks.find(p => p.capability === b.capability && p.symbol === b.symbol && p.status === 'ready') ?? b);
      const next = { ...page, blocks };
      this.pages.set(key, next);
      if (failed && old?.blocks.some(b => b.status === 'ready')) this.failures.set(key, '刷新失败或部分数据不可用；已保留成功快照。');
      else this.failures.delete(key);
      if (failed && old) throw new Error('刷新失败；保留上次查询快照。');
      return next;
    }).catch(error => {
      if (current()) this.failures.set(key, '刷新失败；保留上次查询快照，请显式重试。');
      throw error;
    }).finally(() => { if (this.pending.get(key) === request) this.pending.delete(key); this.changed(); });
    this.pending.set(key, request);
    return request;
  }
}
