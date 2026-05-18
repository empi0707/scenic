import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { watchlist } from "../../utils/watchlist";
import "./bookmark-button.scss";

const BookmarkOutline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const BookmarkFilled = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

// Reusable across MovieCard (compact variant) and Detail page (action variant).
// Persists to localStorage via the watchlist util and subscribes to changes
// so two BookmarkButtons for the same title stay in sync.
const BookmarkButton = ({ item, mediaType, variant = "card", className = "" }) => {
  const id = item?.id;
  const resolvedMediaType =
    mediaType || item?.media_type || (item?.first_air_date ? "tv" : "movie");

  const [saved, setSaved] = useState(() =>
    id ? watchlist.has(id, resolvedMediaType) : false
  );

  useEffect(() => {
    if (!id) return undefined;
    const sync = () => setSaved(watchlist.has(id, resolvedMediaType));
    sync();
    return watchlist.subscribe(sync);
  }, [id, resolvedMediaType]);

  const handleClick = useCallback(
    (e) => {
      // Prevent parent Link navigation when used inside MovieCard
      e.preventDefault();
      e.stopPropagation();
      if (!id) return;

      const entry = {
        id,
        mediaType: resolvedMediaType,
        title: item.title || item.name || "",
        posterPath: item.poster_path || null,
        backdropPath: item.backdrop_path || null,
        voteAverage: item.vote_average ?? null,
        releaseDate: item.release_date || item.first_air_date || null,
      };
      const nowSaved = watchlist.toggle(entry);
      setSaved(nowSaved);
      toast.success(nowSaved ? "Added to My List" : "Removed from My List");
    },
    [id, resolvedMediaType, item]
  );

  if (!id) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`bookmark-btn bookmark-btn--${variant}${
        saved ? " is-saved" : ""
      } ${className}`}
      aria-pressed={saved}
      aria-label={saved ? "Remove from My List" : "Add to My List"}
      title={saved ? "Saved to My List" : "Add to My List"}
    >
      {saved ? <BookmarkFilled /> : <BookmarkOutline />}
    </button>
  );
};

export default BookmarkButton;
