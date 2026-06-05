import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import tmdbApi, { category } from "../api/tmdbApi";
import parseSmartQuery from "../utils/parseSmartQuery";

// Lightweight autocomplete: debounced multi-search that only fetches a short
// list of suggestions. It never navigates or changes the input, so the
// on-screen keyboard (TV / mobile) keeps focus while typing.
export default function useSearchSuggestions(query, { limit = 7 } = {}) {
  const [debounced] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = (debounced || "").trim();

    if (term.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Mirror the full-search routing: language/genre phrases preview Discover
    // results; everything else previews title matches.
    const parsed = parseSmartQuery(term);
    const request =
      parsed.kind === "discover"
        ? tmdbApi
            .discover(parsed.mediaType, parsed.params)
            .then((res) => ({ res, discoverType: parsed.mediaType }))
        : tmdbApi
            .search(category.multi, { params: { query: term } })
            .then((res) => ({ res, discoverType: null }));

    request
      .then(({ res, discoverType }) => {
        if (cancelled) return;
        const raw = (res.results || []).map((it) =>
          discoverType ? { ...it, media_type: discoverType } : it
        );
        const items = raw
          .filter(
            (it) =>
              it.media_type === "movie" ||
              it.media_type === "tv" ||
              it.media_type === "person"
          )
          .slice(0, limit);
        setSuggestions(items);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, limit]);

  return { suggestions, loading };
}
