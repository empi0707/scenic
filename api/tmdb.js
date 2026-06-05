export const config = { runtime: 'edge' };

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Server-side proxy for the TMDB API. The browser calls /api/tmdb/<path>, which
// vercel.json rewrites to /api/tmdb?proxyPath=<path>. This function attaches the
// secret key and forwards to TMDB, so the key is never shipped in the client
// bundle. Uses TMDB_API_KEY (server-only, NOT the REACT_APP_-prefixed var, which
// CRA would embed in the bundle).
export default async function handler(request) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  const proxyPath = (params.get('proxyPath') || '').replace(/^\/+/, '');
  params.delete('proxyPath');

  const jsonError = (status, message) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (!proxyPath) return jsonError(400, 'Missing TMDB path');

  const apiKey = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY;
  if (!apiKey) return jsonError(500, 'TMDB API key not configured');

  params.set('api_key', apiKey);

  const tmdbUrl = `${TMDB_BASE}/${proxyPath}?${params.toString()}`;

  try {
    const tmdbRes = await fetch(tmdbUrl, { headers: { Accept: 'application/json' } });
    const body = await tmdbRes.text();
    return new Response(body, {
      status: tmdbRes.status,
      headers: {
        'Content-Type': 'application/json',
        // Cache at the Vercel edge to cut TMDB calls; safe for read-only data.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (_) {
    return jsonError(502, 'Upstream TMDB request failed');
  }
}
