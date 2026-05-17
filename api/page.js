export const config = { runtime: 'edge' };

let cachedHtml = null;

async function loadHtml(origin) {
  if (cachedHtml) return cachedHtml;
  const res = await fetch(`${origin}/index.html`, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch index.html: ${res.status}`);
  cachedHtml = await res.text();
  return cachedHtml;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  const origin = url.origin;

  let html;
  try {
    html = await loadHtml(origin);
  } catch (_) {
    return new Response('Server error', { status: 500 });
  }

  const baseHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
  };

  if (!type || !id || !['movie', 'tv'].includes(type) || !/^\d+$/.test(id)) {
    return new Response(html, { status: 200, headers: baseHeaders });
  }

  try {
    const apiKey = process.env.REACT_APP_API_KEY;
    if (!apiKey) throw new Error('Missing TMDB API key');

    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${encodeURIComponent(apiKey)}`
    );

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      const title = data.title || data.name || 'Scenic';
      const releaseDate = data.release_date || data.first_air_date || '';
      const year = releaseDate.slice(0, 4);
      const posterPath = data.backdrop_path || data.poster_path;
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : '';
      const fullUrl = `${origin}/${type}/${id}`;

      const displayTitle = year ? `${title} (${year}) - Scenic` : `${title} - Scenic`;
      const subject = type === 'movie' ? 'this movie' : 'this series';
      const promo = `Watch ${subject} free on Scenic. Stream blockbusters and hidden gems instantly, no signup needed.`;
      const credit = `© ${new Date().getFullYear()} Scenic. Developed with ❤️ by Vanshaj Pahwa`;
      const description = `${promo} ${credit}`;

      const ogBlock = [
        `<title>${escapeHtml(displayTitle)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta property="og:type" content="video.${type === 'movie' ? 'movie' : 'tv_show'}" />`,
        `<meta property="og:site_name" content="Scenic" />`,
        `<meta property="og:title" content="${escapeHtml(displayTitle)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`,
        posterUrl ? `<meta property="og:image" content="${escapeHtml(posterUrl)}" />` : '',
        posterUrl ? `<meta property="og:image:secure_url" content="${escapeHtml(posterUrl)}" />` : '',
        posterUrl ? `<meta property="og:image:type" content="image/jpeg" />` : '',
        posterUrl ? `<meta property="og:image:width" content="500" />` : '',
        posterUrl ? `<meta property="og:image:height" content="${data.backdrop_path ? 281 : 750}" />` : '',
        posterUrl ? `<meta property="og:image:alt" content="${escapeHtml(title + ' poster')}" />` : '',
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escapeHtml(displayTitle)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        posterUrl ? `<meta name="twitter:image" content="${escapeHtml(posterUrl)}" />` : '',
      ].filter(Boolean).join('\n    ');

      html = html.replace(/<title>[^<]*<\/title>/i, '');
      html = html.replace(/<meta\s+name="description"[^>]*\/?>/i, '');
      html = html.replace(/<meta\s+property="og:[^"]*"[^>]*\/?>/gi, '');
      html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi, '');
      html = html.replace('</head>', `    ${ogBlock}\n  </head>`);
    }

    return new Response(html, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (_) {
    return new Response(html, { status: 200, headers: baseHeaders });
  }
}
