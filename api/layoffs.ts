import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchAirtableData } from '../server/airtable';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const bypass = req.query.refresh === '1';
    const records = await fetchAirtableData(bypass);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(records);
  } catch (err: unknown) {
    console.error('[api/layoffs]', err);
    res.status(502).json({ error: String(err) });
  }
}
