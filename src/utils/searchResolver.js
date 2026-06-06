import tmdbApi, { category } from "../api/tmdbApi";
import parseSmartQuery from "./parseSmartQuery";

// Resolves a smart query to one page of results, doing the extra TMDB lookups
// for person ("tom cruise movies", "directed by nolan") and similarity ("movies
// like inception") queries. Shared by the search page and the autocomplete so
// they behave identically. `cache` (optional) memoizes the person/title
// resolution so paging the same term doesn't re-resolve.
export default async function fetchSmartPage(term, pageNum = 1, cache = {}) {
  const parsed = parseSmartQuery(term);

  if (parsed.kind === "discover") {
    const res = await tmdbApi.discover(parsed.mediaType, {
      ...parsed.params,
      page: pageNum,
    });
    return {
      results: (res.results || []).map((it) => ({
        ...it,
        media_type: parsed.mediaType,
      })),
      totalPages: res.total_pages || 1,
    };
  }

  if (parsed.kind === "person") {
    let entry = cache[term];
    if (!entry) {
      const pr = await tmdbApi.search("person", {
        params: { query: parsed.personQuery },
      });
      const person = (pr.results || [])[0];
      let items = [];
      if (person) {
        const credits = await tmdbApi.personCombinedCredits(person.id);
        let pool;
        if (parsed.dept === "cast") pool = credits.cast || [];
        else if (parsed.dept === "crew") pool = credits.crew || [];
        else pool = [...(credits.cast || []), ...(credits.crew || [])];

        const seen = new Set();
        items = pool
          .filter(
            (it) =>
              (it.media_type === "movie" || it.media_type === "tv") &&
              (it.poster_path || it.backdrop_path) &&
              (!parsed.mediaType || it.media_type === parsed.mediaType)
          )
          .filter((it) => {
            const k = `${it.media_type}-${it.id}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }
      entry = { items };
      cache[term] = entry;
    }
    const perPage = 20;
    const start = (pageNum - 1) * perPage;
    return {
      results: entry.items.slice(start, start + perPage),
      totalPages: Math.max(1, Math.ceil(entry.items.length / perPage)),
    };
  }

  if (parsed.kind === "like") {
    let entry = cache[term];
    if (!entry) {
      const sr = await tmdbApi.search(category.multi, {
        params: { query: parsed.titleQuery },
      });
      const pool = (sr.results || []).filter(
        (r) => r.media_type === "movie" || r.media_type === "tv"
      );
      const top =
        pool.find((r) => !parsed.mediaType || r.media_type === parsed.mediaType) ||
        pool[0];
      entry = top ? { id: top.id, mediaType: top.media_type } : { id: null };
      cache[term] = entry;
    }
    if (entry.id) {
      const res = await tmdbApi.recommendations(entry.mediaType, entry.id, pageNum);
      return {
        results: (res.results || []).map((it) => ({
          ...it,
          media_type: entry.mediaType,
        })),
        totalPages: res.total_pages || 1,
      };
    }
  }

  const res = await tmdbApi.search(category.multi, {
    params: { query: term, page: pageNum },
  });
  return { results: res.results || [], totalPages: res.total_pages || 1 };
}
