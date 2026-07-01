const BASE_URL = (process.env.STREAM_BASE_URL || "").replace(/\/+$/, "");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/150 Safari/537.36";

const baseHeaders = () => ({
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE_URL}/`,
  Origin: BASE_URL,
});

// Returns { ok, status, text } so callers can report where a scrape failed.
async function getText(url, accept) {
  try {
    const res = await fetch(url, { headers: { ...baseHeaders(), Accept: accept } });
    const text = res.ok ? await res.text() : null;
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: null, error: e.message };
  }
}

// The embed HTML carries the playlist URL and a signed token/expiry.
function extractTokenData(html) {
  const token = html.match(/token["']\s*:\s*["']([^"']+)/)?.[1];
  const expires = html.match(/expires["']\s*:\s*["']([^"']+)/)?.[1];
  const playlist = html.match(/url\s*:\s*["']([^"']+)/)?.[1];
  if (!token || !expires || !playlist) return null;
  // Reject already-expired tokens (60s grace).
  if (parseInt(expires, 10) * 1000 - 60_000 < Date.now()) return null;
  return { token, expires, playlist };
}

function buildMasterUrl({ token, expires, playlist }) {
  const sep = playlist.includes("?") ? "&" : "?";
  return `${playlist}${sep}token=${token}&expires=${expires}&h=1`;
}

// Pull subtitle tracks and the best resolution out of the master manifest.
// type: "movie" | "tv"
// Returns just the master HLS URL; hls.js discovers subtitles/qualities from
// the manifest on the client, so we skip fetching it here (one fewer round-trip).
async function getStreamSource({ type, id, season, episode }) {
  if (!BASE_URL) throw new Error("STREAM_BASE_URL not configured");

  const diag = { stage: "api", status: 0 };

  const apiUrl =
    type === "tv"
      ? `${BASE_URL}/api/tv/${id}/${season}/${episode}`
      : `${BASE_URL}/api/movie/${id}`;

  const api = await getText(apiUrl, "application/json, text/javascript, */*; q=0.01");
  diag.status = api.status;
  if (!api.text) return { url: null, _diag: { ...diag, error: api.error } };

  let apiData;
  try {
    apiData = JSON.parse(api.text);
  } catch {
    return { url: null, _diag: { ...diag, stage: "api-parse" } };
  }
  if (!apiData?.src) return { url: null, _diag: { ...diag, stage: "api-nosrc" } };

  const embed = await getText(BASE_URL + apiData.src, "text/html,application/xhtml+xml,*/*");
  if (!embed.text) {
    return { url: null, _diag: { stage: "embed", status: embed.status, error: embed.error } };
  }

  const tokenData = extractTokenData(embed.text);
  if (!tokenData) return { url: null, _diag: { stage: "token", status: embed.status } };

  return { provider: "stream", type: "hls", url: buildMasterUrl(tokenData) };
}

module.exports = { getStreamSource };
