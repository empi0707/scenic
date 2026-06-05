import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import tmdbApi, { category } from "../api/tmdbApi";

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

    tmdbApi
      .search(category.multi, { params: { query: term } })
      .then((res) => {
        if (cancelled) return;
        const items = (res.results || [])
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
