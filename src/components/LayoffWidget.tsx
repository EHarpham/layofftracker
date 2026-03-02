import { useState, useEffect } from 'react';
import { useLayoffs } from '../hooks/useLayoffs';
import { StatCard, StatCardSkeleton } from './StatCard';
import { BreakdownBar } from './BreakdownBar';
import { EventsTable } from './EventsTable';

type Tab = 'overview' | 'events';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'events',    label: 'All Events' },
];

export function LayoffWidget() {
  const { data, stats, loading, error, refresh } = useLayoffs();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [eventsFilter, setEventsFilter] = useState('');
  const [filterKey, setFilterKey] = useState(0);
  const currentYear = new Date().getFullYear();

  // Reset filter when switching away from events
  useEffect(() => {
    if (activeTab !== 'events') setEventsFilter('');
  }, [activeTab]);

  function navigateToEvents(filterTerm: string) {
    setEventsFilter(filterTerm);
    setFilterKey((k) => k + 1);
    setActiveTab('events');
  }

  return (
    <div
      className="w-full max-w-3xl overflow-hidden"
      style={{
        background: 'var(--c-bg-widget)',
        border: '1px solid var(--c-border)',
        borderRadius: 14,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: 'var(--c-bg-header)',
          borderBottom: '1px solid var(--c-border)',
          padding: '14px 20px 0',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: source icon + title + live dot */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{
                background: 'var(--c-accent-bg)',
                color: 'var(--c-accent)',
                border: '1px solid var(--c-accent-border)',
              }}
            >
              LF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--c-text-primary)' }}
                >
                  Layoff Tracker
                </span>
                {/* Pulsing live dot */}
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ background: 'var(--c-green)' }}
                  />
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--c-green)' }}
                  />
                </span>
              </div>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: 'var(--c-text-secondary)' }}
              >
                Tech industry · layoffs.fyi
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-0.5">
            <button className="icon-btn" title="Refresh" onClick={() => refresh()}>
              ↺
            </button>
            <button className="icon-btn" title="Options">&#8943;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: 20 }}>
        {error ? (
          <div
            className="rounded-lg px-4 py-3 text-[13px]"
            style={{ background: 'var(--c-red-bg)', color: 'var(--c-red)', border: '1px solid rgba(194,88,88,0.2)' }}
          >
            {error}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : stats ? (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard label="Total Employees Laid Off" value={formatNumber(stats.totalEmployees)}
                    subtext="all tracked events" icon="👥" accentColor="#C25858" />
                  <StatCard label="Companies Affected" value={stats.totalCompanies}
                    subtext="in dataset" icon="🏢" accentColor="#D4A043" />
                  <StatCard label={`Layoffs in ${currentYear}`} value={formatNumber(stats.thisYear)}
                    subtext={`${currentYear} year-to-date`} icon="📅" accentColor="#4D8EFF" />
                  <StatCard label="Most Affected Industry" value={stats.topIndustry}
                    subtext={`${stats.topIndustryCount} events`} icon="📊" accentColor="#8B6FF0" />
                  <StatCard label="Avg % Workforce Cut" value={`${stats.avgPercentage}%`}
                    subtext="events with known %" icon="✂️" accentColor="#3ECF8E" />
                  {stats.worstCut && (
                    <StatCard label="Worst Single Cut" value={`${stats.worstCut.percentage}%`}
                      subtext={`${stats.worstCut.company} · ${formatDate(stats.worstCut.date)}`}
                      icon="🔻" accentColor="#C25858" />
                  )}
                </div>

                {/* Most recent strip */}
                {stats.latestEvent && (
                  <div
                    className="mt-3 flex items-center justify-between"
                    style={{
                      background: 'var(--c-bg-card)',
                      border: '1px solid var(--c-border)',
                      borderRadius: 10,
                      padding: '12px 16px',
                    }}
                  >
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--c-text-secondary)' }}
                      >
                        Most Recent
                      </p>
                      <p
                        className="mt-1 text-[14px] font-semibold"
                        style={{ color: 'var(--c-text-primary)' }}
                      >
                        {stats.latestEvent.company}
                        {stats.latestEvent.numEmployees > 0 && (
                          <span
                            className="ml-2 font-normal text-[13px]"
                            style={{ color: 'var(--c-text-secondary)' }}
                          >
                            – {formatNumber(stats.latestEvent.numEmployees)} employees
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="inline-block rounded-md px-3 py-1 text-[12px] font-mono font-medium"
                        style={{ background: 'var(--c-bg-elevated)', color: 'var(--c-text-primary)' }}
                      >
                        {formatDate(stats.latestEvent.date)}
                      </span>
                      <p
                        className="mt-1 text-[11px]"
                        style={{ color: 'var(--c-text-muted)' }}
                      >
                        {stats.latestEvent.industry}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Breakdown Charts ── */}
                <div className="mt-6 space-y-7">
                  <BreakdownBar
                    title="By Industry"
                    data={stats.byIndustry}
                    accentColor="#4D8EFF"
                    onItemClick={(name) => navigateToEvents(name)}
                  />
                  <div style={{ borderTop: '1px solid var(--c-border-subtle)' }} />
                  <BreakdownBar
                    title="By Country"
                    data={stats.byCountry}
                    accentColor="#3ECF8E"
                    onItemClick={(name) => navigateToEvents(name)}
                  />
                  <div style={{ borderTop: '1px solid var(--c-border-subtle)' }} />
                  <BreakdownBar
                    title="By Funding Stage"
                    data={stats.byStage}
                    accentColor="#D4A043"
                    onItemClick={(name) => navigateToEvents(name)}
                  />
                </div>
              </>
            )}

            {/* ── EVENTS TABLE ── */}
            {activeTab === 'events' && (
              <EventsTable key={filterKey} data={data} initialFilter={eventsFilter} />
            )}
          </>
        ) : null}
      </div>

      {/* ── Footer ── */}
      <div
        className="text-center"
        style={{
          borderTop: '1px solid var(--c-border-subtle)',
          padding: '10px 20px',
          background: 'var(--c-bg-header)',
        }}
      >
        <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
          {data.length > 0 && (
            <span>{data.length.toLocaleString()} events · </span>
          )}
          Source · 
          <a
            href="https://layoffs.fyi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--c-accent)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            layoffs.fyi
          </a>
        </p>
      </div>
    </div>
  );
}
