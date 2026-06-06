// Turns a free-text query into either a title search (TMDB search/multi, which
// only matches titles) or a filtered Discover query. This lets natural phrases
// like "punjabi movies", "hindi comedy", "korean series", or "2019 horror
// movies" return language/genre-filtered results instead of literal title hits.

const LANGUAGES = {
  punjabi: "pa",
  hindi: "hi",
  tamil: "ta",
  telugu: "te",
  malayalam: "ml",
  kannada: "kn",
  bengali: "bn",
  marathi: "mr",
  gujarati: "gu",
  urdu: "ur",
  bhojpuri: "bho",
  english: "en",
  korean: "ko",
  japanese: "ja",
  chinese: "zh",
  mandarin: "zh",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  russian: "ru",
  turkish: "tr",
  thai: "th",
  arabic: "ar",
  portuguese: "pt",
};

// name -> { movie genre id, tv genre id }. Either side may be missing.
const GENRES = {
  action: { movie: 28, tv: 10759 },
  adventure: { movie: 12, tv: 10759 },
  animation: { movie: 16, tv: 16 },
  anime: { movie: 16, tv: 16 },
  comedy: { movie: 35, tv: 35 },
  comedies: { movie: 35, tv: 35 },
  crime: { movie: 80, tv: 80 },
  documentary: { movie: 99, tv: 99 },
  documentaries: { movie: 99, tv: 99 },
  drama: { movie: 18, tv: 18 },
  dramas: { movie: 18, tv: 18 },
  family: { movie: 10751, tv: 10751 },
  fantasy: { movie: 14, tv: 10765 },
  history: { movie: 36 },
  historical: { movie: 36 },
  horror: { movie: 27 },
  music: { movie: 10402 },
  musical: { movie: 10402 },
  mystery: { movie: 9648, tv: 9648 },
  reality: { tv: 10764 },
  romance: { movie: 10749 },
  romantic: { movie: 10749 },
  "sci-fi": { movie: 878, tv: 10765 },
  scifi: { movie: 878, tv: 10765 },
  "science fiction": { movie: 878, tv: 10765 },
  thriller: { movie: 53 },
  thrillers: { movie: 53 },
  war: { movie: 10752, tv: 10768 },
  western: { movie: 37, tv: 37 },
  kids: { tv: 10762 },
};

const TV_WORDS = ["series", "show", "shows", "tv", "serial", "serials"];
const MOVIE_WORDS = ["movie", "movies", "film", "films", "cinema"];
const RECENT_WORDS = ["latest", "new", "newest", "recent", "fresh"];

// Words we can safely ignore when deciding whether a real title remains.
const FILLER = new Set([
  "best",
  "top",
  "good",
  "great",
  "popular",
  "trending",
  "all",
  "list",
  "of",
  "the",
  "a",
  "an",
  "some",
  "any",
  "watch",
  "show",
  "me",
  "find",
  "see",
  "language",
  "and",
  "in",
  "with",
  ...RECENT_WORDS,
]);

