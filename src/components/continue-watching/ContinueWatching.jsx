import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import ContinueWatchingCard from "./ContinueWatchingCard";
import { continueWatching } from "../../utils/continueWatching";
import "./continue-watching.scss";

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
        {items.map((entry) => (
          <SwiperSlide key={`${entry.mediaType}:${entry.id}`}>
            <ContinueWatchingCard entry={entry} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ContinueWatching;
