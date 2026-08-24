// Express ports of the four Vercel Edge Functions in /api (tmdb.js, page.js,
// sitemap.js, download.js). Those four use the Fetch API "(request) =>
// Response" signature and ESM `export default`, which can't be `require()`d
// from a plain CommonJS Express app without either touching their source
// (renaming to .mjs, adding "type":"module") or depending on Node's
// version-gated ESM/CJS auto-detection — both fragile across the range of
// Node versions a VPS might have. So instead, this file reimplements their
// logic natively for Express, the same way src/setupProxy.js already mirrors
// the other four /api handlers (sources.js, stream.js, subtitle.js,
// hls-proxy.js) for local dev.
//
// If you change api/tmdb.js, api/page.js, api/sitemap.js, or api/download.js,
// port the same change here — this is a second, independent copy of that
// logic, not a wrapper around it.

const fs = require("fs");
const path = require("path");

const BUILD_DIR = path.join(__dirname, "..", "build");

// ---------------------------------------------------------------------------
// /api/tmdb — hides TMDB_API_KEY from the client bundle. Mirrors api/tmdb.js.
// ---------------------------------------------------------------------------
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbHandler(req, res) {
  // vercel.json rewrites /api/tmdb/:path* -> /api/tmdb?proxyPath=:path*;
  // Express's "/api/tmdb/*" route gets the same tail as req.params[0].
  const proxyPath = (req.params[0] || "").replace(/^\/+/, "");
  if (!proxyPath) return res.status(400).json({ error: "Missing TMDB path" });

  const apiKey = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB API key not configured" });

  const params = new URLSearchParams(req.query);
  params.delete("proxyPath");
  params.set("api_key", apiKey);

  try {
    const tmdbRes = await fetch(`${TMDB_BASE}/${proxyPath}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const body = await tmdbRes.text();
    res.status(tmdbRes.status);
    res.set("Content-Type", "application/json");
    res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.send(body);
  } catch (_) {
    res.status(502).json({ error: "Upstream TMDB request failed" });
  }
}

// ---------------------------------------------------------------------------
// /api/download — resolves + absolutizes a title's download links so the
// provider host never appears in the client bundle. Mirrors api/download.js.
// ---------------------------------------------------------------------------
const DOWNLOAD_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function downloadHandler(req, res) {
  const BASE = process.env.DOWNLOAD_BASE_URL;
  const reqPath = (req.params[0] || "").replace(/^\/+/, "");

  if (!BASE) return res.status(500).json({ error: "Download source not configured" });
  if (!reqPath) return res.status(400).json({ error: "Missing path" });

  try {
    const origin = new URL(BASE).origin;
    const upstream = await fetch(`${BASE}/${reqPath}`, {
      headers: { "User-Agent": DOWNLOAD_UA, Referer: `${origin}/`, Accept: "application/json" },
    });

    if (upstream.status === 404) {
      res.set("Cache-Control", "no-store");
      return res.status(200).json({ downloads: [] });
    }

    const text = await upstream.text();
    if (text.trim().startsWith("<")) {
      return res.status(502).json({ error: "Provider blocked the request" });
    }

    let payload = text;
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data.downloads)) {
        data.downloads = data.downloads.map((d) => ({
          ...d,
          url: d.url && d.url.startsWith("/") ? `${origin}${d.url}` : d.url,
        }));
        payload = JSON.stringify(data);
      }
    } catch (_) {
      /* not JSON we can rewrite - pass through as-is */
    }

    res.status(upstream.status);
    res.set("Content-Type", "application/json");
    res.set("Cache-Control", "no-store");
    res.send(payload);
  } catch (_) {
    res.status(502).json({ error: "Download lookup failed" });
  }
}

// ---------------------------------------------------------------------------
// /movie/:id and /tv/:id — serves build/index.html with per-title meta tags
// and JSON-LD injected, for link previews and SEO. Mirrors api/page.js.
// ---------------------------------------------------------------------------
let cachedHtml = null;
function loadIndexHtml() {
  if (cachedHtml) return cachedHtml;
  cachedHtml = fs.readFileSync(path.join(BUILD_DIR, "index.html"), "utf8");
  return cachedHtml;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(str, n) {
  const s = String(str || "").trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function isoDuration(mins) {
  const m = Number(mins);
  if (!m || m <= 0) return null;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `PT${h ? `${h}H` : ""}${r ? `${r}M` : ""}`;
}

function pageHandler(type) {
  return async (req, res) => {
    const id = req.params.id;
    const origin = `${req.protocol}://${req.get("host")}`;

    let html;
    try {
      html = loadIndexHtml();
    } catch (_) {
      return res.status(500).send("Server error");
    }

    if (!type || !id || !["movie", "tv"].includes(type) || !/^\d+$/.test(id)) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    try {
      const apiKey = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY;
      if (!apiKey) throw new Error("Missing TMDB API key");

      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${encodeURIComponent(
          apiKey
        )}&append_to_response=credits`
      );

      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        const title = data.title || data.name || "FreeMovies";
        const releaseDate = data.release_date || data.first_air_date || "";
        const year = releaseDate.slice(0, 4);
        const posterPath = data.backdrop_path || data.poster_path;
        const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : "";
        const fullUrl = `${origin}/${type}/${id}`;
        const genres = (data.genres || []).map((g) => g.name).filter(Boolean);
        const cast = (data.credits?.cast || []).slice(0, 6).map((c) => c.name).filter(Boolean);
        const directors = (data.credits?.crew || [])
          .filter((c) => c.job === "Director")
          .map((c) => c.name)
          .filter(Boolean);

        const displayTitle = year ? `${title} (${year}) - FreeMovies` : `${title} - FreeMovies`;

        const description =
          truncate(data.overview, 160) ||
          `Watch ${title}${year ? ` (${year})` : ""} on FreeMovies.${
            genres.length ? ` ${genres.join(", ")}.` : ""
          } Stream instantly and watch the trailer, no signup needed.`;

        const keywords = [
          title,
          year ? `${title} ${year}` : "",
          `watch ${title} online`,
          `${title} ${type === "movie" ? "full movie" : "series"}`,
          ...genres,
          "FreeMovies",
        ]
          .filter(Boolean)
          .join(", ");

        const ld = {
          "@context": "https://schema.org",
          "@type": type === "movie" ? "Movie" : "TVSeries",
          name: title,
          url: fullUrl,
          description: String(data.overview || description),
        };
        if (posterUrl) ld.image = posterUrl;
        if (releaseDate) ld.datePublished = releaseDate;
        if (genres.length) ld.genre = genres;
        const dur = isoDuration(data.runtime || (data.episode_run_time && data.episode_run_time[0]));
        if (dur) ld.duration = dur;
        if (data.vote_count > 0 && data.vote_average > 0) {
          ld.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: Number(data.vote_average).toFixed(1),
            ratingCount: data.vote_count,
            bestRating: 10,
            worstRating: 1,
          };
        }
        if (cast.length) ld.actor = cast.map((n) => ({ "@type": "Person", name: n }));
        if (type === "movie" && directors.length) {
          ld.director = directors.map((n) => ({ "@type": "Person", name: n }));
        }
        if (type === "tv") {
          if (data.number_of_seasons) ld.numberOfSeasons = data.number_of_seasons;
          if (data.number_of_episodes) ld.numberOfEpisodes = data.number_of_episodes;
        }
        const ldJson = JSON.stringify(ld).replace(/</g, "\\u003c");

        const ogBlock = [
          `<title>${escapeHtml(displayTitle)}</title>`,
          `<meta name="description" content="${escapeHtml(description)}" />`,
          `<meta name="keywords" content="${escapeHtml(keywords)}" />`,
          `<link rel="canonical" href="${escapeHtml(fullUrl)}" />`,
          `<meta property="og:type" content="video.${type === "movie" ? "movie" : "tv_show"}" />`,
          `<meta property="og:site_name" content="FreeMovies" />`,
          `<meta property="og:title" content="${escapeHtml(displayTitle)}" />`,
          `<meta property="og:description" content="${escapeHtml(description)}" />`,
          `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`,
          posterUrl ? `<meta property="og:image" content="${escapeHtml(posterUrl)}" />` : "",
          posterUrl
            ? `<meta property="og:image:alt" content="${escapeHtml(`${title} poster`)}" />`
            : "",
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${escapeHtml(displayTitle)}" />`,
          `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
          posterUrl ? `<meta name="twitter:image" content="${escapeHtml(posterUrl)}" />` : "",
          `<script type="application/ld+json">${ldJson}</script>`,
        ]
          .filter(Boolean)
          .join("\n    ");

        html = html.replace(/<title>[^<]*<\/title>/i, "");
        html = html.replace(/<meta\s+name="description"[^>]*\/?>/i, "");
        html = html.replace(/<meta\s+name="keywords"[^>]*\/?>/i, "");
        html = html.replace(/<link\s+rel="canonical"[^>]*\/?>/i, "");
        html = html.replace(/<meta\s+property="og:[^"]*"[^>]*\/?>/gi, "");
        html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi, "");
        html = html.replace("</head>", `    ${ogBlock}\n  </head>`);
      }

      res.set("Content-Type", "text/html; charset=utf-8");
      res.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
      );
      res.status(200).send(html);
    } catch (_) {
      res.set("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    }
  };
}

// ---------------------------------------------------------------------------
// /sitemap.xml — static pages + currently popular/trending titles. Mirrors
// api/sitemap.js.
// ---------------------------------------------------------------------------
async function sitemapHandler(req, res) {
  const origin = `${req.protocol}://${req.get("host")}`;
  const apiKey = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY;

  const urls = [
    { loc: `${origin}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${origin}/movie`, priority: "0.9", changefreq: "daily" },
    { loc: `${origin}/tv`, priority: "0.9", changefreq: "daily" },
    { loc: `${origin}/anime`, priority: "0.8", changefreq: "daily" },
  ];

  if (apiKey) {
    const endpoints = [
      ["movie", "movie/popular"],
      ["movie", "trending/movie/week"],
      ["movie", "movie/top_rated"],
      ["tv", "tv/popular"],
      ["tv", "trending/tv/week"],
      ["tv", "tv/top_rated"],
    ];
    try {
      const lists = await Promise.all(
        endpoints.map(([type, p]) =>
          fetch(`https://api.themoviedb.org/3/${p}?api_key=${encodeURIComponent(apiKey)}`)
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
          urls.push({ loc: `${origin}/${type}/${id}`, priority: "0.7", changefreq: "weekly" });
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
      .join("\n") +
    `\n</urlset>\n`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).send(body);
}

module.exports = { tmdbHandler, downloadHandler, pageHandler, sitemapHandler };
