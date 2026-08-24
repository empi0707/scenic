// Production server for a VPS deploy (Nginx/aaPanel, OpenLiteSpeed, etc.) —
// replaces what Vercel provides automatically: serving the CRA build/, running
// the /api functions, and applying the vercel.json rewrites. Vercel-specific
// pieces are reproduced here (see server/edgeHandlers.js for the Edge
// Functions, which can't be require()'d directly — see that file's header);
// everything else in /api is Express-compatible already and is mounted as-is.
//
// Run with: npm run build && npm run serve
// (serve = `node server/index.js`; PORT defaults to 3001 — see README's
// deployment section for the Nginx reverse-proxy + PM2 setup.)

require("dotenv").config();

const path = require("path");
const express = require("express");

const { tmdbHandler, downloadHandler, pageHandler, sitemapHandler } = require("./edgeHandlers");

const BUILD_DIR = path.join(__dirname, "..", "build");
const PORT = process.env.PORT || 3001;

const app = express();
app.disable("x-powered-by");

// --- /api routes that are already plain Node/Express handlers in /api ------
// (module.exports = async (req, res) => {...} — same shape Express expects,
// so these are mounted straight from their source file, no adapter needed.)
app.use("/api/sources", require("../api/sources"));
app.use("/api/stream", require("../api/stream"));
app.use("/api/subtitle", require("../api/subtitle"));
app.use("/api/hls-proxy", require("../api/hls-proxy"));

// --- /api routes that were Vercel Edge Functions ---------------------------
// vercel.json: "/api/tmdb/:path*" -> "/api/tmdb?proxyPath=:path*"
app.get("/api/tmdb/*", (req, res) => tmdbHandler(req, res));
// vercel.json: "/api/download/:path*" -> "/api/download?path=:path*"
app.get("/api/download/*", (req, res) => downloadHandler(req, res));
app.get("/api/sitemap", sitemapHandler);

// --- vercel.json's page rewrites: /movie/:id and /tv/:id -------------------
// Must come before the static/SPA-fallback handlers below — same rewrite
// (not redirect) behavior: URL stays put, this just changes what HTML the
// first request gets (with per-title meta tags baked in for crawlers/link
// previews); React Router takes over client-side exactly as normal once the
// bundle loads.
app.get("/movie/:id(\\d+)", pageHandler("movie"));
app.get("/tv/:id(\\d+)", pageHandler("tv"));
app.get("/sitemap.xml", sitemapHandler);

// --- Static build + SPA fallback --------------------------------------------
app.use(express.static(BUILD_DIR, { index: false }));
app.get("*", (req, res) => {
  res.sendFile(path.join(BUILD_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`FreeMovies server listening on port ${PORT}`);
});
