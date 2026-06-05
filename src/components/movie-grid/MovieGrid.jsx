import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import "./movie-grid.scss";
import MovieCard from "../movie-card/MovieCard";
import { OutlineButton } from "../button/Button";
import Input from "../input/Input";
import Loading from "../loading/Loading";
import MicButton from "../mic-button/MicButton";
import SearchSuggestions from "../search-suggestions/SearchSuggestions";
import useSearchSuggestions from "../../hooks/useSearchSuggestions";
import tmdbApi, { category, movieType, tvType } from "../../api/tmdbApi";
import Select from "react-select";

const MovieGrid = (props) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { keyword } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const genreFromUrl = searchParams.get('genre');

  // Track if genres have been loaded and validated
  const [genresLoaded, setGenresLoaded] = useState(false);

  useEffect(() => {
    const initializeComponent = async () => {
      setGenresLoaded(false);
      setSelectedGenre(null);
      setSelectedCountry(null);

      try {
        // Load genres for current category
        const [genreResponse, countryResponse] = await Promise.all([
          tmdbApi.getGenreList(props.category),
          tmdbApi.getCountryList()
        ]);

        const genreOptions = genreResponse.genres.map((genre) => ({
          value: genre.id,
          label: genre.name,
        }));
        setGenres(genreOptions);

        const countryOptions = countryResponse.map((country) => ({
          value: country.iso_3166_1,
          label: country.english_name,
        }));
        setCountries(countryOptions);

        // Only set selected genre if it exists in current category AND we're not on a type page
        if (genreFromUrl && !props.type) {
          const genreOption = genreOptions.find(genre => genre.value.toString() === genreFromUrl);
          if (genreOption) {
            setSelectedGenre(genreOption);
          } else {
            // Genre doesn't exist for this category, clear URL
            const currentPath = location.pathname;
            navigate(currentPath, { replace: true });
          }
        }

        setGenresLoaded(true);
      } catch (error) {
        console.error("Error fetching genres/countries:", error);
        setGenresLoaded(true);
      }
    };

    initializeComponent();
  }, [props.category, props.type, genreFromUrl, location.pathname, navigate]);

  // Handle genre selection and URL update
  const handleGenreChange = (genre) => {
    setSelectedGenre(genre);
    const currentPath = location.pathname;
    if (genre) {
      navigate(`${currentPath}?genre=${genre.value}`);
    } else {
      navigate(currentPath);
    }
  };

  const getList = async () => {
    setIsLoading(true);
    try {
      let response = null;
      const params = {};
      
      if (keyword !== undefined) {
        // Search mode
        params.query = keyword;
        response = await tmdbApi.search(props.category, { params });
      } else if (props.type) {
        // Type mode (e.g., top_rated, now_playing) - prioritize type over genre/country
        switch (props.category) {
          case category.movie:
            response = await tmdbApi.getMoviesList(props.type, { params });
            break;
          default:
            response = await tmdbApi.getTvList(props.type, { params });
        }
      } else if (selectedGenre || selectedCountry) {
        // Genre/Country filtering mode - but validate genre exists for current category
        const validGenre = selectedGenre && genres.find(g => g.value === selectedGenre.value);
        
        if (validGenre || selectedCountry) {
          const param = {
            page: 1,
            include_adult: false,
            include_video: false,
            language: "en-US",
            sort_by: "popularity.desc",
          };
          
          // Only add genre if it's valid for current category
          if (validGenre) param.with_genres = validGenre.value;
          if (selectedCountry) param.with_origin_country = selectedCountry.value;

          if (props.category === category.movie) {
            response = await tmdbApi.getMoviesByGenre(param);
          } else {
            response = await tmdbApi.getTvByGenre(param);
          }
        } else {
          // Invalid genre for this category, fall back to popular content
          switch (props.category) {
            case category.movie:
              response = await tmdbApi.getMoviesList(movieType.popular, { params });
              break;
            default:
              response = await tmdbApi.getTvList(tvType.popular, { params });
          }
          
          // Clear invalid genre selection and URL
          setSelectedGenre(null);
          const currentPath = location.pathname;
          navigate(currentPath, { replace: true });
        }
      } else {
        // Default mode - popular content
        switch (props.category) {
          case category.movie:
            response = await tmdbApi.getMoviesList(movieType.popular, { params });
            break;
          default:
            response = await tmdbApi.getTvList(tvType.popular, { params });
        }
      }
      setItems(response.results);
      setTotalPage(response.total_pages);
      setPage(1); // Reset page when getting new list
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only make API calls after genres have been loaded and validated
    if (genresLoaded) {
      getList();
    }
    // eslint-disable-next-line
  }, [props.category, props.type, keyword, selectedGenre, selectedCountry, genresLoaded]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      let response = null;
      const params = {
        page: page + 1,
      };
      
      if (keyword !== undefined) {
        // Search mode
        params.query = keyword;
        response = await tmdbApi.search(props.category, { params });
      } else if (props.type) {
        // Type mode (e.g., top_rated, now_playing) - prioritize type over genre/country
        switch (props.category) {
          case category.movie:
            response = await tmdbApi.getMoviesList(props.type, { params });
            break;
          default:
            response = await tmdbApi.getTvList(props.type, { params });
        }
      } else if (selectedGenre || selectedCountry) {
        // Genre/Country filtering mode - validate genre exists for current category
        const validGenre = selectedGenre && genres.find(g => g.value === selectedGenre.value);
        
        if (validGenre || selectedCountry) {
          const param = {
            page: page + 1,
            include_adult: false,
            include_video: false,
            language: "en-US",
            sort_by: "popularity.desc",
          };
          
          // Only add genre if it's valid for current category
          if (validGenre) param.with_genres = validGenre.value;
          if (selectedCountry) param.with_origin_country = selectedCountry.value;

          if (props.category === category.movie) {
            response = await tmdbApi.getMoviesByGenre(param);
          } else {
            response = await tmdbApi.getTvByGenre(param);
          }
        } else {
          // Invalid genre, fall back to popular content
          switch (props.category) {
            case category.movie:
              response = await tmdbApi.getMoviesList(movieType.popular, { params });
              break;
            default:
              response = await tmdbApi.getTvList(tvType.popular, { params });
          }
        }
      } else {
        // Default mode - popular content
        switch (props.category) {
          case category.movie:
            response = await tmdbApi.getMoviesList(movieType.popular, { params });
            break;
          default:
            response = await tmdbApi.getTvList(tvType.popular, { params });
        }
      }
      setItems([...items, ...response.results]);
      setPage(page + 1);
    } catch (error) {
      console.error("Error loading more content:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Custom styles for the Select component - matching season dropdown
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "#141414",
      border: state.isFocused ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: "6px",
      color: "#e5e5e5",
      minWidth: '12rem',
      maxWidth: '12rem',
      boxShadow: state.isFocused ? "0 0 0 2px rgba(255,255,255,0.06)" : "none",
      "&:hover": {
        borderColor: "rgba(255,255,255,0.15)"
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#e5e5e5",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "#1c1c1c",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "6px",
      maxWidth: '12rem',
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
      zIndex: 9999
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#e5e5e5"
        : state.isFocused
          ? "rgba(255,255,255,0.06)"
          : "transparent",
      color: state.isSelected ? "#0a0a0a" : "#e5e5e5",
      cursor: 'pointer',
      "&:hover": {
        backgroundColor: "rgba(255,255,255,0.06)",
      },
      maxWidth: '12rem'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#666666",
    }),
    input: (provided) => ({
      ...provided,
      color: "#e5e5e5",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#666666",
      "&:hover": {
        color: "#e5e5e5"
      }
    }),
  };

  if (isLoading) {
    return <Loading size="large" />;
  }

  return (
    <>
      <div className="section mb-3">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MovieSearch category={props.category} keyword={keyword} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Select
            options={genres}
            onChange={handleGenreChange}
            value={selectedGenre}
            placeholder="Select a genre"
            isSearchable={true}
            isClearable={true}
            styles={customSelectStyles}
            menuPortalTarget={document.body}
          />
          <Select
            options={countries}
            onChange={(country) => setSelectedCountry(country)}
            value={selectedCountry}
            placeholder="Select a country"
            isSearchable={true}
            isClearable={true}
            styles={customSelectStyles}
            menuPortalTarget={document.body}
          />
        </div>
      </div>
      <div className="movie-grid">
        {items.map((item, i) => (
          (item.poster_path || item.backdrop_path) && <MovieCard category={props.category} item={item} key={i} />
        ))}
      </div>
      {page < totalPage ? (
        <div className="movie-grid__loadmore">
          <OutlineButton 
            className="small" 
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </OutlineButton>
        </div>
      ) : null}
      {isLoadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Loading size="small" />
        </div>
      )}
    </>
  );
};

