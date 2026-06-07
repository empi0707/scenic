export const config = { runtime: 'edge' };

// Dynamic sitemap: static landing pages + currently popular/trending movie and
// TV detail URLs, so Google can discover and crawl the deep pages.
export default async function handler(request) {
  const origin = new URL(request.url).origin;
  const apiKey = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY;

  const urls = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${origin}/movie`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/tv`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/anime`, priority: '0.8', changefreq: 'daily' },
  ];

  if (apiKey) {
    const endpoints = [
      ['movie', 'movie/popular'],
      ['movie', 'trending/movie/week'],
      ['movie', 'movie/top_rated'],
      ['tv', 'tv/popular'],
      ['tv', 'trending/tv/week'],
      ['tv', 'tv/top_rated'],
    ];
    try {
      const lists = await Promise.all(
        endpoints.map(([type, path]) =>
          fetch(
            `https://api.themoviedb.org/3/${path}?api_key=${encodeURIComponent(
              apiKey
            )}`
          )
            .then((r) => (r.ok ? r.json() : { results: [] }))
            .then((d) => (d.results || []).map((m) => ({ type, id: m.id })))
            .catch(() => [])
        )
      );
      const seen = new Set();
      for (const list of lists) {
        for (const { type, id } of list) {
          if (!id) continue;
          const key = `${type}:${id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          urls.push({
            loc: `${origin}/${type}/${id}`,
            priority: '0.7',
            changefreq: 'weekly',
          });
        }
      }
    } catch (_) {
      /* fall back to the static landing pages */
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
