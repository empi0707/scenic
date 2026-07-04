const { resolveStream } = require("./_sources");

module.exports = async (req, res) => {
  const { type = "movie", id, season, episode, src } = req.query || {};

  if (!id) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "Missing id" });
    return;
  }
  if (type === "tv" && (!season || !episode)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "TV requires season and episode" });
    return;
  }

  try {
    const { stream, src: idx, next } = await resolveStream({
      type: type === "tv" ? "tv" : "movie",
      id,
      season,
      episode,
      src,
    });

    // No source: return an empty 200 (not 404) so the client's probe doesn't
    // surface a red error in the console — absence is expected for some titles.
    // `next` tells the client which source to try instead. Pass ?debug=1 for _diag.
    if (!stream || !stream.url) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(req.query.debug ? { ...stream, src: idx, next } : { url: null, next });
      return;
    }

    // Tokens stay valid for days, so cache the resolved URL on the edge to make
    // repeat opens of the same title near-instant.
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800, stale-while-revalidate=1800");
    res.status(200).json({ ...stream, src: idx, next });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: e.message || "Extraction failed" });
  }
};
