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

async function getText(url, accept) {
  const res = await fetch(url, { headers: { ...baseHeaders(), Accept: accept } });
  if (!res.ok) return null;
  return res.text();
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

  const apiUrl =
    type === "tv"
      ? `${BASE_URL}/api/tv/${id}/${season}/${episode}`
      : `${BASE_URL}/api/movie/${id}`;

  const apiRaw = await getText(apiUrl, "application/json, text/javascript, */*; q=0.01");
  if (!apiRaw) return null;
  let apiData;
  try {
    apiData = JSON.parse(apiRaw);
  } catch {
    return null;
  }
  if (!apiData?.src) return null;

  const html = await getText(BASE_URL + apiData.src, "text/html,application/xhtml+xml,*/*");
  if (!html) return null;

  const tokenData = extractTokenData(html);
  if (!tokenData) return null;

  return { provider: "stream", type: "hls", url: buildMasterUrl(tokenData) };
}

module.exports = { getStreamSource };
