// Proxies HLS manifests/segments and injects headers the browser can't set
// itself (Referer/Origin). Manifest URIs are rewritten back through this
// endpoint so segments and keys carry the same headers. Runs as a Node
// function (not edge) so it shares the scraper's network/region — the source
// binds the playlist token to the scraping network.
// Params: url = upstream URL, h = base64(JSON) headers.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/150 Safari/537.36";

const isPlaylist = (url, contentType) =>
  /\.m3u8(\?|$)/i.test(url) || /mpegurl/i.test(contentType || "");

// Browsers need WebVTT; upstream subtitles are SRT.
function srtToVtt(srt) {
  const body = srt
    .replace(/^﻿/, "")
    .replace(/\r+/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body.trim()}\n`;
}

// The stream origin intermittently returns 5xx (Cloudflare origin errors) or
// resets the connection; retry transient failures before relaying.
async function fetchRetry(url, opts, tries = 4) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status < 500) return res;
      last = res;
    } catch {
      last = null;
    }
  }
  if (last) return last;
  throw new Error("upstream unreachable");
}

function rewriteManifest(text, baseUrl, hParam) {
  const wrap = (u) => {
    const abs = new URL(u, baseUrl).toString();
    return `/api/hls-proxy?url=${encodeURIComponent(abs)}&h=${encodeURIComponent(hParam)}`;
  };
  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${wrap(u)}"`);
      return wrap(t);
    })
    .join("\n");
}

module.exports = async (req, res) => {
  const target = req.query.url;
  const h = req.query.h;
  if (!target) {
    res.status(400).json({ error: "Missing url" });
    return;
  }

  let injected = {};
  try {
    if (h) injected = JSON.parse(Buffer.from(h, "base64").toString("utf8"));
  } catch {
    /* ignore malformed headers */
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const upstream = await fetchRetry(target, {
      headers: {
        "User-Agent": UA,
        ...injected,
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
    });
    const contentType = upstream.headers.get("content-type") || "";
    const base = upstream.url || target;

    if (req.query.conv === "vtt") {
      res.setHeader("Content-Type", "text/vtt; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(upstream.status).send(srtToVtt(await upstream.text()));
      return;
    }

    const sendManifest = (text) => {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-store");
      res.status(upstream.status).send(rewriteManifest(text, base, h || ""));
    };

    if (isPlaylist(target, contentType)) {
      sendManifest(await upstream.text());
      return;
    }

    // Extension-less playlists (query-string routing) can carry an off
    // content-type, so sniff the body unless it's clearly binary media.
    const buf = Buffer.from(await upstream.arrayBuffer());
    const binary =
      /^(video|audio|image)\//i.test(contentType) ||
      /octet-stream|mp2t|mp4|\bts\b/i.test(contentType);
    if (!binary && buf.slice(0, 64).toString("utf8").trimStart().startsWith("#EXTM3U")) {
      sendManifest(buf.toString("utf8"));
      return;
    }

    // Segment / key: pass bytes through. Skip content-length (fetch may have
    // decompressed the body, making the upstream length wrong); Node recomputes.
    for (const k of ["content-type", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(k);
      if (v) res.setHeader(k, v);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(upstream.status).send(buf);
  } catch (e) {
    res.status(502).json({ error: e.message || "Proxy failed" });
  }
};
