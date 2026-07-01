// Temporary diagnostic: probes candidate stream sources from Vercel's IP to see
// which are datacenter-blocked (403/blocked) vs reachable (200). Hit /api/probe.
// Remove once we've picked the working sources.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const TARGETS = [
  { name: "vixsrc", url: "https://vixsrc.to/api/movie/550" },
  { name: "vidlink", url: "https://vidlink.pro/api/b/movie/550" },
  { name: "videasy", url: "https://api.videasy.net/" },
  { name: "notorrent", url: "https://addon-osvh.onrender.com/" },
  { name: "dahmermovies", url: "https://a.111477.xyz/" },
  { name: "embedsu", url: "https://embed.su/embed/movie/550" },
  { name: "moviesapi", url: "https://moviesapi.club/movie/550" },
  { name: "2embed", url: "https://www.2embed.cc/embed/550" },
  { name: "autoembed", url: "https://player.autoembed.cc/embed/movie/550" },
];

async function probe(t) {
  const started = Date.now();
  try {
    const res = await fetch(t.url, {
      headers: { "User-Agent": UA, Accept: "*/*", Referer: new URL(t.url).origin + "/" },
      signal: AbortSignal.timeout(9000),
    });
    const body = await res.text().catch(() => "");
    return {
      name: t.name,
      status: res.status,
      ok: res.ok,
      blocked: res.status === 403 || res.status === 503 || res.status === 429,
      ms: Date.now() - started,
      snippet: body.slice(0, 90).replace(/\s+/g, " "),
    };
  } catch (e) {
    return { name: t.name, status: 0, ok: false, blocked: true, ms: Date.now() - started, error: e.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const results = await Promise.all(TARGETS.map(probe));
  res.status(200).json({
    region: process.env.VERCEL_REGION || "unknown",
    reachable: results.filter((r) => r.ok).map((r) => r.name),
    results,
  });
};
