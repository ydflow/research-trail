import type { HTMLAttributes, ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral';

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="section-header"><h2>{title}</h2>{children && <div className="section-header-actions">{children}</div>}</div>;
}

export function SurfaceCard({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`surface-card ${className}`} />;
}

export function StatusIndicator({ tone = 'neutral', children }: { tone?: StatusTone; children: ReactNode }) {
  return <span className={`status-indicator status-${tone}`}><span className="status-dot" aria-hidden="true" />{children}</span>;
}

export function StateNotice({ kind, children, className = '' }: {
  kind: 'loading' | 'empty' | 'error' | 'info' | 'warning'; children: ReactNode; className?: string;
}) {
  return <p className={`state-notice state-${kind} ${className}`} role={kind === 'error' ? 'alert' : kind === 'empty' ? undefined : 'status'}>
    {kind === 'loading' && <span className="status-dot" aria-hidden="true" />}{children}
  </p>;
}