const hasWord = (text, word) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\b`, "i").test(
    text
  );

const stripEdges = (s) => s.trim().replace(/^["'\s]+|["'.\s]+$/g, "");

// Detects actor/director phrasing and returns a person plan; the caller
// resolves the name to a TMDB person and pulls their filmography.
function detectPersonIntent(original, mediaType) {
  let m = original.match(/\b(?:directed|produced|created|written)\s+by\s+(.+)$/i);
  if (m) return { kind: "person", personQuery: stripEdges(m[1]), mediaType, dept: "crew" };

  m =
    original.match(/\b(?:movies?|films?|shows?|series)\s+(?:with|starring|featuring)\s+(.+)$/i) ||
    original.match(/\b(?:starring|featuring)\s+(.+)$/i);
  if (m) return { kind: "person", personQuery: stripEdges(m[1]), mediaType, dept: "cast" };

  // "<name> movies/films/filmography" - only when the name isn't a known
  // genre/language/filler word (so "action movies" stays a genre query).
  m = original.match(/^(.+?)\s+(?:movies?|films?|filmography)$/i);
  if (m) {
    const cand = stripEdges(m[1]);
    const cl = cand.toLowerCase();
    const isVocab = LANGUAGES[cl] || GENRES[cl] || FILLER.has(cl) || cl === "anime";
    if (cand && !isVocab && cand.split(/\s+/).length <= 4) {
      return { kind: "person", personQuery: cand, mediaType, dept: "any" };
    }
  }
  return null;
}

export default function parseSmartQuery(raw) {
  const original = (raw || "").trim();
  const q = original.toLowerCase();
  if (!q) return { kind: "title", query: original };

  const consumed = [];

  // Media type
  let mediaType = null;
  if (TV_WORDS.some((w) => hasWord(q, w))) mediaType = "tv";
  else if (MOVIE_WORDS.some((w) => hasWord(q, w))) mediaType = "movie";
  [...TV_WORDS, ...MOVIE_WORDS].forEach((w) => {
    if (hasWord(q, w)) consumed.push(w);
  });

  // "like X" / "similar to X" → recommendations for the resolved title.
  const likeMatch = original.match(
    /^(?:(?:movies?|films?|tv shows?|shows?|series|something|anything)\s+)?(?:like|similar to)\s+(.+)$/i
  );
  if (likeMatch && likeMatch[1].trim().length > 1) {
    return { kind: "like", titleQuery: likeMatch[1].trim(), mediaType };
  }

  // Person intent (actor / director) → that person's filmography.
  const person = detectPersonIntent(original, mediaType);
  if (person) return person;

  // Language
  let language = null;
  Object.keys(LANGUAGES).forEach((name) => {
    if (!language && hasWord(q, name)) {
      language = LANGUAGES[name];
      consumed.push(name);
    }
  });

  // "anime" is special: Japanese animation, and mostly series. Default the
  // media type to TV and the language to Japanese so the query returns actual
  // anime rather than all animation. Always consume the word so a phrase like
  // "action anime" doesn't fall back to a literal title search.
  if (hasWord(q, "anime")) {
    if (!mediaType) mediaType = "tv";
    if (!language) language = "ja";
    consumed.push("anime");
  }

  // Genre (resolve against the chosen media type, defaulting to movie)
  const genreType = mediaType || "movie";
  let genreId = null;
  Object.keys(GENRES).forEach((name) => {
    if (genreId == null && hasWord(q, name)) {
      const ids = GENRES[name];
      if (ids[genreType] != null) {
        genreId = ids[genreType];
        consumed.push(name);
      } else if (ids.movie != null || ids.tv != null) {
        // genre exists but not for this media type - take whatever is available
        genreId = ids.movie != null ? ids.movie : ids.tv;
        consumed.push(name);
      }
    }
  });

  // Year
  const yearMatch = q.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;
  if (year) consumed.push(year);

  const recent = RECENT_WORDS.some((w) => hasWord(q, w));

  // Whatever is left after removing recognized + filler words. If a real title
  // remains (e.g. "punjabi movie chal mera putt"), prefer the title search.
  const consumedSet = new Set(consumed.join(" ").split(/\s+/).filter(Boolean));
  const leftover = q
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok && !consumedSet.has(tok) && !FILLER.has(tok));

  const hasFilterIntent = Boolean(language || genreId);

  if (!hasFilterIntent || leftover.length > 0) {
    return { kind: "title", query: original };
  }

  const params = { sort_by: recent ? "primary_release_date.desc" : "popularity.desc" };
  if (language) params.with_original_language = language;
  if (genreId != null) params.with_genres = genreId;
  if (year) {
    if (genreType === "tv") params.first_air_date_year = year;
    else params.primary_release_year = year;
  }
  // A vote-count floor keeps broad genre queries from surfacing obscure entries.
  // Skip it for language-filtered queries: regional titles (e.g. Punjabi TV)
  // legitimately have very few votes and would otherwise be filtered to nothing.
  if (!language) {
    params["vote_count.gte"] = recent ? 5 : 20;
  }

  return { kind: "discover", mediaType: genreType, params };
}
