import type { BreakdownEntry } from '../types/layoff';

interface BreakdownBarProps {
  title: string;
  data: BreakdownEntry[];
  accentColor?: string;
  onItemClick?: (name: string) => void;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function BreakdownBar({ title, data, accentColor = '#4D8EFF', onItemClick }: BreakdownBarProps) {
  const max = data[0]?.totalEmployees ?? 1;
  const top = data.slice(0, 8);

  return (
    <div>
      <p
        className="mb-4 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--c-text-secondary)' }}
      >
        {title}
      </p>
      <div className="space-y-3">
        {top.map((entry) => {
          const pct = max > 0 ? (entry.totalEmployees / max) * 100 : 0;
          return (
            <div
              key={entry.name}
              className={onItemClick ? 'cursor-pointer group' : ''}
              onClick={() => onItemClick?.(entry.name)}
            >
              <div className="mb-1.5 flex items-baseline justify-between">
                <span
                  className="text-[13px] font-medium truncate max-w-[55%] group-hover:underline"
                  style={{ color: 'var(--c-text-primary)' }}
                >
                  {entry.name}
                </span>
                <span className="shrink-0 ml-3 flex items-baseline gap-1.5">
                  <span
                    className="text-[13px] font-mono font-semibold"
                    style={{ color: 'var(--c-text-primary)' }}
                  >
                    {fmt(entry.totalEmployees)}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: 'var(--c-text-muted)' }}
                  >
                    {entry.eventCount}×
                  </span>
                </span>
              </div>
              <div
                className="h-1 w-full rounded-full"
                style={{ background: 'var(--c-border-subtle)' }}
              >
                <div
                  className="h-1 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(pct, 1.5)}%`, background: accentColor, opacity: 0.85 }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="text-[13px]" style={{ color: 'var(--c-text-muted)' }}>No data available.</p>
        )}
      </div>
    </div>
  );
}
