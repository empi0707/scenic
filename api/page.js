const fs = require('fs');
const path = require('path');

let htmlCache = null;

function loadHtml() {
  if (htmlCache) return htmlCache;
  const candidates = [
    path.join(process.cwd(), 'build', 'index.html'),
    path.join(__dirname, '..', 'build', 'index.html'),
    path.join(__dirname, '..', '..', 'build', 'index.html'),
  ];
  for (const p of candidates) {
    try {
      htmlCache = fs.readFileSync(p, 'utf-8');
      return htmlCache;
    } catch (_) {}
  }
  throw new Error('Could not locate build/index.html');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
  const { type, id } = req.query || {};
  let html;
  try {
    html = loadHtml();
  } catch (e) {
    return res.status(500).send('Server error');
  }

  if (!type || !id || !['movie', 'tv'].includes(type) || !/^\d+$/.test(String(id))) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  try {
    const apiKey = process.env.REACT_APP_API_KEY;
    if (!apiKey) throw new Error('Missing TMDB API key');

    const tmdbUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(tmdbUrl);

    if (response.ok) {
      const data = await response.json();
      const title = data.title || data.name || 'Scenic';
      const releaseDate = data.release_date || data.first_air_date || '';
      const year = releaseDate.slice(0, 4);
      const posterPath = data.backdrop_path || data.poster_path;
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : '';

      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const fullUrl = `${proto}://${host}/${type}/${id}`;

      const displayTitle = year ? `${title} (${year}) - Scenic` : `${title} - Scenic`;
      const subject = type === 'movie' ? 'this movie' : 'this series';
      const promo = `Stream ${subject} free on Scenic. Watch blockbusters and hidden gems instantly, no signup needed.`;
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(html);
  } catch (e) {
    console.error('OG injection error:', e);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
};
