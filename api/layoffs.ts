import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchAirtableData } from '../server/airtable';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const refreshParam = req.query.refresh;
    const bypass = refreshParam === '1' || (Array.isArray(refreshParam) && refreshParam[0] === '1');
    const records = await fetchAirtableData(bypass);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(records);
  } catch (err: unknown) {
    console.error('[api/layoffs] Error:', err instanceof Error ? err.message : err);
    console.error('[api/layoffs] Stack:', err instanceof Error ? err.stack : 'N/A');
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
