// Download helpers. Links are fetched through the serverless proxy
// (/api/download) and the file is renamed by rewriting the URL's `n`
// (filename) param. Series -> "Title_S1_E1_ByScenic.mkv"; movies (no S/E) ->
// "Title_ByScenic.mkv". The extension is taken from the provider's file.

const sanitizeTitle = (title) =>
  (title || "Scenic")
    .replace(/[<>:"/\\|?* -]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "Scenic";

const extOf = (download) => {
  const name = download.filename || "";
  const dot = name.lastIndexOf(".");
  if (dot >= 0) return name.slice(dot + 1).toLowerCase();
  return (download.format || "mp4").toLowerCase();
};

export const buildDownloadFilename = ({
  title,
  mediaType,
  season,
  episode,
  download,
}) => {
  const base = sanitizeTitle(title);
  const ext = extOf(download);
  if (mediaType === "tv") {
    return `${base}_S${season}_E${episode}_ByScenic.${ext}`;
  }
  return `${base}_ByScenic.${ext}`;
};

// The proxy returns absolute URLs; carry our custom filename via the `n` param.
export const buildDownloadUrl = (absoluteUrl, filename) => {
  const u = new URL(absoluteUrl);
  u.searchParams.set("n", filename);
  return u.toString();
};

export const fetchDownloads = async (mediaType, id, season, episode) => {
  const path =
    mediaType === "tv" ? `tv/${id}/${season}/${episode}` : `movie/${id}`;
  const res = await fetch(`/api/download/${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || "Download lookup failed");
  }
  return data.downloads || [];
};
