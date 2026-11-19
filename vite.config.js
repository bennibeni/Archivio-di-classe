import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const key = loadEnv(mode, process.cwd(), 'BRAVE_').BRAVE_SEARCH_API_KEY?.trim();
  const configure = ({ middlewares }) => {
    middlewares.use('/api/search', async (req, res) => {
      const reply = (code, payload) => {
        res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(payload));
      };
      if (req.method !== 'GET') return reply(405, { error: 'Metodo non consentito.' });
      const input = new URL(req.url, 'http://localhost').searchParams;
      const name = input.get('name')?.trim().replace(/"/g, '');
      const extra = input.get('extra')?.trim() || '';
      if (!name || name.length > 100 || extra.length > 150) return reply(400, { error: 'Controlla i termini di ricerca.' });
      if (!key) return reply(503, { error: 'La ricerca nell’app richiede la configurazione di Brave Search. Puoi aprire Google e aggiungere i link che trovi.' });
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.search = new URLSearchParams({ q: '"' + name + '" ' + extra, country: 'IT', search_lang: 'it', count: '15', text_decorations: 'false' });
      try {
        const result = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': key }, signal: AbortSignal.timeout(12000) });
        if (!result.ok) return reply(502, { error: 'Brave Search non ha completato la richiesta. Controlla la chiave e i limiti del servizio.' });
        const payload = await result.json();
        return reply(200, { results: (payload.web?.results || []).map(({ title, url }) => ({ title, url })) });
      } catch {
        return reply(502, { error: 'Brave Search non è raggiungibile. Riprova tra poco.' });
      }
    });
  };
  return {
    plugins: [{ name: 'ricerca-web-locale', configureServer: configure, configurePreviewServer: configure }],
    build: { rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), statica: resolve(import.meta.dirname, 'statica.html') } } },
  };
});
