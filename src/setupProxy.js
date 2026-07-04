// Dev-only: makes /api/* routes work under `npm start` (where Vercel functions
// don't run). Mirrors the api/*.js handlers. In production the Vercel functions
// serve these routes instead. Runs in the CRA dev server's Node process.
const { resolveStream } = require("../api/_sources");
const { listSubtitles, downloadVtt } = require("../api/_subtitle");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const isPlaylist = (url, contentType) =>
  /\.m3u8(\?|$)/i.test(url) || /mpegurl/i.test(contentType || "");

function srtToVtt(srt) {
  const body = srt
    .replace(/^﻿/, "")
    .replace(/\r+/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body.trim()}\n`;
}

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

module.exports = function (app) {
  // Mirrors api/hls-proxy.js — injects source headers and rewrites manifests.
  app.use("/api/hls-proxy", async (req, res) => {
    const target = req.query.url;
    const h = req.query.h;
    if (!target) return res.status(400).json({ error: "Missing url" });

    let injected = {};
    try {
      if (h) injected = JSON.parse(Buffer.from(h, "base64").toString("utf8"));
    } catch {
      /* ignore malformed headers */
    }

    try {
      const upstream = await fetchRetry(target, {
        headers: { "User-Agent": UA, ...injected, ...(req.headers.range ? { Range: req.headers.range } : {}) },
      });
      const contentType = upstream.headers.get("content-type") || "";
      const base = upstream.url || target;

      if (req.query.conv === "vtt") {
        res.set({ "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "public, max-age=3600" });
        return res.status(upstream.status).send(srtToVtt(await upstream.text()));
      }

      if (isPlaylist(target, contentType)) {
        const body = rewriteManifest(await upstream.text(), base, h || "");
        res.set({ "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" });
        return res.status(upstream.status).send(body);
      }

      const buf = Buffer.from(await upstream.arrayBuffer());
      const binary = /^(video|audio|image)\//i.test(contentType) || /octet-stream|mp2t|mp4|\bts\b/i.test(contentType);
      if (!binary && buf.slice(0, 64).toString("utf8").trimStart().startsWith("#EXTM3U")) {
        const body = rewriteManifest(buf.toString("utf8"), base, h || "");
        res.set({ "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" });
        return res.status(upstream.status).send(body);
      }

      for (const k of ["content-type", "content-range", "accept-ranges"]) {
        const v = upstream.headers.get(k);
        if (v) res.set(k, v);
      }
      return res.status(upstream.status).send(buf);
    } catch (e) {
      return res.status(502).json({ error: e.message || "Proxy failed" });
    }
  });

  // Mirrors api/subtitle.js — list (all languages) + download (file_id).
  app.use("/api/subtitle", async (req, res) => {
    const { file_id, type = "movie", id, season, episode } = req.query || {};
    res.set("Access-Control-Allow-Origin", "*");
    if (file_id) {
      res.set("Content-Type", "text/vtt; charset=utf-8");
      try {
        const vtt = await downloadVtt(file_id);
        return res.status(200).send(vtt || "WEBVTT\n\n");
      } catch {
        return res.status(200).send("WEBVTT\n\n");
      }
    }
    res.set("Content-Type", "application/json");
    if (!id) return res.status(200).json({ total: 0, items: [] });
    try {
      const list = await listSubtitles({ type: type === "tv" ? "tv" : "movie", id, season, episode });
      return res.status(200).json(list);
    } catch {
      return res.status(200).json({ total: 0, items: [] });
    }
  });

  // Mirrors api/stream.js — the ad-free HLS extractor.
  app.use("/api/stream", async (req, res) => {
    const { type = "movie", id, season, episode, src } = req.query || {};
    res.set("Cache-Control", "no-store");

    if (!id) return res.status(400).json({ error: "Missing id" });
    if (type === "tv" && (!season || !episode)) {
      return res.status(400).json({ error: "TV requires season and episode" });
    }

    try {
      const { stream, src: idx, next } = await resolveStream({
        type: type === "tv" ? "tv" : "movie",
        id,
        season,
        episode,
        src,
      });
      if (!stream || !stream.url) {
        return res.json(req.query.debug ? { ...stream, src: idx, next } : { url: null, next });
      }
      return res.json({ ...stream, src: idx, next });
    } catch (e) {
      return res.status(502).json({ error: e.message || "Extraction failed" });
    }
  });

  app.use("/api/download", async (req, res) => {
    const BASE = process.env.DOWNLOAD_BASE_URL;
    const path = (req.url || "").split("?")[0].replace(/^\/+/, "");

    if (!BASE) return res.status(500).json({ error: "Download source not configured" });
    if (!path) return res.status(400).json({ error: "Missing path" });
    if (typeof fetch !== "function") {
      return res.status(500).json({ error: "Dev server needs Node 18+ for downloads" });
    }

    try {
      const origin = new URL(BASE).origin;
      const upstream = await fetch(`${BASE}/${path}`, {
        headers: { "User-Agent": UA, Referer: `${origin}/`, Accept: "application/json" },
      });
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
        /* pass through */
      }

      res.set("Content-Type", "application/json").send(payload);
    } catch (_) {
      res.status(502).json({ error: "Download lookup failed" });
    }
  });
};
