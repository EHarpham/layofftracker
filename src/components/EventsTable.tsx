import { useState } from 'react';
import type { LayoffEvent } from '../types/layoff';

type SortKey = 'date' | 'company' | 'numEmployees' | 'percentage' | 'industry';
type SortDir = 'asc' | 'desc';

interface EventsTableProps {
  data: LayoffEvent[];
  initialFilter?: string;
}

function fmt(n: number): string {
  if (n <= 0) return '—';
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const COLS: { key: SortKey; label: string }[] = [
  { key: 'date',         label: 'Date' },
  { key: 'company',      label: 'Company' },
  { key: 'industry',     label: 'Industry' },
  { key: 'numEmployees', label: 'Laid Off' },
  { key: 'percentage',   label: '% Cut' },
];

function PctBadge({ pct }: { pct: number }) {
  if (pct <= 0) return <span style={{ color: 'var(--c-text-muted)' }}>—</span>;
  const [bg, color] =
    pct >= 15
      ? ['var(--c-red-bg)',   'var(--c-red)']
      : pct >= 8
      ? ['var(--c-amber-bg)', 'var(--c-amber)']
      : ['var(--c-green-bg)', 'var(--c-green)'];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono"
      style={{ background: bg, color }}
    >
      {pct}%
    </span>
  );
}

export function EventsTable({ data, initialFilter = '' }: EventsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [query, setQuery]     = useState(initialFilter);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const filtered = data.filter((e) => {
    const q = query.toLowerCase();
    return (
      e.company.toLowerCase().includes(q) ||
      e.industry.toLowerCase().includes(q) ||
      e.country.toLowerCase().includes(q) ||
      e.stage.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: string | number = a[sortKey];
    let vb: string | number = b[sortKey];
    if (sortKey === 'date') { va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const arrow = (key: SortKey) =>
    sortKey === key
      ? <span style={{ color: 'var(--c-accent)', fontSize: 10 }}>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
      : null;

  const thStyle: React.CSSProperties = {
    color: 'var(--c-text-secondary)',
    background: 'var(--c-bg-header)',
    padding: '7px 10px',
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    cursor: 'pointer',
    borderBottom: '1px solid var(--c-border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: 11,
    borderBottom: '1px solid var(--c-border-subtle)',
    color: 'var(--c-text-secondary)',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search by company, industry or country…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="term-input"
      />

      {/* Table */}
      <div
        className="overflow-x-auto"
        style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflowX: 'auto', overflowY: 'hidden' }}
      >
        <table style={{ minWidth: 700, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {COLS.map((col) => (
                <th key={col.key} style={thStyle} onClick={() => handleSort(col.key)}>
                  {col.label}{arrow(col.key)}
                </th>
              ))}
              <th style={thStyle}>Country</th>
              <th style={thStyle}>Stage</th>
              <th style={thStyle}>Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={i} className="tr-row" style={{ background: 'var(--c-bg-card)' }}>
                <td style={tdStyle}>{formatDate(e.date)}</td>
                <td style={{ ...tdStyle, color: 'var(--c-text-primary)', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.company}
                </td>
                <td style={tdStyle}>{e.industry || '—'}</td>
                <td style={{ ...tdStyle, color: 'var(--c-text-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                  {fmt(e.numEmployees)}
                </td>
                <td style={tdStyle}><PctBadge pct={e.percentage} /></td>
                <td style={tdStyle}>{e.country || '—'}</td>
                <td style={tdStyle}>
                  {e.stage ? (
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[11px]"
                      style={{ background: 'var(--c-accent-bg)', color: 'var(--c-accent)' }}
                    >
                      {e.stage}
                    </span>
                  ) : '—'}
                </td>
                <td style={tdStyle}>
                  {e.source ? (
                    <a
                      href={e.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--c-accent)', textDecoration: 'none', fontSize: 10 }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(ev) => (ev.currentTarget.style.textDecoration = 'none')}
                    >
                      Link ↗
                    </a>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...tdStyle, textAlign: 'center', padding: '28px 14px', color: 'var(--c-text-muted)' }}
                >
                  No events match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p
        className="text-right text-[11px]"
        style={{ color: 'var(--c-text-muted)' }}
      >
        {sorted.length} result{sorted.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
