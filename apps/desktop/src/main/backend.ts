import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Agent, get, request as httpRequest } from 'node:http';
import type { BackendState, RunStreamUpdate } from '../bridge';
import type { MarketError, MarketResult, MarketSnapshot, MarketSymbol } from '../market-types';
import type { SessionDTO, MessageDTO, RunDTO, StreamEvent, SessionSnapshot } from '../conversation-types';
import { RunSubscription } from './run-stream';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class BackendManager extends EventEmitter {
  private child?: ChildProcessWithoutNullStreams;
  private token = '';
  private port?: number;
  private state: BackendState = { phase: 'idle', detail: '等待本地服务启动。' };
  private restartTask?: Promise<BackendState>;
  private monitor?: ReturnType<typeof setInterval>;
  private checking = false;
  private quitting = false;
  private readonly subscriptions = new Map<string, RunSubscription>();
  // Health traffic must stay on loopback even when dependency downloads use a proxy.
  private readonly localAgent = new Agent({ keepAlive: true, proxyEnv: {} });

  constructor(private readonly root: string) { super(); }
  snapshot(): BackendState { return { ...this.state }; }
  private update(state: BackendState) {
    this.state = state;
    if (state.phase !== 'healthy') this.stopSubscriptions();
    this.emit('status', this.snapshot());
  }
  private safeError(text: string) {
    return (this.token ? text.replaceAll(this.token, '[redacted]') : text).slice(-1800);
  }

  retry(): Promise<BackendState> {
    if (this.quitting) return Promise.resolve(this.snapshot());
    if (this.restartTask) return this.restartTask;
    this.restartTask = this.restart().catch((error: Error) => {
      if (!this.quitting) this.update({ phase: 'failed', detail: this.safeError(error.message) });
      return this.snapshot();
    }).finally(() => { this.restartTask = undefined; });
    return this.restartTask;
  }

  private async restart(): Promise<BackendState> {
    await this.stopChild();
    if (this.quitting) return this.snapshot();
    this.update({ phase: 'starting', detail: '正在启动本地服务并检查连接…' });
    this.token = randomBytes(32).toString('hex');
    const python = process.env.RESEARCH_TRAIL_PYTHON || join(this.root, 'services/backend/.venv/Scripts/python.exe');
    const child = spawn(python, ['-m', 'research_trail'], {
      cwd: join(this.root, 'services/backend'),
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONUTF8: '1', RESEARCH_TRAIL_TOKEN: this.token },
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    this.child = child;
    let stderr = '';
    child.stderr.on('data', (data: Buffer) => { stderr = this.safeError(stderr + data.toString('utf8')); });
    // stdin can close before shutdown is written after an abnormal process exit.
    child.stdin.on('error', () => {});
    child.on('exit', (code, signal) => {
      if (this.child !== child || this.quitting || this.state.phase === 'stopping') return;
      this.port = undefined;
      this.update({ phase: 'failed', detail: `本地服务已退出（${signal || code}）。${stderr || '请点击重试启动。'}` });
    });
    try {
      this.port = await new Promise<number>((resolve, reject) => {
        const lines = createInterface({ input: child.stdout });
        const timer = setTimeout(() => finish(new Error('本地服务启动超过 15 秒。')), 15000);
        const onError = (error: NodeJS.ErrnoException) => finish(new Error(
          error.code === 'ENOENT' ? '未找到 Python 可执行文件。请重新运行 start-dev.cmd 同步环境，或检查 RESEARCH_TRAIL_PYTHON。' : `无法启动 Python（${error.code || error.message}）。`,
        ));
        const onExit = () => finish(new Error(`Python 在就绪前退出。${stderr || '请重新运行 start-dev.cmd 检查环境。'}`));
        const finish = (error?: Error, port?: number) => {
          clearTimeout(timer); lines.close();
          child.off('error', onError); child.off('exit', onExit);
          if (error) reject(error); else resolve(port!);
        };
        child.once('error', onError); child.once('exit', onExit);
        lines.on('line', (line) => {
          try {
            const ready = JSON.parse(line);
            if (ready.type === 'ready' && Number.isInteger(ready.port) && ready.port > 0 && ready.port <= 65535) finish(undefined, ready.port);
          } catch { /* Non-protocol stdout is ignored; no secret or logs reach the renderer. */ }
        });
      });
      // Lifespan notification precedes accepting connections; poll with a bounded deadline.
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Python 启动后退出。${stderr}`);
        try {
          const health = await this.fetchHealth();
          if (this.quitting || this.child !== child) return this.snapshot();
          this.update({ phase: 'healthy', detail: '本地服务已连接。', ...health });
          this.monitor = setInterval(() => { void this.check(); }, 3000);
          return this.snapshot();
        } catch { await delay(100); }
      }
      throw new Error('Python 已启动，但健康接口在限定时间内没有响应。请检查环境后重试。');
    } catch (error) {
      await this.stopChild();
      if (!this.quitting) this.update({ phase: 'failed', detail: this.safeError((error as Error).message) });
      return this.snapshot();
    }
  }

  private async fetchHealth() {
    if (!this.port) throw new Error('服务端口尚未就绪。');
    const body = await new Promise<{ status: string; service: string; python_version: string }>((resolve, reject) => {
      const request = get(`http://127.0.0.1:${this.port}/health`, {
        agent: this.localAgent, headers: { 'X-ResearchTrail-Token': this.token },
      }, (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          data += chunk;
          if (data.length > 8192) request.destroy(new Error('健康响应过大。'));
        });
        response.on('error', reject);
        response.on('end', () => {
          if (response.statusCode !== 200) { reject(new Error(`健康接口返回 HTTP ${response.statusCode}。`)); return; }
          try { resolve(JSON.parse(data)); } catch { reject(new Error('健康接口返回了无效 JSON。')); }
        });
      });
      const timer = setTimeout(() => request.destroy(new Error('健康检查超过 2 秒。')), 2000);
      request.once('close', () => clearTimeout(timer));
      request.once('error', reject);
    });
    if (body.status !== 'ok' || body.service !== 'research-trail' || typeof body.python_version !== 'string') throw new Error('健康接口返回了不符合契约的数据。');
    return { checkedAt: new Date().toISOString(), pythonVersion: body.python_version as string };
  }

  private async localRequest(path: string, method = 'GET', payload?: unknown, sse = false, timeoutMs = 3000): Promise<{ status: number; body: unknown }> {
    if (this.state.phase !== 'healthy' || !this.port || this.quitting) throw new Error('本地服务尚未就绪，请检查后端连接。');
    const child = this.child;
    const port = this.port;
    const token = this.token;
    const result = await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const dataOut = payload === undefined ? undefined : JSON.stringify(payload);
      const request = httpRequest(`http://127.0.0.1:${port}${path}`, {
        method, agent: this.localAgent, headers: { 'X-ResearchTrail-Token': token,
          ...(dataOut === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dataOut) }) },
      }, (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          data += chunk;
          if (data.length > 262144) request.destroy(new Error('本地接口响应过大。'));
        });
        response.on('error', reject);
        response.on('end', () => {
          if (sse && response.statusCode === 200 && !response.headers['content-type']?.startsWith('text/event-stream')) {
            reject(new Error('事件接口未返回SSE。')); return;
          }
          try { resolve({ status: response.statusCode || 0, body: response.statusCode === 204 ? undefined : sse && response.statusCode === 200 ? data : JSON.parse(data) }); }
          catch { reject(new Error('本地接口返回了无效 JSON。')); }
        });
      });
      const timer = setTimeout(() => request.destroy(new Error('本地请求超时。')), timeoutMs);
      request.once('close', () => clearTimeout(timer));
      request.once('error', reject);
      request.end(dataOut);
    });
    if (this.child !== child || this.state.phase !== 'healthy' || this.quitting) throw new Error('查询期间后端连接已变化，请重新查询。');
    return result;
  }

  async marketSymbols(): Promise<MarketSymbol[]> {
    const result = await this.localRequest('/market/symbols');
    if (result.status !== 200 || !Array.isArray(result.body)) throw new Error('无法读取模拟股票列表。');
    return result.body as MarketSymbol[];
  }

  async marketSnapshot(symbol: unknown): Promise<MarketResult> {
    if (typeof symbol !== 'string' || !/^[A-Z0-9]{1,6}\.US$/.test(symbol)) {
      return { ok: false, error: { code: 'INVALID_SYMBOL', message: '代码格式无效，请使用 AAPL.US 等格式。' } };
    }
    try {
      const result = await this.localRequest(`/market/snapshot/${encodeURIComponent(symbol)}`);
      if (result.status === 404) return { ok: false, error: result.body as MarketError };
      if (result.status !== 200) throw new Error(`行情接口返回 HTTP ${result.status}。`);
      return { ok: true, data: result.body as MarketSnapshot };
    } catch (error) {
      return { ok: false, error: { code: 'UNAVAILABLE', message: this.safeError((error as Error).message) } };
    }
  }

  private id(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) throw new Error('会话或运行ID格式无效。');
    return value;
  }

  private async business<T>(path: string, method = 'GET', payload?: unknown, timeoutMs = 3000): Promise<T> {
    const result = await this.localRequest(path, method, payload, false, timeoutMs);
    if (result.status < 200 || result.status >= 300) {
      const detail = (result.body as { detail?: unknown })?.detail;
      throw new Error(typeof detail === 'string' ? detail : `请求不符合契约（HTTP ${result.status}）。请检查输入。`);
    }
    return result.body as T;
  }

  listSessions() { return this.business<SessionDTO[]>('/sessions'); }
  private connectionKind(value: unknown): string {
    if (typeof value !== 'string' || !['model', 'market', 'account', 'skills', 'runtime'].includes(value)) throw new Error('未知连接类别。');
    return value;
  }
  connections() { return this.business<import('../settings-types').ConnectionView[]>('/settings/connections'); }
  workspaceState() { return this.business<import('../workspace-types').WorkspaceState>('/workspace'); }
  portfolioList() { return this.business<import('../portfolio-types').PortfolioInfo[]>('/portfolios'); }
  createPortfolio(body: unknown) { return this.business<import('../portfolio-types').PortfolioView>('/portfolios', 'POST', body); }
  portfolioView(id: unknown) { return this.business<import('../portfolio-types').PortfolioView>('/portfolios/view', 'POST', { portfolio_id: this.id(id) }); }
  previewPortfolio(id: unknown, csv: unknown) {
    if (typeof csv !== 'string' || Buffer.byteLength(csv,'utf8') > 131072 || csv.includes('\0')) throw new Error('CSV须为不超过128KiB的文本。');
    return this.business<import('../portfolio-types').ImportPreview>('/portfolios/preview', 'POST', { portfolio_id: this.id(id), csv_text: csv });
  }
  confirmPortfolio(id: unknown, draft: unknown) { return this.business<import('../portfolio-types').PortfolioView>('/portfolios/confirm', 'POST', { portfolio_id: this.id(id), draft_id: this.id(draft) }); }
  undoPortfolio(id: unknown, batch: unknown) { return this.business<import('../portfolio-types').PortfolioView>('/portfolios/undo', 'POST', { portfolio_id: this.id(id), batch_id: this.id(batch) }); }
  refreshPortfolio(id: unknown) { return this.business<import('../portfolio-types').PortfolioView>('/portfolios/refresh', 'POST', { portfolio_id: this.id(id) }, 65000); }
  addWatch(symbol: unknown) { return this.business<import('../workspace-types').WorkspaceState>('/workspace/watchlist', 'POST', { symbol }); }
  removeWatch(symbol: unknown) { return this.business<import('../workspace-types').WorkspaceState>('/workspace/watchlist/remove', 'POST', { symbol }); }
  selectSecurity(symbol: unknown) { return this.business<import('../workspace-types').WorkspaceState>('/workspace/selection', 'PUT', { symbol }); }
  securityPage(query: unknown) { return this.business<import('../workspace-types').SecurityPage>('/workspace/page', 'POST', query, 65000); }
  private providerId(value: unknown) {
    if (typeof value !== 'string' || !['longbridge', 'longbridge-account', 'massive'].includes(value)) throw new Error('不支持的数据提供商。');
    return value;
  }
  providerProfiles() { return this.business<import('../provider-types').ProviderProfile[]>('/settings/providers'); }
  saveProvider(provider: unknown, body: unknown) { return this.business<import('../provider-types').ProviderProfile>(`/settings/providers/${this.providerId(provider)}`, 'PUT', body); }
  deleteProvider(provider: unknown) { return this.business<import('../provider-types').ProviderProfile>(`/settings/providers/${this.providerId(provider)}`, 'DELETE'); }
  saveProviderCredential(provider: unknown, body: unknown) { return this.business<import('../provider-types').ProviderProfile>(`/settings/providers/${this.providerId(provider)}/credential`, 'PUT', body); }
  deleteProviderCredential(provider: unknown) { return this.business<import('../provider-types').ProviderProfile>(`/settings/providers/${this.providerId(provider)}/credential`, 'DELETE'); }
  providerCapabilities() { return this.business<import('../provider-types').CapabilityView[]>('/providers/capabilities'); }
  queryProvider(provider: unknown, body: unknown) { return this.business<import('../provider-types').ProviderResult>(`/providers/${this.providerId(provider)}/query`, 'POST', body, 65000); }
  saveConnection(kind: unknown, body: unknown) {
    return this.business<import('../settings-types').ConnectionView>(`/settings/connections/${this.connectionKind(kind)}`, 'PUT', body);
  }
  deleteConnection(kind: unknown) {
    return this.business<import('../settings-types').ConnectionView>(`/settings/connections/${this.connectionKind(kind)}`, 'DELETE');
  }
  saveCredential(kind: unknown, secret: unknown) {
    if (typeof secret !== 'string' || !secret.trim() || Buffer.byteLength(secret, 'utf8') > 2560 || secret.includes('\0')) throw new Error('凭证格式或长度无效。');
    return this.business<import('../settings-types').ConnectionView>(`/settings/connections/${this.connectionKind(kind)}/credential`, 'PUT', { secret });
  }
  deleteCredential(kind: unknown) {
    return this.business<import('../settings-types').ConnectionView>(`/settings/connections/${this.connectionKind(kind)}/credential`, 'DELETE');
  }
  testConnection(kind: unknown) {
    return this.business<import('../settings-types').ConnectionView>(`/settings/connections/${this.connectionKind(kind)}/test`, 'POST');
  }
  profile() { return this.business<import('../settings-types').Profile>('/settings/profile'); }
  saveProfile(body: unknown) { return this.business<import('../settings-types').Profile>('/settings/profile', 'PUT', body); }
  deleteProfile() { return this.business<import('../settings-types').Profile>('/settings/profile', 'DELETE'); }
  diagnostics() { return this.business<import('../settings-types').Diagnostics>('/settings/diagnostics'); }
  createSession(title: unknown) {
    if (typeof title !== 'string' || title.length > 80 || !title.trim()) throw new Error('标题需要1至80个字符。');
    return this.business<SessionDTO>('/sessions', 'POST', { title });
  }
  getSession(id: unknown) { return this.business<SessionDTO>(`/sessions/${this.id(id)}`); }
  deleteSession(id: unknown) { return this.business<void>(`/sessions/${this.id(id)}`, 'DELETE'); }
  sessionMessages(id: unknown) { return this.business<MessageDTO[]>(`/sessions/${this.id(id)}/messages`); }
  sessionRuns(id: unknown) { return this.business<RunDTO[]>(`/sessions/${this.id(id)}/runs`); }
  startRun(id: unknown, input: unknown) {
    if (typeof input !== 'string' || input.length > 2000 || !input.trim()) throw new Error('测试输入需要1至2000个字符。');
    return this.business<RunDTO>(`/sessions/${this.id(id)}/runs`, 'POST', { input });
  }
  startAgentRun(id: unknown, input: unknown, scenario: unknown = 'normal', kind: unknown = 'fake_agent') {
    if (typeof input !== 'string' || input.length > 2000 || !input.trim()) throw new Error('规则演示输入需要1至2000个字符。');
    if (!['normal', 'delayed', 'timeout'].includes(scenario as string)) throw new Error('未知模拟工具时序。');
    if (!['fake_agent', 'openai_agent'].includes(kind as string)) throw new Error('未知模型类型。');
    if (kind === 'openai_agent' && scenario !== 'normal') throw new Error('真实模型不使用模拟工具时序。');
    return this.business<RunDTO>(`/sessions/${this.id(id)}/runs`, 'POST', { input, kind, scenario });
  }
  cancelRun(id: unknown, runId: unknown) { return this.business<RunDTO>(`/sessions/${this.id(id)}/runs/${this.id(runId)}/cancel`, 'POST'); }
  sessionSnapshot(id: unknown) { return this.business<SessionSnapshot>(`/sessions/${this.id(id)}/snapshot`); }
  subscribeRun(key: unknown, id: unknown, runId: unknown, after: unknown, update: (value: RunStreamUpdate) => void) {
    const subscriptionId = this.id(key), sessionId = this.id(id), run = this.id(runId);
    if (typeof after !== 'number' || !Number.isSafeInteger(after) || after < 0) throw new Error('事件游标必须是非负整数。');
    if (this.state.phase !== 'healthy' || !this.port || this.quitting) throw new Error('本地服务尚未就绪。');
    if (this.subscriptions.has(subscriptionId) || this.subscriptions.size >= 4) throw new Error('事件订阅数量超出限制。');
    const subscription = new RunSubscription({ port: this.port, token: this.token, agent: this.localAgent,
      sessionId, runId: run, after, update, closed: () => this.subscriptions.delete(subscriptionId) });
    this.subscriptions.set(subscriptionId, subscription);
    subscription.start();
  }
  unsubscribeRun(key: unknown) { this.subscriptions.get(this.id(key))?.stop(); }
  stopSubscriptions() { for (const subscription of this.subscriptions.values()) subscription.stop(); }
  getRun(id: unknown, runId: unknown) { return this.business<RunDTO>(`/sessions/${this.id(id)}/runs/${this.id(runId)}`); }
  async runEvents(id: unknown, runId: unknown, after: unknown = 0): Promise<StreamEvent[]> {
    const sessionId = this.id(id), run = this.id(runId);
    if (typeof after !== 'number' || !Number.isSafeInteger(after) || after < 0) throw new Error('事件游标必须是非负整数。');
    const result = await this.localRequest(`/sessions/${sessionId}/runs/${run}/events?after_sequence=${after}`, 'GET', undefined, true);
    if (result.status !== 200) throw new Error((result.body as { detail?: string }).detail || `事件读取失败（HTTP ${result.status}）。`);
    const events: StreamEvent[] = [];
    let sequence = after;
    for (const frame of (result.body as string).replaceAll('\r\n', '\n').split('\n\n').filter(Boolean)) {
      const fields = frame.split('\n');
      const data = fields.filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
      const event = JSON.parse(data) as StreamEvent;
      if (event.protocol_version !== 1 || event.session_id !== sessionId || event.run_id !== run ||
          event.sequence !== sequence + 1 || !['run_started', 'message_started', 'status', 'text_delta', 'message_completed', 'run_completed', 'tool_started', 'tool_result', 'error', 'cancelled'].includes(event.type) ||
          !fields.includes(`id: ${run}:${event.sequence}`) || !fields.includes(`event: ${event.type}`)) throw new Error('SSE事件身份、类型或序号不符合契约。');
      sequence = event.sequence;
      events.push(event);
    }
    return events;
  }

  async check(): Promise<BackendState> {
    if (this.checking || this.restartTask || this.state.phase !== 'healthy') return this.snapshot();
    const child = this.child;
    this.checking = true;
    try {
      const health = await this.fetchHealth();
      if (this.child === child && this.state.phase === 'healthy') this.update({ phase: 'healthy', detail: '本地服务已连接。', ...health });
    } catch (error) {
      if (this.child === child && this.state.phase === 'healthy') {
        this.update({ phase: 'failed', detail: `本地服务连接中断。${this.safeError((error as Error).message)} 请点击重试启动。` });
      }
    } finally { this.checking = false; }
    return this.snapshot();
  }

  private async stopChild() {
    this.stopSubscriptions();
    if (this.monitor) clearInterval(this.monitor);
    this.monitor = undefined;
    const child = this.child;
    this.child = undefined; this.port = undefined;
    if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) return;
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.stdin.end('shutdown\n');
    await Promise.race([exited, delay(2500)]);
    if (child.exitCode === null && child.signalCode === null) {
      // Direct Python child, no uv wrapper or reload workers. Never kill by image name.
      child.kill();
      await Promise.race([exited, delay(2000)]);
      if (child.exitCode === null && child.signalCode === null) throw new Error('本次 Python 子进程未能退出。请检查启动终端。');
    }
  }

  async dispose() {
    this.quitting = true;
    this.update({ phase: 'stopping', detail: '正在关闭本地服务…' });
    // Closing stdin also interrupts a startup that has not yet reported readiness.
    await this.stopChild();
    await this.restartTask;
    this.localAgent.destroy();
  }
}
