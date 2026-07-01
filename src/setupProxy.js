// Dev-only: makes /api/* routes work under `npm start` (where Vercel functions
// don't run). Mirrors the api/*.js handlers. In production the Vercel functions
// serve these routes instead. Runs in the CRA dev server's Node process.
const { getStreamSource } = require("../api/_streamSource");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

module.exports = function (app) {
  // Mirrors api/stream.js — the ad-free HLS extractor.
  app.use("/api/stream", async (req, res) => {
    const { type = "movie", id, season, episode } = req.query || {};
    res.set("Cache-Control", "no-store");

    if (!id) return res.status(400).json({ error: "Missing id" });
    if (type === "tv" && (!season || !episode)) {
      return res.status(400).json({ error: "TV requires season and episode" });
    }

    try {
      const stream = await getStreamSource({
        type: type === "tv" ? "tv" : "movie",
        id,
        season,
        episode,
      });
      if (!stream || !stream.url) return res.json(req.query.debug ? stream : { url: null });
      return res.json(stream);
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
