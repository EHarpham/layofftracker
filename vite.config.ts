import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { fetchAirtableData } from './server/airtable'

// ---------------------------------------------------------------------------
// Vite plugin: serves /api/layoffs from the Airtable shared view
// ---------------------------------------------------------------------------
function airtableApiPlugin(): Plugin {
  return {
    name: 'airtable-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/layoffs') return next()

        try {
          const bypass = new URL(req.url, 'http://localhost').searchParams.get('refresh') === '1'
          const records = await fetchAirtableData(bypass)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(records))
        } catch (err: unknown) {
          console.error('[airtable-api]', err)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), airtableApiPlugin()],
})
