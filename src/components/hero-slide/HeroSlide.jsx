import React, { useState, useEffect, useRef } from "react";
import SwiperCore from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import Button, { OutlineButton } from "../button/Button";
import tmdbApi, { movieType } from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import "./hero-slide.scss";
import { useNavigate } from "react-router";
import { PlayIcon } from "../../assets/icons/PlayIcon";

const HeroSlide = () => {
  SwiperCore.use([Autoplay]);

  const [movieItems, setMovieItems] = useState([]);

  useEffect(() => {
    const getMovies = async () => {
      const params = { page: 1 };
      try {
        const response = await tmdbApi.getMoviesList(movieType.popular, {
          params,
        });
        setMovieItems(response.results.slice(0, 5));
      } catch {
        console.log("error");
      }
    };
    getMovies();
  }, []);

  return (
    <div className="hero-slide">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        grabCursor={false}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 7000, disableOnInteraction: false }}
        pagination={{ clickable: true, el: ".hero-pagination" }}
        speed={800}
      >
        {movieItems.map((item, i) => (
          <SwiperSlide key={i}>
            {({ isActive }) => (
              <HeroSlideItem
                item={item}
                className={`${isActive ? "active" : ""}`}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="hero-pagination" />
    </div>
  );
};

const HeroSlideItem = (props) => {
  let navigate = useNavigate();
  const item = props.item;
  const imgRef = useRef(null);

  const background = apiConfig.originalImage(
    item.backdrop_path ? item.backdrop_path : item.poster_path
  );

  return (
    <div className={`hero-slide__item ${props.className}`}>
      <div
        className="hero-slide__item__bg"
        ref={imgRef}
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="hero-slide__item__content container">
        <div className="hero-slide__item__content__info">
          <span className="now-playing-badge">Now Playing</span>
          <h2 className="title">{item.title}</h2>
          <div className="overview">{item.overview}</div>
          <div className="meta">
            <span className="rating">
              <i className="bx bxs-star"></i> {item.vote_average?.toFixed(1)}
            </span>
            <span className="divider" />
            <span className="year">
              {item.release_date?.split("-")[0]}
            </span>
            <span className="divider" />
            <span className="quality">HD</span>
          </div>
          <div className="btns">
            <Button
              onClick={() => navigate("/movie/" + item.id)}
              icon={<PlayIcon />}
            >
              Watch Now
            </Button>
            <OutlineButton
              onClick={() => navigate("/movie/" + item.id)}
            >
              <i className="bx bx-info-circle" style={{ marginRight: '0.4rem', fontSize: '1.1rem' }}></i>
              More Info
            </OutlineButton>
          </div>
        </div>
        <div className="hero-slide__item__content__poster">
          <div className="poster-wrapper">
            <img
              src={apiConfig.w500Image(item.poster_path)}
              alt={item.title}
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSlide;
