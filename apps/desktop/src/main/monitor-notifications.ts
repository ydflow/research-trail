import type { MonitorRun } from '../monitoring-types';
type Delivery = 'shown' | 'failed' | 'unsupported';
export interface NotificationPort {
  pendingNotifications(): Promise<MonitorRun[]>;
  claimNotification(id: string): Promise<MonitorRun | null>;
  finishNotification(id: string,status: Delivery): Promise<MonitorRun>;
}

/** Python owns durable claims. No renderer payload can request arbitrary notifications. */
export class MonitorNotifications {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private stopped = true;
  constructor(private readonly backend: NotificationPort, private readonly show: (run: MonitorRun) => Promise<Delivery>) {}
  start() {
    if(this.timer) return;
    this.stopped=false;
    this.timer=setInterval(()=>{void this.poll();},3000);
  }
  stop() { this.stopped=true; if(this.timer) clearInterval(this.timer); this.timer=undefined; }
  async poll() {
    if(this.stopped || this.busy) return;
    this.busy=true;
    try {
      const pending=await this.backend.pendingNotifications();
      for(const item of pending) {
        if(this.stopped) break;
        const run=await this.backend.claimNotification(item.id);
        if(!run || this.stopped) continue;
        let delivery: Delivery;
        try { delivery=await this.show(run); } catch { delivery='failed'; }
        // Receipt failure leaves claimed/uncertain. It never causes another show().
        await this.backend.finishNotification(run.id,delivery);
      }
    } catch { /* Backend unavailable: retry reading pending only, never replay a claim. */ }
    finally { this.busy=false; }
  }
}
