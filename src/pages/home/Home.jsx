import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDebounce } from "use-debounce";
import { OutlineButton } from "../../components/button/Button";
import HeroSlide from "../../components/hero-slide/HeroSlide";
import MovieList from "../../components/movie-list/MovieList";
import TrendingRow from "../../components/trending-row/TrendingRow";
import OnlyOnProvider from "../../components/only-on-provider/OnlyOnProvider";
import HiddenGems from "../../components/hidden-gems/HiddenGems";
import InfoTooltip from "../../components/info-tooltip/InfoTooltip";
import FadeIn from "../../components/fade-in/FadeIn";
import { category, movieType, tvType } from "../../api/tmdbApi";
import Input from "../../components/input/Input";
import "./Home.scss";

const Home = () => {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounce(keyword, 500);
  const navigate = useNavigate();

  const goToSearch = useCallback((searchTerm) => {
    if (searchTerm && searchTerm.trim().length > 0) {
      navigate(`/search/${searchTerm}`);
    }
  }, [navigate]);

  // Auto-search with debouncing
  useEffect(() => {
    if (debouncedKeyword.trim().length > 0) {
      goToSearch(debouncedKeyword);
    }
  }, [debouncedKeyword, goToSearch]);

  // Keep Enter key functionality
  useEffect(() => {
    const enterEvent = (e) => {
      e.preventDefault();
      if (e.keyCode === 13) {
        goToSearch(keyword);
      }
    };
    document.addEventListener("keyup", enterEvent);
    return () => {
      document.removeEventListener("keyup", enterEvent);
    };
  }, [keyword, goToSearch]);

  return (
    <div className="home-page">
      <HeroSlide />
      <div className="container">
        <FadeIn>
          <div className="section mb-3">
            <div className="search-container">
              <div className="movie-search">
                <i className="bx bx-search search-icon"></i>
                <Input
                  type="text"
                  placeholder="Search Movies/Series"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={150}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>Trending Today</h2>
            </div>
            <TrendingRow
              mediaType="all"
              timeWindow="day"
              limit={20}
              showRank={false}
            />
          </div>
        </FadeIn>

        <FadeIn delay={175}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>Top 10 This Week</h2>
            </div>
            <TrendingRow mediaType="all" timeWindow="week" limit={10} />
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="section mb-3">
            <OnlyOnProvider mediaType="all" limit={24} />
          </div>
        </FadeIn>

        <FadeIn delay={225}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>
                Hidden Gems
                <InfoTooltip label="What are Hidden Gems?">
                  Highly rated movies and shows that most people haven't
                  seen yet. We pick titles rated above 7.5 out of 10,
                  with 80 to 800 reviews.
                </InfoTooltip>
              </h2>
            </div>
            <HiddenGems limit={24} />
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>Popular Movies</h2>
              <Link to="/movie">
                <OutlineButton className="small">View more</OutlineButton>
              </Link>
            </div>
            <MovieList category={category.movie} type={movieType.popular} />
          </div>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>Top Rated Movies</h2>
              <Link to="/movie">
                <OutlineButton className="small">View more</OutlineButton>
              </Link>
            </div>
            <MovieList category={category.movie} type={movieType.top_rated} />
          </div>
        </FadeIn>

        <FadeIn delay={400}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>Popular TV</h2>
              <Link to="/tv">
                <OutlineButton className="small">View more</OutlineButton>
              </Link>
            </div>
            <MovieList category={category.tv} type={tvType.popular} />
          </div>
        </FadeIn>

        <FadeIn delay={500}>
          <div className="section mb-3">
            <div className="section__header mb-2">
              <h2>Top Rated TV</h2>
              <Link to="/tv">
                <OutlineButton className="small">View more</OutlineButton>
              </Link>
            </div>
            <MovieList category={category.tv} type={tvType.top_rated} />
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default Home;
