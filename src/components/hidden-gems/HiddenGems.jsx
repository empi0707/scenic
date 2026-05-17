import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import tmdbApi, { category } from "../../api/tmdbApi";
import MovieCard from "../movie-card/MovieCard";
import Loading from "../loading/Loading";
import "../movie-list/movie-list.scss";

// "Hidden Gems" surfaces highly-rated titles with smaller audiences. We
// fetch movies AND TV with the same heuristic and merge them, sorted by
// rating, so the row mixes both media types.
const HIDDEN_GEM_PARAMS = {
  "vote_average.gte": 7.5,
  "vote_count.gte": 80,
  "vote_count.lte": 800,
  sort_by: "vote_average.desc",
  include_adult: false,
};

const HiddenGems = ({ limit = 24 }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [movieRes, tvRes] = await Promise.all([
          tmdbApi.getMoviesByGenre(HIDDEN_GEM_PARAMS),
          tmdbApi.getTvByGenre(HIDDEN_GEM_PARAMS),
        ]);

        const movies = (movieRes.results || []).map((m) => ({
          ...m,
          media_type: "movie",
        }));
        const tv = (tvRes.results || []).map((t) => ({
          ...t,
          media_type: "tv",
        }));

        const merged = [...movies, ...tv]
          .filter((m) => m.poster_path || m.backdrop_path)
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
          .slice(0, limit);

        if (!cancelled) setItems(merged);
      } catch (e) {
        console.error("Hidden gems fetch failed:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (isLoading) return <Loading size="small" />;
  if (items.length === 0) return null;

  return (
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
  );
};

export default HiddenGems;
