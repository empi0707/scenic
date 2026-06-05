import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OutlineButton } from "../../components/button/Button";
import HeroSlide from "../../components/hero-slide/HeroSlide";
import MovieList from "../../components/movie-list/MovieList";
import TrendingRow from "../../components/trending-row/TrendingRow";
import OnlyOnProvider from "../../components/only-on-provider/OnlyOnProvider";
import HiddenGems from "../../components/hidden-gems/HiddenGems";
import ContinueWatching from "../../components/continue-watching/ContinueWatching";
import InfoTooltip from "../../components/info-tooltip/InfoTooltip";
import ConfirmDialog from "../../components/confirm-dialog/ConfirmDialog";
import { continueWatching } from "../../utils/continueWatching";
import FadeIn from "../../components/fade-in/FadeIn";
import { category, movieType, tvType } from "../../api/tmdbApi";
import Input from "../../components/input/Input";
import MicButton from "../../components/mic-button/MicButton";
import SearchSuggestions from "../../components/search-suggestions/SearchSuggestions";
import useSearchSuggestions from "../../hooks/useSearchSuggestions";
import "./Home.scss";

const Home = () => {
  const [keyword, setKeyword] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const { suggestions, loading: suggestLoading } = useSearchSuggestions(keyword);
  const searchRef = useRef(null);
  const [hasContinue, setHasContinue] = useState(
    () => continueWatching.getAll().length > 0
  );
  const [clearOpen, setClearOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setHasContinue(continueWatching.getAll().length > 0);
    sync();
    return continueWatching.subscribe(sync);
  }, []);

  // Close the suggestions dropdown when clicking/tapping outside the search box.
  useEffect(() => {
    if (!showSuggest) return undefined;
    const onDocPointerDown = (e) => {
      const insideBox = searchRef.current && searchRef.current.contains(e.target);
      const insideDropdown = e.target.closest && e.target.closest(".search-suggestions");
      if (!insideBox && !insideDropdown) {
        setShowSuggest(false);
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
    };
  }, [showSuggest]);

  const handleClearContinue = () => setClearOpen(true);
  const confirmClear = () => {
    continueWatching.clear();
    setClearOpen(false);
  };

  // Search runs only on submit (search icon click or keyboard Enter/Done),
  // never per-keystroke - so the on-screen keyboard keeps focus while typing.
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggest(false);
    const term = keyword.trim();
    if (term.length > 0) {
      navigate(`/search/${encodeURIComponent(term)}`);
    }
  };

  return (
    <div className="home-page">
      <ConfirmDialog
        open={clearOpen}
        title="Clear Continue Watching?"
        message="This removes every title from your Continue Watching row. Your saved My List items stay untouched."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmClear}
        onCancel={() => setClearOpen(false)}
      />
      <HeroSlide />
      <div className="container">
        <FadeIn>
          <div className="section mb-3">
            <div className="search-container">
              <form
                className="movie-search"
                onSubmit={handleSearchSubmit}
                role="search"
                ref={searchRef}
              >
                <Input
                  type="search"
                  enterKeyHint="search"
                  placeholder="Search Movies/Series"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={() => setShowSuggest(true)}
                />
                {keyword && (
                  <button
                    type="button"
                    className="clear-btn"
                    aria-label="Clear search"
                    onClick={() => setKeyword("")}
                  >
                    <i className="bx bx-x"></i>
                  </button>
                )}
                <MicButton
                  onTranscript={(t) => setKeyword(t)}
                  onFinal={(t) => {
                    const term = t.trim();
                    setKeyword(term);
                    setShowSuggest(false);
                    if (term) navigate(`/search/${encodeURIComponent(term)}`);
                  }}
                />
                <button type="submit" className="search-btn" aria-label="Search">
                  <i className="bx bx-search"></i>
                </button>
                {showSuggest && (
                  <SearchSuggestions
                    items={suggestions}
                    loading={suggestLoading}
                    query={keyword}
                    anchorRef={searchRef}
                    onSelect={() => setShowSuggest(false)}
                    onSeeAll={handleSearchSubmit}
                  />
                )}
              </form>
            </div>
          </div>
        </FadeIn>

        {hasContinue && (
          <FadeIn delay={120}>
            <div className="section mb-3">
              <div className="section__header mb-2">
                <h2>Continue Watching</h2>
                <button
                  type="button"
                  className="continue-watching__clear"
                  onClick={handleClearContinue}
                  aria-label="Clear Continue Watching"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                  Clear
                </button>
              </div>
              <ContinueWatching />
            </div>
          </FadeIn>
        )}

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
