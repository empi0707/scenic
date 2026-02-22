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
import Loading from "../loading/Loading";

const MovieList = ({ category: cat, type, id }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getList = useCallback(async () => {
    setIsLoading(true);
    try {
      let response;
      const params = {};

      if (type !== "recommendations") {
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
  }, [cat, type, id]);

  useEffect(() => {
    getList();
  }, [getList]);

  if (isLoading) {
    return <Loading size="small" />;
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
};

export default MovieList;
