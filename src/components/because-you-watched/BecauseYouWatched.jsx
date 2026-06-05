import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import tmdbApi, { category } from "../../api/tmdbApi";
import MovieCard from "../movie-card/MovieCard";
import { continueWatching } from "../../utils/continueWatching";
import { watchlist } from "../../utils/watchlist";
import "../movie-list/movie-list.scss";
import "./because-you-watched.scss";

const keyOf = (mediaType, id) => `${mediaType}:${id}`;

// "Because you watched X" - personalized recommendations from the user's own
// activity. The source title rotates among the few most-recent Continue
// Watching items (falling back to My List) each time Home mounts, so the row
// stays fresh. Anything already being watched or saved is filtered out.
const BecauseYouWatched = ({ limit = 20, poolSize = 5 }) => {
  const [source, setSource] = useState(null);
  const [items, setItems] = useState([]);
  const [prefix, setPrefix] = useState("Because you watched");

  useEffect(() => {
    const continueList = continueWatching.getAll();
    const savedList = watchlist.getAll();
    // Prefer Continue Watching (a stronger signal than a saved-for-later item).
    const fromContinue = continueList.length > 0;
    const pool = (fromContinue ? continueList : savedList).slice(0, poolSize);
    if (pool.length === 0) return undefined;

    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (!picked || picked.id == null) return undefined;

    // Don't recommend titles the user already watches or has saved.
    const exclude = new Set([
      ...continueList.map((it) => keyOf(it.mediaType, it.id)),
      ...savedList.map((it) => keyOf(it.mediaType, it.id)),
    ]);

    let cancelled = false;
    const cate = picked.mediaType === "tv" ? category.tv : category.movie;

    const run = async () => {
      try {
        // One call gets the source's language/genres plus TMDB's own
        // recommendations and similar lists.
        const detail = await tmdbApi.detail(cate, picked.id, {
          params: { append_to_response: "recommendations,similar" },
        });
        const lang = detail.original_language;
        const genreId = detail.genres && detail.genres[0] && detail.genres[0].id;

        let candidates = [
          ...((detail.recommendations && detail.recommendations.results) || []),
          ...((detail.similar && detail.similar.results) || []),
        ];

        // TMDB's recommendations are weak for non-English titles, so supplement
        // with popular same-language, same-genre titles via Discover.
        if (lang && lang !== "en") {
          try {
            const disc = await tmdbApi.discover(cate, {
              with_original_language: lang,
              ...(genreId ? { with_genres: genreId } : {}),
              sort_by: "popularity.desc",
            });
            candidates = [...((disc && disc.results) || []), ...candidates];
          } catch (e) {
            /* supplement is best-effort */
          }
        }

        if (cancelled) return;

        const seen = new Set();
        const recs = candidates
          .map((it) => ({ ...it, media_type: picked.mediaType }))
          .filter((it) => {
            if (it.id === picked.id) return false;
            const k = keyOf(picked.mediaType, it.id);
            if (exclude.has(k) || seen.has(k)) return false;
            if (!it.poster_path && !it.backdrop_path) return false;
            seen.add(k);
            return true;
          });

        // Put same-language titles first so regional rows stay on-topic.
        if (lang) {
          recs.sort(
            (a, b) =>
              (a.original_language === lang ? 0 : 1) -
              (b.original_language === lang ? 0 : 1)
          );
        }

        const final = recs.slice(0, limit);
        if (final.length > 0) {
          setSource(picked);
          setItems(final);
          setPrefix(fromContinue ? "Because you watched" : "More like");
        }
      } catch (e) {
        console.error("Recommendations fetch failed:", e);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [limit, poolSize]);

  if (!source || items.length === 0) return null;

  return (
    <div className="section mb-3">
      <div className="section__header mb-2">
        <h2>
          {prefix} <span className="because-title">{source.title}</span>
        </h2>
      </div>
      <div className="movie-list">
        <Swiper
          modules={[Navigation, Pagination]}
          spaceBetween={12}
          slidesPerView={2}
          slidesPerGroup={2}
          navigation
          pagination={{ clickable: true }}
          speed={500}
          breakpoints={{
            480: { slidesPerView: 3, slidesPerGroup: 3 },
            768: { slidesPerView: 4, slidesPerGroup: 3 },
            1024: { slidesPerView: 5, slidesPerGroup: 3 },
            1280: { slidesPerView: 6, slidesPerGroup: 3 },
          }}
        >
          {items.map((item) => (
            <SwiperSlide key={`${item.media_type}-${item.id}`}>
              <MovieCard
                item={item}
                category={item.media_type === "tv" ? category.tv : category.movie}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default BecauseYouWatched;
