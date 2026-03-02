/**
 * server/airtable.ts
 *
 * Fetches data from the layoffs.fyi Airtable embed (shared view).
 * Technique: load the embed page → extract the signed prefetch URL → call
 * readSharedViewData → map Airtable records to plain JSON objects.
 *
 * This runs server-side (Node / Vite dev server) because the Airtable API
 * blocks browser-origin CORS requests.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const EMBED_URL =
  'https://airtable.com/embed/app1PaujS9zxVGUZ4/shroKsHx3SdYYOzeh?backgroundColor=green&viewControls=on';

// ---------------------------------------------------------------------------
// In-memory cache (survives across requests while the dev-server is running)
// ---------------------------------------------------------------------------
let cachedPayload: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Types for the Airtable response
// ---------------------------------------------------------------------------
interface AirtableColumn {
  id: string;
  name: string;
  type: string;
  typeOptions?: {
    choices?: Record<string, { id: string; name: string }>;
    choiceOrder?: string[];
    [k: string]: unknown;
  };
}

interface AirtableRow {
  id: string;
  cellValuesByColumnId: Record<string, unknown>;
}

interface AirtableResponse {
  msg: string;
  data: {
    table: {
      id: string;
      name: string;
      columns: AirtableColumn[];
    };
    rows?: AirtableRow[];
    [k: string]: unknown;
  };
}

// Column field map (stable IDs from the shared view)
const COL = {
  company: 'fld9AHA9YDoNhrVFQ',
  locationHQ: 'fldeoYEol1GhizODE',
  numLaidOff: 'fldH1FcSF7DAaS1EB',
  date: 'fldaRiRVH3vaD9DRC',
  percentage: 'fldZRD6CwpFopYqqv',
  industry: 'fldZxgn3xoVqoHWuj',
  source: 'fldpt9Gt8PewUC1Sh',
  stage: 'fldoYp88YU5yEaK2P',
  raisedMM: 'fldiT8WOrVKce4LDj',
  country: 'fldATTnRRO0iX7jr0',
  dateAdded: 'fldwGtACkf7IYtRZ6',
} as const;

// ---------------------------------------------------------------------------
// Export: fetch & transform
// ---------------------------------------------------------------------------

export interface LayoffRecord {
  company: string;
  date: string;
  numEmployees: number;
  percentage: number;
  industry: string;
  country: string;
  stage: string;
  source: string;
  locationHQ?: string;
  raisedMM?: number;
}

export async function fetchAirtableData(
  bypassCache = false,
): Promise<LayoffRecord[]> {
  // Return cache if fresh
  if (!bypassCache && cachedPayload && Date.now() - cacheTimestamp < CACHE_TTL) {
    return JSON.parse(cachedPayload);
  }

  // ------ Step 1: Fetch the embed page to get session cookies ------
  const embedRes = await fetch(EMBED_URL, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  if (!embedRes.ok) throw new Error(`Embed page returned ${embedRes.status}`);

  const html = await embedRes.text();

  // Collect cookies from the response
  let cookies = '';
  if (typeof embedRes.headers.getSetCookie === 'function') {
    cookies = embedRes.headers.getSetCookie().map((c: string) => c.split(';')[0]).join('; ');
  } else {
    const raw = embedRes.headers.get('set-cookie') ?? '';
    cookies = raw.split(/,(?=[^ ])/).map((c: string) => c.split(';')[0]).join('; ');
  }

  // ------ Step 2: Extract the signed prefetch URL ------
  const urlMatch = html.match(/urlWithParams:\s*"([^"]+)"/);
  if (!urlMatch) throw new Error('Could not find prefetch URL in embed page');

  const prefetchPath = urlMatch[1]
    .replace(/\\u002F/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003E/g, '>');

  const fullUrl = `https://airtable.com${prefetchPath}`;

  // Extract pageLoadId for the required header
  const pgldMatch = html.match(/"pageLoadId":"([^"]+)"/);
  const pageLoadId = pgldMatch?.[1] ?? '';

  // ------ Step 3: Call readSharedViewData ------
  const dataRes = await fetch(fullUrl, {
    headers: {
      'User-Agent': UA,
      Cookie: cookies,
      'x-airtable-page-load-id': pageLoadId,
      'x-requested-with': 'XMLHttpRequest',
      'x-airtable-application-id': 'app1PaujS9zxVGUZ4',
      'x-airtable-inter-service-client': 'webClient',
      'x-time-zone': 'America/New_York',
      'x-user-locale': 'en',
      Accept: 'application/json',
      Referer: EMBED_URL,
    },
  });

  if (!dataRes.ok) {
    const body = await dataRes.text().catch(() => '');
    throw new Error(`readSharedViewData returned ${dataRes.status}: ${body}`);
  }

  const payload = (await dataRes.json()) as AirtableResponse;
  if (payload.msg !== 'SUCCESS') throw new Error(`Airtable msg: ${payload.msg}`);

  // ------ Step 4: Build choice maps for select fields ------
  const choiceMaps: Record<string, Record<string, string>> = {};
  for (const col of payload.data.table.columns) {
    if ((col.type === 'select' || col.type === 'multiSelect') && col.typeOptions?.choices) {
      const m: Record<string, string> = {};
      for (const [cid, cdata] of Object.entries(col.typeOptions.choices)) {
        m[cid] = cdata.name;
      }
      choiceMaps[col.id] = m;
    }
  }

  // ------ Step 5: Map rows to records ------
  // Rows may be at data.rows or inside data.table.rows
  const rows = payload.data.rows ?? (payload.data.table as unknown as { rows?: AirtableRow[] }).rows ?? [];
  console.log(`[airtable] Fetched ${rows.length} rows`);
  const records: LayoffRecord[] = [];

  for (const row of rows) {
    const cv = row.cellValuesByColumnId;
    const company = (cv[COL.company] as string | undefined ?? '').trim();
    const rawDate = cv[COL.date] as string | undefined ?? '';
    const date = rawDate ? rawDate.slice(0, 10) : ''; // "2026-02-26T00:00:00.000Z" → "2026-02-26"

    if (!company || !date) continue;

    const numEmployees = typeof cv[COL.numLaidOff] === 'number' ? cv[COL.numLaidOff] as number : -1;
    const rawPct = cv[COL.percentage];
    const percentage = typeof rawPct === 'number' ? Math.round(rawPct * 100) : -1;

    const industryId = cv[COL.industry] as string | undefined;
    const industry = (industryId && choiceMaps[COL.industry]?.[industryId]) || 'Unknown';

    const countryId = cv[COL.country] as string | undefined;
    const country = (countryId && choiceMaps[COL.country]?.[countryId]) || 'Unknown';

    const stageId = cv[COL.stage] as string | undefined;
    const stage = (stageId && choiceMaps[COL.stage]?.[stageId]) || 'Unknown';

    const source = (cv[COL.source] as string | undefined ?? '').trim();

    // Location HQ is a multiSelect – take the first value
    const locIds = cv[COL.locationHQ] as string[] | undefined;
    const locationHQ =
      locIds && locIds.length > 0 && choiceMaps[COL.locationHQ]
        ? choiceMaps[COL.locationHQ][locIds[0]]
        : undefined;

    const raisedRaw = cv[COL.raisedMM];
    const raisedMM = typeof raisedRaw === 'number' ? raisedRaw : undefined;

    records.push({
      company,
      date,
      numEmployees,
      percentage,
      industry,
      country,
      stage,
      source,
      locationHQ,
      raisedMM,
    });
  }

  // Sort descending by date
  records.sort((a, b) => (b.date > a.date ? 1 : a.date > b.date ? -1 : 0));

  // Update cache
  cachedPayload = JSON.stringify(records);
  cacheTimestamp = Date.now();

  return records;
}
