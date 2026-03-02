import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  accentColor?: string;
}

export function StatCard({ label, value, subtext, icon, accentColor = '#4D8EFF' }: StatCardProps) {
  return (
    <div className="surface surface-hover flex items-start gap-3 p-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
        style={{
          background: `${accentColor}18`,
          color: accentColor,
          border: `1px solid ${accentColor}28`,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--c-text-secondary)' }}
        >
          {label}
        </p>
        <p
          className="mt-1 truncate text-xl font-bold tracking-tight font-mono"
          style={{ color: 'var(--c-text-primary)' }}
        >
          {value}
        </p>
        {subtext && (
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: 'var(--c-text-muted)' }}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  const pulse: React.CSSProperties = {
    background: 'var(--c-bg-elevated)',
    borderRadius: 6,
    animation: 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
  };
  return (
    <div className="surface flex items-start gap-3 p-4">
      <div style={{ ...pulse, width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
      <div className="flex-1 space-y-2 pt-0.5">
        <div style={{ ...pulse, height: 10, width: '55%' }} />
        <div style={{ ...pulse, height: 20, width: '70%' }} />
        <div style={{ ...pulse, height: 9, width: '40%' }} />
      </div>
    </div>
  );
}
