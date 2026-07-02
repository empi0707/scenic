// Resolves a TMDB id to an ad-free HLS master playlist. The source binds the
// playlist token to the network it was scraped from, so the URL is returned
// wrapped in /api/hls-proxy: the proxy (same origin/network as this scrape)
// fetches the manifest and segments with the required headers and relays them,
// which is what lets playback work from any client.
const BASE = (process.env.STREAM_SOURCE_BASE || "https://vixsrc.to").replace(/\/+$/, "");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/150 Safari/537.36";

const baseHeaders = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE}/`,
  Origin: BASE,
};

async function getText(url, accept) {
  const res = await fetch(url, { headers: { ...baseHeaders, Accept: accept } });
  return { status: res.status, text: res.ok ? await res.text() : null };
}

function extractTokenData(html) {
  const token = html.match(/token["']\s*:\s*["']([^"']+)/)?.[1];
  const expires = html.match(/expires["']\s*:\s*["']([^"']+)/)?.[1];
  const playlist = html.match(/url\s*:\s*["']([^"']+)/)?.[1];
  if (!token || !expires || !playlist) return null;
  if (parseInt(expires, 10) * 1000 - 60_000 < Date.now()) return null;
  return { token, expires, playlist };
}

function proxied(url, headers) {
  const h = Buffer.from(JSON.stringify(headers)).toString("base64");
  return `/api/hls-proxy?url=${encodeURIComponent(url)}&h=${encodeURIComponent(h)}`;
}

async function getStreamSource({ type, id, season, episode }) {
  const apiUrl =
    type === "tv"
      ? `${BASE}/api/tv/${id}/${season}/${episode}`
      : `${BASE}/api/movie/${id}`;

  const api = await getText(apiUrl, "application/json, text/javascript, */*; q=0.01");
  if (!api.text) return { url: null, _diag: { stage: "api", status: api.status } };

  let src;
  try {
    src = JSON.parse(api.text).src;
  } catch {
    return { url: null, _diag: { stage: "api-parse", status: api.status } };
  }
  if (!src) return { url: null, _diag: { stage: "api-nosrc", status: api.status } };

  const embed = await getText(BASE + src, "text/html,application/xhtml+xml,*/*");
  if (!embed.text) return { url: null, _diag: { stage: "embed", status: embed.status } };

  const tokenData = extractTokenData(embed.text);
  if (!tokenData) return { url: null, _diag: { stage: "token", status: embed.status } };

  const sep = tokenData.playlist.includes("?") ? "&" : "?";
  const master = `${tokenData.playlist}${sep}token=${tokenData.token}&expires=${tokenData.expires}&h=1`;

  // Segments/sub-playlists need the embed page as Referer; the proxy re-adds it.
  return {
    type: "hls",
    url: proxied(master, { Referer: apiUrl, "User-Agent": UA }),
    subtitles: [],
  };
}

module.exports = { getStreamSource };
