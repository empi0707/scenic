const { getStreamSource } = require("./_streamSource");

module.exports = async (req, res) => {
  const { type = "movie", id, season, episode } = req.query || {};

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
    const stream = await getStreamSource({
      type: type === "tv" ? "tv" : "movie",
      id,
      season,
      episode,
    });

    if (!stream) {
      res.setHeader("Cache-Control", "no-store");
      res.status(404).json({ error: "No stream found" });
      return;
    }

    // Tokens stay valid for days, so cache the resolved URL on the edge to make
    // repeat opens of the same title near-instant.
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800, stale-while-revalidate=1800");
    res.status(200).json(stream);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: e.message || "Extraction failed" });
  }
};
