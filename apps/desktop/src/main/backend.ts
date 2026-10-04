import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Agent, get } from 'node:http';
import type { BackendState } from '../bridge';
import type { MarketError, MarketResult, MarketSnapshot, MarketSymbol } from '../market-types';

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
  // Health traffic must stay on loopback even when dependency downloads use a proxy.
  private readonly localAgent = new Agent({ keepAlive: true, proxyEnv: {} });

  constructor(private readonly root: string) { super(); }
  snapshot(): BackendState { return { ...this.state }; }
  private update(state: BackendState) {
    this.state = state;
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

  private async marketRequest(path: string): Promise<{ status: number; body: unknown }> {
    if (this.state.phase !== 'healthy' || !this.port || this.quitting) throw new Error('本地服务尚未就绪，请检查后端连接。');
    const child = this.child;
    const port = this.port;
    const token = this.token;
    const result = await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const request = get(`http://127.0.0.1:${port}${path}`, {
        agent: this.localAgent, headers: { 'X-ResearchTrail-Token': token },
      }, (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          data += chunk;
          if (data.length > 262144) request.destroy(new Error('行情响应过大。'));
        });
        response.on('error', reject);
        response.on('end', () => {
          try { resolve({ status: response.statusCode || 0, body: JSON.parse(data) }); }
          catch { reject(new Error('行情接口返回了无效 JSON。')); }
        });
      });
      const timer = setTimeout(() => request.destroy(new Error('行情请求超过 3 秒。')), 3000);
      request.once('close', () => clearTimeout(timer));
      request.once('error', reject);
    });
    if (this.child !== child || this.state.phase !== 'healthy' || this.quitting) throw new Error('查询期间后端连接已变化，请重新查询。');
    return result;
  }

  async marketSymbols(): Promise<MarketSymbol[]> {
    const result = await this.marketRequest('/market/symbols');
    if (result.status !== 200 || !Array.isArray(result.body)) throw new Error('无法读取模拟股票列表。');
    return result.body as MarketSymbol[];
  }

  async marketSnapshot(symbol: unknown): Promise<MarketResult> {
    if (typeof symbol !== 'string' || !/^[A-Z0-9]{1,6}\.US$/.test(symbol)) {
      return { ok: false, error: { code: 'INVALID_SYMBOL', message: '代码格式无效，请使用 AAPL.US 等格式。' } };
    }
    try {
      const result = await this.marketRequest(`/market/snapshot/${encodeURIComponent(symbol)}`);
      if (result.status === 404) return { ok: false, error: result.body as MarketError };
      if (result.status !== 200) throw new Error(`行情接口返回 HTTP ${result.status}。`);
      return { ok: true, data: result.body as MarketSnapshot };
    } catch (error) {
      return { ok: false, error: { code: 'UNAVAILABLE', message: this.safeError((error as Error).message) } };
    }
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
