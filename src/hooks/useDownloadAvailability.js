import { useState, useEffect } from "react";
import { fetchDownloads } from "../utils/download";

// Probes download availability at the page/player level (not inside the modal)
// so the player popup can show/hide the download icon instantly without a
// fetch on open. Re-runs when the title/episode context changes.
export default function useDownloadAvailability(mediaType, id, season, episode) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const ready =
      id != null &&
      (mediaType !== "tv" || (season != null && episode != null));
    if (!ready) {
      setAvailable(false);
      return undefined;
    }

    let cancelled = false;
    setAvailable(false);
    fetchDownloads(mediaType, id, season, episode)
      .then((dls) => {
        if (!cancelled) setAvailable((dls || []).length > 0);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, id, season, episode]);

  return available;
}
