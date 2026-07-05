const { listSources } = require("./_sources");

module.exports = async (req, res) => {
  const { type = "movie", id, season, episode } = req.query || {};
  if (!id) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "Missing id" });
    return;
  }
  try {
    const sources = await listSources({ type: type === "tv" ? "tv" : "movie", id, season, episode });
    // Short edge cache: the list is stable for a title within a session.
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.status(200).json({ sources });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ sources: [] });
  }
};
