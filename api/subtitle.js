const { listSubtitles, downloadVtt } = require("./_subtitle");

const EMPTY_VTT = "WEBVTT\n\n";

module.exports = async (req, res) => {
  const { file_id, type = "movie", id, season, episode } = req.query || {};
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Download mode: return the chosen subtitle as WebVTT.
  if (file_id) {
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    try {
      const vtt = await downloadVtt(file_id);
      res.setHeader("Cache-Control", vtt ? "public, max-age=604800" : "no-store");
      res.status(200).send(vtt || EMPTY_VTT);
    } catch {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).send(EMPTY_VTT);
    }
    return;
  }

  // List mode: return available subtitles (all languages) for the title.
  res.setHeader("Content-Type", "application/json");
  if (!id) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ total: 0, items: [] });
    return;
  }
  try {
    const list = await listSubtitles({
      type: type === "tv" ? "tv" : "movie",
      id,
      season,
      episode,
    });
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.status(200).json(list);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ total: 0, items: [] });
  }
};
