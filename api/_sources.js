// Ordered ad-free stream sources flattened into a single index the client walks
// via the returned `next` on any resolve/playback failure:
//   src 0            -> primary catalog source
//   src 1..MIRROR_MAX -> mirror encodes (candidate = src - 1)
// The mirror host exposes many encodes per title; some produce bitstreams the
// browser can't decode, so each is its own step and the client falls through
// with a "Trying another source…" loader until one plays.
const { getStreamSource } = require("./_streamSource");
const { getMirrorSource } = require("./_mirrorSource");

const catalogOK = () => !!(process.env.CATALOG_BASE && process.env.CATALOG_PLAYER_ACTION);
const mirrorOK = () => !!process.env.MIRROR_BASE;

// How many mirror encodes the client may walk before giving up.
const MIRROR_MAX = 8;

async function resolveStream({ type, id, season, episode, src }) {
  const idx = Math.max(0, Number(src) || 0);

  // src 0 — primary catalog source. Point `next` at the first mirror encode so
  // a resolve miss or a mid-play failure falls through to the mirror.
  if (idx === 0) {
    const next = mirrorOK() ? 1 : null;
    if (catalogOK()) {
      const stream = await getStreamSource({ type, id, season, episode });
      return { stream, src: 0, next };
    }
    return { stream: { url: null, _diag: { stage: "unconfigured" } }, src: 0, next };
  }

  // src >= 1 — a specific mirror encode.
  if (!mirrorOK()) return { stream: { url: null }, src: idx, next: null };
  const candidate = idx - 1;
  const { stream, total } = await getMirrorSource({ type, id, season, episode, candidate });
  const more = candidate + 1 < Math.min(total, MIRROR_MAX);
  return { stream, src: idx, next: more ? idx + 1 : null };
}

module.exports = { resolveStream };
