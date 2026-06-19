export const config = { runtime: 'edge' };

const BASE = process.env.DOWNLOAD_BASE_URL;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export default async function handler(request) {
  const url = new URL(request.url);
  const path = (url.searchParams.get('path') || '').replace(/^\/+/, '');

  const jsonErr = (status, message) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (!BASE) return jsonErr(500, 'Download source not configured');
  if (!path) return jsonErr(400, 'Missing path');

  try {
    const origin = new URL(BASE).origin;
    const res = await fetch(`${BASE}/${path}`, {
      headers: {
        'User-Agent': UA,
        Referer: `${origin}/`,
        Accept: 'application/json',
      },
    });

    // No download for this title: return an empty 200 so the client probe
    // doesn't surface a red 404 in the console (it's an expected absence).
    if (res.status === 404) {
      return new Response(JSON.stringify({ downloads: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const text = await res.text();
    if (text.trim().startsWith('<')) {
      return jsonErr(502, 'Provider blocked the request');
    }

    // Absolutize relative download URLs server-side so the provider host never
    // appears in the client bundle (it's only visible at download time).
    let payload = text;
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data.downloads)) {
        data.downloads = data.downloads.map((d) => ({
          ...d,
          url:
            d.url && d.url.startsWith('/') ? `${origin}${d.url}` : d.url,
        }));
        payload = JSON.stringify(data);
      }
    } catch (_) {
      /* not JSON we can rewrite - pass through as-is */
    }

    return new Response(payload, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (_) {
    return jsonErr(502, 'Download lookup failed');
  }
}
