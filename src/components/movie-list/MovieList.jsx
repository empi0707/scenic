import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./movie-list.scss";
import tmdbApi, { category } from "../../api/tmdbApi";
import MovieCard from "../movie-card/MovieCard";
import { CardRowSkeleton } from "../skeleton/Skeleton";

const MovieList = ({ category: cat, type, id, data }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getList = useCallback(async () => {
    if (data) {
      setItems(data);
      return;
    }
    setIsLoading(true);
    try {
      let response;
      const params = {};

      if (type === "anime" || type === "anime_top") {
        response = await tmdbApi.getAnime(
          type === "anime_top"
            ? { sort_by: "vote_average.desc", "vote_count.gte": 200 }
            : { sort_by: "popularity.desc" }
        );
      } else if (type !== "recommendations") {
        response =
          cat === category.movie
            ? await tmdbApi.getMoviesList(type, { params })
            : await tmdbApi.getTvList(type, { params });
      } else {
        if (!id) throw new Error("ID is required for recommendations content");
        response = await tmdbApi.recommendations(cat, id);
      }

      setItems(response.results);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch movie/TV list:", error);
      setIsLoading(false);
    }
  }, [cat, type, id, data]);

  useEffect(() => {
    getList();
  }, [getList]);

  if (isLoading) {
    return <CardRowSkeleton />;
  }

  return (
    <div className="movie-list">
      {items.length > 0 && (
        <Swiper
          modules={[Navigation, Pagination]}
          spaceBetween={12}
          slidesPerView={2}
          slidesPerGroup={2}
          navigation
          pagination={{ clickable: true }}
          speed={500}
          breakpoints={{
            480: {
              slidesPerView: 3,
              slidesPerGroup: 3,
            },
            768: {
              slidesPerView: 4,
              slidesPerGroup: 3,
            },
            1024: {
              slidesPerView: 5,
              slidesPerGroup: 3,
            },
            1280: {
              slidesPerView: 6,
              slidesPerGroup: 3,
            },
          }}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <MovieCard item={item} category={cat} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
};

MovieList.propTypes = {
  category: PropTypes.oneOf([category.movie, category.tv]).isRequired,
  type: PropTypes.string.isRequired,
  id: PropTypes.number,
  data: PropTypes.array,
};

export default MovieList;
