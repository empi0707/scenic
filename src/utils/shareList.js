// Compact share token for a localStorage-only watchlist: comma-joined "t{id}"/"m{id}".
const MAX_SHARE = 100;

export const encodeList = (items) =>
  (items || [])
    .slice(0, MAX_SHARE)
    .map((it) => `${it.mediaType === "tv" ? "t" : "m"}${it.id}`)
    .join(",");

export const decodeList = (token) => {
  if (!token) return [];
  const out = [];
  const seen = new Set();
  for (const raw of token.split(",")) {
    const t = raw.trim();
    const mediaType = t[0] === "t" ? "tv" : t[0] === "m" ? "movie" : null;
    const id = parseInt(t.slice(1), 10);
    if (!mediaType || !Number.isFinite(id) || id <= 0) continue;
    const key = `${mediaType}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, mediaType });
  }
  return out;
};

export const buildShareUrl = (items) =>
  `${window.location.origin}/shared-list?items=${encodeList(items)}`;

export const buildShareText = (items) => {
  const list = items || [];
  const noun = list.length === 1 ? "title" : "titles";
  const lines = [`My FreeMovies watchlist (${list.length} ${noun}):`];

  const section = (label, mediaType) => {
    const names = list
      .filter((it) => it.mediaType === mediaType)
      .map((it) => it.title)
      .filter(Boolean);
    if (!names.length) return;
    const shown = names.slice(0, 8);
    const more = names.length - shown.length;
    lines.push(`${label}: ${shown.join(", ")}${more > 0 ? `, +${more} more` : ""}`);
  };
  section("Movies", "movie");
  section("Series", "tv");

  return `${lines.join("\n")}\n\nStream movies, series and anime for free on FreeMovies!\nOpen and import this list:\n${buildShareUrl(items)}`;
};