const MovieSearch = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [keyword, setKeyword] = useState(props.keyword ? props.keyword : "");
  const [showSuggest, setShowSuggest] = useState(false);
  const { suggestions, loading: suggestLoading } = useSearchSuggestions(keyword);
  const searchRef = useRef(null);

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

  // Search runs only on submit (search icon click or keyboard Enter/Done),
  // never per-keystroke - so the on-screen keyboard keeps focus while typing.
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggest(false);
    const term = keyword.trim();
    if (term.length > 0) {
      navigate(`/${category[props.category]}/search/${encodeURIComponent(term)}`);
    } else if (location.pathname.includes('/search/')) {
      // Cleared the search box on a search page - go back to the category.
      navigate(`/${category[props.category]}`);
    }
  };

  return (
    <div className="movie-search-wrap">
      <form
        className="movie-search"
        onSubmit={handleSearchSubmit}
        role="search"
        ref={searchRef}
      >
        <Input
          type="search"
          enterKeyHint="search"
          placeholder={`Search ${category[props.category] === "tv" ? "Series" : "Movies"
            }`}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setShowSuggest(true)}
        />
        {keyword && (
          <button
            type="button"
            className="clear-btn"
            aria-label="Clear search"
            onClick={() => {
              setKeyword("");
              if (location.pathname.includes('/search/')) {
                navigate(`/${category[props.category]}`);
              }
            }}
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
            if (term) {
              navigate(`/${category[props.category]}/search/${encodeURIComponent(term)}`);
            }
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
  );
};

export default MovieGrid;