import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import fetchSmartPage from "../utils/searchResolver";

// Lightweight autocomplete: a debounced run of the same smart-search resolver
// the results page uses, so "movies like inception", "tom cruise movies",
// "korean thrillers" etc. all preview the right results while typing. Never
// navigates or changes the input, so the on-screen keyboard keeps focus.
export default function useSearchSuggestions(query, { limit = 7 } = {}) {
  const [debounced] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = (debounced || "").trim();

    if (term.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    fetchSmartPage(term, 1)
      .then(({ results }) => {
        if (cancelled) return;
        const items = (results || [])
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
