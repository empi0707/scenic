import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import Button from "../button/Button";
import "./trending-row.scss";

const SWIPER_BREAKPOINTS = {
  480: { slidesPerView: 3, slidesPerGroup: 3 },
  768: { slidesPerView: 4, slidesPerGroup: 3 },
  1024: { slidesPerView: 5, slidesPerGroup: 3 },
  1280: { slidesPerView: 6, slidesPerGroup: 3 },
};

const TrendingRowSkeleton = () => (
  <div className="trending-row trending-row--skeleton">
    <div className="trending-row__skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="trending-slide">
          <div className="trending-slide__card trending-slide__card--skeleton"></div>
        </div>
      ))}
    </div>
  </div>
);

const TrendingRow = ({
  mediaType = "all",
  timeWindow = "week",
  limit = 10,
  showRank = true,
}) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await tmdbApi.trending(mediaType, timeWindow);
        const filtered = (res.results || [])
          .filter(
            (i) =>
              i.poster_path &&
              (i.media_type === "movie" || i.media_type === "tv")
          )
          .slice(0, limit);
        if (!cancelled) setItems(filtered);
      } catch (e) {
        console.error("Trending fetch failed:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mediaType, timeWindow, limit]);

  if (isLoading) return <TrendingRowSkeleton />;
  if (items.length === 0) return null;

  return (
    <div className="trending-row">
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={12}
        slidesPerView={2}
        slidesPerGroup={2}
        navigation
        pagination={{ clickable: true }}
        speed={500}
        breakpoints={SWIPER_BREAKPOINTS}
      >
        {items.map((item, i) => {
          const rank = i + 1;
          const link = `/${item.media_type}/${item.id}`;
          const poster = apiConfig.w500Image(item.poster_path);
          const dateStr = item.release_date || item.first_air_date;
          const year = dateStr ? new Date(dateStr).getFullYear() : "TBA";
          return (
            <SwiperSlide key={`${item.media_type}-${item.id}`}>
              <Link
                to={link}
                className={`trending-slide trending-slide--rank-${rank}`}
                aria-label={`Number ${rank}: ${item.title || item.name}`}
              >
                <div
                  className="trending-slide__card"
                  style={{ backgroundImage: `url(${poster})` }}
                >
                  <Button>
                    <i className="bx bx-play"></i>
                  </Button>
                  <span
                    className={`trending-slide__badge trending-slide__badge--${item.media_type}`}
                  >
                    {item.media_type === "tv" ? "Series" : "Movie"}
                  </span>
                  {item.vote_average > 0 && (
                    <span className="trending-slide__rating">
                      <i className="bx bxs-star"></i>
                      {item.vote_average.toFixed(1)}
                    </span>
                  )}
                  {showRank && (
                    <span className="trending-slide__rank" aria-hidden="true">
                      <span className="trending-slide__rank-number">{rank}</span>
                    </span>
                  )}
                </div>
                <div className="trending-slide__title">
                  <h3>{item.title || item.name}</h3>
                  <p className="trending-slide__year">{year}</p>
                </div>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default TrendingRow;
