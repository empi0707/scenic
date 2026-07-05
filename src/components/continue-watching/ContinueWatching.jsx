import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import ContinueWatchingCard from "./ContinueWatchingCard";
import { continueWatching } from "../../utils/continueWatching";
import { watchedEpisodes } from "../../utils/watchedEpisodes";
import "./continue-watching.scss";

// A series is done once every episode is watched; hide it from the row.
const isFinished = (entry) =>
  entry.mediaType === "tv" &&
  entry.totalEpisodes > 0 &&
  watchedEpisodes.getSeriesWatched(entry.id).size >= entry.totalEpisodes;

const ContinueWatching = () => {
  const [items, setItems] = useState(() => continueWatching.getAll());

  useEffect(() => {
    const sync = () => setItems(continueWatching.getAll());
    sync();
    const offCw = continueWatching.subscribe(sync);
    const offWe = watchedEpisodes.subscribe(sync); // re-filter as episodes complete
    return () => { offCw(); offWe(); };
  }, []);

  const visible = items.filter((e) => !isFinished(e));
  if (visible.length === 0) return null;

  return (
    <div className="continue-watching movie-list">
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={12}
        slidesPerView={1}
        slidesPerGroup={1}
        navigation
        pagination={{ clickable: true }}
        speed={500}
        breakpoints={{
          480: { slidesPerView: 1.5, slidesPerGroup: 1 },
          768: { slidesPerView: 2, slidesPerGroup: 2 },
          1024: { slidesPerView: 2.5, slidesPerGroup: 2 },
          1280: { slidesPerView: 3, slidesPerGroup: 2 },
        }}
      >
        {visible.map((entry) => (
          <SwiperSlide key={`${entry.mediaType}:${entry.id}`}>
            <ContinueWatchingCard entry={entry} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ContinueWatching;
