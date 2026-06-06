import React, { useState, useEffect } from "react";
import Input from "../input/Input";
import useTypewriter from "../../hooks/useTypewriter";
import tmdbApi from "../../api/tmdbApi";

// Smart-search examples; real trending titles get interleaved in front of these
// once they load, so the placeholder always feels fresh.
const SMART_HINTS = [
  "Punjabi movies",
  "Tom Cruise movies",
  "Movies like Inception",
  "Korean thrillers",
  "Directed by Nolan",
  "Hindi comedy",
];

const FALLBACK = ["The Boys", ...SMART_HINTS];

const DEFAULT_PLACEHOLDER = "Search movies, series & people";

// Memoized so the typewriter's per-character updates re-render only this field,
// not the whole page it sits on.
const SearchField = ({ value, onChange, onFocus, onKeyDown }) => {
  const [hints, setHints] = useState(FALLBACK);

  // Pull what's trending now and interleave a few titles with the smart
  // examples, so the "Try …" placeholder stays current.
  useEffect(() => {
    let cancelled = false;
    tmdbApi
      .trending("all", "week")
      .then((res) => {
        if (cancelled) return;
        const titles = (res.results || [])
          .filter((it) => it.media_type === "movie" || it.media_type === "tv")
          .map((it) => it.title || it.name)
          .filter((t) => t && t.length <= 28)
          .slice(0, 6);
        if (!titles.length) return;

        const mixed = [];
        const len = Math.max(titles.length, SMART_HINTS.length);
        for (let i = 0; i < len; i += 1) {
          if (titles[i]) mixed.push(titles[i]);
          if (SMART_HINTS[i]) mixed.push(SMART_HINTS[i]);
        }
        setHints(mixed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const typed = useTypewriter(hints);

  return (
    <Input
      type="search"
      className="search-input"
      enterKeyHint="search"
      placeholder={!value && typed ? `Try "${typed}"` : DEFAULT_PLACEHOLDER}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    />
  );
};

export default React.memo(SearchField);
