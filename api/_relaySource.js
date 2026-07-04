// Tertiary ad-free source: an id-native aggregator that returns its stream list
// as a custom-base64 payload decoded here. Host, provider route, and the stream
// host's referer are env-driven. The decoded list is HLS; each entry is a
// fallback candidate the client can walk when one fails to play.
const RELAY_BASE = (process.env.RELAY_BASE || "").replace(/\/+$/, "");
// Comma-separated provider routes tried in order; coverage varies per title, so
// each is a fallback candidate the client walks.
const PROVIDERS = (process.env.RELAY_PROVIDER || "").split(",").map((s) => s.trim()).filter(Boolean);
const RELAY_REFERER = process.env.RELAY_REFERER || "";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// The aggregator encodes payloads with a shuffled base64 alphabet.
const ALPHABET = "RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=";
function decodePayload(data) {
  const map = {};
  for (let i = 0; i < ALPHABET.length; i++) map[ALPHABET[i]] = i;
  const out = [];
  for (let t = 0; t < data.length; t += 4) {
    let chunk = data.slice(t, t + 4);
    while (chunk.length < 4) chunk += "=";
    const l = [];
    for (let e = 0; e < 4; e++) {
      const v = map[chunk[e]];
      l.push(v !== undefined ? v : 64);
    }
    out.push((l[0] << 2) | (l[1] >> 4));
    if (l[2] !== 64) out.push(((l[1] & 15) << 4) | (l[2] >> 2));
    if (l[3] !== 64) out.push(((l[2] & 3) << 6) | l[3]);
  }
  return Buffer.from(out).toString("utf8");
}

function proxied(url, headers) {
  const h = Buffer.from(JSON.stringify(headers)).toString("base64");
  return `/api/hls-proxy?url=${encodeURIComponent(url)}&h=${encodeURIComponent(h)}`;
}

async function tryFetch(url, opts, tries = 4) {
  let last = 0;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      last = res.status;
    } catch {
      last = 0;
    }
  }
  return { ok: false, status: last, json: async () => null };
}

// Walk the arbitrarily-shaped decoded payload and collect HLS stream URLs.
function collectHls(node, acc) {
  if (!node || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const x of node) collectHls(x, acc);
    return acc;
  }
  const url = node.url || node.link || node.file || node.playlist;
  const type = String(node.type || "").toLowerCase();
  if (typeof url === "string" && (type === "hls" || /mpegurl/i.test(type) || /\.m3u8|\/pl\//i.test(url))) {
    acc.push(url);
  }
  for (const k in node) if (node[k] && typeof node[k] === "object") collectHls(node[k], acc);
  return acc;
}

async function getRelaySource({ type, id, season, episode, candidate = 0 }) {
  if (!RELAY_BASE || !PROVIDERS.length) return { stream: { url: null, _diag: { stage: "unconfigured" } }, total: 0 };

  const total = PROVIDERS.length;
  if (candidate >= total) return { stream: { url: null, _diag: { stage: "exhausted" } }, total };
  const provider = PROVIDERS[candidate];

  const path = type === "tv" ? `/${provider}/tv/${id}/${season}/${episode}` : `/${provider}/movie/${id}`;
  const res = await tryFetch(`${RELAY_BASE}${path}`, { headers: { "User-Agent": UA, Referer: `${RELAY_BASE}/` } });
  if (!res.ok) return { stream: { url: null, _diag: { stage: "fetch", status: res.status, provider } }, total };

  const j = await res.json().catch(() => null);
  if (!j) return { stream: { url: null, _diag: { stage: "parse", provider } }, total };

  let obj = j;
  if (j.encrypted) {
    try { obj = JSON.parse(decodePayload(j.data || "")); } catch { obj = null; }
  }
  // Prefer master/variant playlists over single-rendition ones.
  const urls = [...new Set(collectHls(obj, []))].sort(
    (a, b) => (/(master|\/pl\/)/i.test(b) ? 1 : 0) - (/(master|\/pl\/)/i.test(a) ? 1 : 0)
  );
  if (!urls.length) return { stream: { url: null, _diag: { stage: "nostream", provider } }, total };

  const headers = { Referer: RELAY_REFERER || `${RELAY_BASE}/`, "User-Agent": UA };
  return { stream: { type: "hls", url: proxied(urls[0], headers), subtitles: [] }, total };
}

module.exports = { getRelaySource };
