import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import MovieCard from "../movie-card/MovieCard";
import { continueWatching } from "../../utils/continueWatching";
import "./continue-watching.scss";

// Re-hydrate a stored entry into the shape MovieCard expects so we can
// reuse the same card without forking visuals.
const toMovieCardItem = (entry) => ({
  id: entry.id,
  media_type: entry.mediaType,
  title: entry.title,
  name: entry.title,
  poster_path: entry.posterPath,
  backdrop_path: entry.backdropPath,
  vote_average: entry.voteAverage,
  release_date: entry.mediaType === "movie" ? entry.releaseDate : undefined,
  first_air_date: entry.mediaType === "tv" ? entry.releaseDate : undefined,
});

const ContinueWatching = () => {
  const [items, setItems] = useState(() => continueWatching.getAll());

  useEffect(() => {
    const sync = () => setItems(continueWatching.getAll());
    sync();
    return continueWatching.subscribe(sync);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="continue-watching movie-list">
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
        {items.map((entry) => (
          <SwiperSlide key={`${entry.mediaType}:${entry.id}`}>
            <MovieCard item={toMovieCardItem(entry)} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ContinueWatching;
