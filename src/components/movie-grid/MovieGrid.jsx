import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import "./movie-grid.scss";
import MovieCard from "../movie-card/MovieCard";
import { OutlineButton } from "../button/Button";
import Loading from "../loading/Loading";
import GlassSelect from "../glass-select/GlassSelect";
import tmdbApi, { category, movieType, tvType } from "../../api/tmdbApi";
import { DEFAULT_SORT, SORT_OPTIONS, sortParamsFor } from "../../utils/sort";

const MovieGrid = (props) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedSort, setSelectedSort] = useState(DEFAULT_SORT);
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
            ...sortParamsFor(props.category, selectedSort),
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
      } else if (selectedSort !== DEFAULT_SORT) {
        // Sort-only mode (no genre/country) - use Discover so we can sort
        const param = {
          page: 1,
          include_adult: false,
          include_video: false,
          language: "en-US",
          ...sortParamsFor(props.category, selectedSort),
        };
        response =
          props.category === category.movie
            ? await tmdbApi.getMoviesByGenre(param)
            : await tmdbApi.getTvByGenre(param);
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
  }, [props.category, props.type, keyword, selectedGenre, selectedCountry, selectedSort, genresLoaded]);

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
            ...sortParamsFor(props.category, selectedSort),
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
      } else if (selectedSort !== DEFAULT_SORT) {
        // Sort-only mode (no genre/country) - use Discover so we can sort
        const param = {
          page: page + 1,
          include_adult: false,
          include_video: false,
          language: "en-US",
          ...sortParamsFor(props.category, selectedSort),
        };
        response =
          props.category === category.movie
            ? await tmdbApi.getMoviesByGenre(param)
            : await tmdbApi.getTvByGenre(param);
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

  if (isLoading) {
    return <Loading size="large" />;
  }

  return (
    <>
      <div className="section mb-3">
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Custom glass dropdowns - remote/keyboard navigable, no typing
              needed, so they stay usable on the TV browser. */}
          <GlassSelect
            ariaLabel="Filter by genre"
            placeholder="All genres"
            options={genres}
            value={selectedGenre ? selectedGenre.value : null}
            onChange={(val) => {
              const opt =
                val != null
                  ? genres.find((g) => String(g.value) === String(val))
                  : null;
              handleGenreChange(opt || null);
            }}
          />
          <GlassSelect
            ariaLabel="Filter by country"
            placeholder="All countries"
            options={countries}
            value={selectedCountry ? selectedCountry.value : null}
            onChange={(val) => {
              const opt =
                val != null
                  ? countries.find((c) => String(c.value) === String(val))
                  : null;
              setSelectedCountry(opt || null);
            }}
          />
        </div>
      </div>
      {keyword === undefined && !props.type && (
        <div className="grid-toolbar">
          <div className="grid-toolbar__sort">
            <i className="bx bx-sort-alt-2" />
            <span className="grid-toolbar__label">Sort by:</span>
            <GlassSelect
              className="glass-select--sm"
              ariaLabel="Sort by"
              clearable={false}
              options={SORT_OPTIONS}
              value={selectedSort}
              onChange={(val) => setSelectedSort(val || DEFAULT_SORT)}
            />
          </div>
        </div>
      )}
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

export default MovieGrid;