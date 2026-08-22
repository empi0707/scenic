// OpenSubtitles: list a title's subtitles (all languages) and download one as WebVTT.
const OS_API = "https://api.opensubtitles.com/api/v1";
const OS_KEY = process.env.OPENSUBTITLES_API_KEY || "";
const OS_UA = process.env.OPENSUBTITLES_UA || "FreeMovies v1.0";
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY || "";

function srtToVtt(srt) {
  const body = srt
    .replace(/^﻿/, "")
    .replace(/\r+/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body.trim()}\n`;
}

async function imdbId({ type, id }) {
  if (!TMDB_KEY) return null;
  const path = type === "tv" ? `tv/${id}` : `movie/${id}`;
  const j = await osJson(
    `https://api.themoviedb.org/3/${path}/external_ids?api_key=${TMDB_KEY}`,
    {}
  );
  const n = (j?.imdb_id || "").replace(/\D/g, "");
  return n || null;
}

const osHeaders = () => ({ "Api-Key": OS_KEY, "User-Agent": OS_UA });

// OpenSubtitles can be intermittently intercepted by ISP blocks (an HTML page
// instead of JSON) or rate-limited; retry a few times and require valid JSON.
async function osJson(url, opts, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      if (!res.ok) continue;
      const trimmed = text.trimStart();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(text);
    } catch {
      /* transient — retry */
    }
  }
  return null;
}

async function listSubtitles({ type, id, season, episode }) {
  if (!OS_KEY) return { total: 0, items: [] };
  const imdb = await imdbId({ type, id });
  if (!imdb) return { total: 0, items: [] };

  const q = new URLSearchParams({ order_by: "download_count" });
  if (type === "tv") {
    q.set("parent_imdb_id", imdb);
    q.set("season_number", String(season));
    q.set("episode_number", String(episode));
  } else {
    q.set("imdb_id", imdb);
  }

  const d = await osJson(`${OS_API}/subtitles?${q.toString()}`, { headers: osHeaders() });
  const items = (d?.data || [])
    .map((s) => ({
      file_id: s.attributes?.files?.[0]?.file_id,
      lang: (s.attributes?.language || "").toLowerCase(),
      release: s.attributes?.release || s.attributes?.files?.[0]?.file_name || "",
      downloads: s.attributes?.download_count || 0,
      hi: !!s.attributes?.hearing_impaired,
    }))
    .filter((x) => x.file_id);
  return { total: d?.total_count ?? items.length, items };
}

async function downloadVtt(fileId) {
  if (!OS_KEY || !fileId) return null;
  const dl = await osJson(`${OS_API}/download`, {
    method: "POST",
    headers: { ...osHeaders(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ file_id: Number(fileId) }),
  });
  const link = dl?.link;
  if (!link) return null;
  for (let i = 0; i < 4; i++) {
    try {
      const file = await fetch(link);
      if (file.ok) {
        const text = await file.text();
        if (text && !text.trimStart().startsWith("<")) return srtToVtt(text);
      }
    } catch {
      /* transient — retry */
    }
  }
  return null;
}

module.exports = { srtToVtt, listSubtitles, downloadVtt };
