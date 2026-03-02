import { useState, useEffect, useCallback } from 'react';
import type { BreakdownEntry, LayoffEvent, LayoffStats } from '../types/layoff';

// ---------------------------------------------------------------------------
// Live data source – layoffs.fyi Airtable tracker.
// The Vite dev server exposes /api/layoffs which fetches via the Airtable
// shared-view embed page (server-side, avoiding CORS issues).
// ---------------------------------------------------------------------------
const API_URL = '/api/layoffs';

const CACHE_KEY = 'layoff-tracker-v2'; // v2 = Airtable source (invalidates old CSV cache)
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Remove stale v1 cache entry on load
try { localStorage.removeItem('layoff-tracker-cache'); } catch { /* noop */ }

interface CacheEntry {
  timestamp: number;
  data: LayoffEvent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBreakdown(
  events: LayoffEvent[],
  key: keyof Pick<LayoffEvent, 'industry' | 'country' | 'stage'>,
): BreakdownEntry[] {
  const map: Record<string, BreakdownEntry> = {};
  for (const e of events) {
    const name = e[key] || 'Unknown';
    if (!map[name]) map[name] = { name, totalEmployees: 0, eventCount: 0 };
    map[name].eventCount += 1;
    if (e.numEmployees > 0) map[name].totalEmployees += e.numEmployees;
  }
  return Object.values(map).sort((a, b) => b.totalEmployees - a.totalEmployees);
}

function computeStats(events: LayoffEvent[]): LayoffStats {
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const totalEmployees = events.reduce(
    (sum, e) => sum + (e.numEmployees > 0 ? e.numEmployees : 0),
    0,
  );

  const currentYear = new Date().getFullYear();
  const thisYear = events
    .filter((e) => new Date(e.date).getFullYear() === currentYear)
    .reduce((sum, e) => sum + (e.numEmployees > 0 ? e.numEmployees : 0), 0);

  const industryCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.industry) {
      industryCounts[e.industry] = (industryCounts[e.industry] ?? 0) + 1;
    }
  }
  const topIndustry = Object.entries(industryCounts).sort((a, b) => b[1] - a[1])[0];

  const knownPct = events.filter((e) => e.percentage > 0);
  const avgPercentage =
    knownPct.length > 0
      ? Math.round(knownPct.reduce((s, e) => s + e.percentage, 0) / knownPct.length)
      : 0;
  const worstCut = knownPct.reduce<LayoffEvent | null>(
    (best, e) => (best === null || e.percentage > best.percentage ? e : best),
    null,
  );

  return {
    totalEmployees,
    totalCompanies: new Set(events.map((e) => e.company)).size,
    latestEvent: sorted[0] ?? null,
    topIndustry: topIndustry?.[0] ?? '—',
    topIndustryCount: topIndustry?.[1] ?? 0,
    thisYear,
    avgPercentage,
    worstCut,
    byIndustry: buildBreakdown(events, 'industry'),
    byCountry: buildBreakdown(events, 'country'),
    byStage: buildBreakdown(events, 'stage'),
  };
}

// ---------------------------------------------------------------------------
// Data fetching with localStorage cache
// ---------------------------------------------------------------------------

function readCache(): LayoffEvent[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: LayoffEvent[]): void {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* quota exceeded – silently ignore */ }
}

async function fetchLayoffs(bypassCache = false): Promise<LayoffEvent[]> {
  if (!bypassCache) {
    const cached = readCache();
    if (cached) return cached;
  }

  const url = bypassCache ? `${API_URL}?refresh=1` : API_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch data (${res.status})`);

  const records: LayoffEvent[] = await res.json();

  // Ensure sorted by date descending
  records.sort((a, b) => (b.date > a.date ? 1 : a.date > b.date ? -1 : 0));

  writeCache(records);
  return records;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLayoffs() {
  const [data, setData] = useState<LayoffEvent[]>([]);
  const [stats, setStats] = useState<LayoffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((bypassCache = false) => {
    setLoading(true);
    setError(null);

    fetchLayoffs(bypassCache)
      .then((rows) => {
        setData(rows);
        setStats(computeStats(rows));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, stats, loading, error, refresh } as const;
}
