import React, { useState, useEffect, useCallback } from "react";
import tmdbApi, { category } from "../../api/tmdbApi";
import MovieCard from "../../components/movie-card/MovieCard";
import { OutlineButton } from "../../components/button/Button";
import GlassSelect from "../../components/glass-select/GlassSelect";
import Loading from "../../components/loading/Loading";
import { SORT_OPTIONS, DEFAULT_SORT, sortParamsFor } from "../../utils/sort";
import "../Catalog.scss";
import "../../components/movie-grid/movie-grid.scss";

const DESCRIPTION =
  "Step into the world of anime, from epic shonen showdowns to quiet slice-of-life gems. Stream the series capturing fans across the globe.";

const Anime = () => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAnime = useCallback(
    (pageNum) =>
      tmdbApi.getAnime({ page: pageNum, ...sortParamsFor("tv", sort) }),
    [sort]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.scrollTo(0, 0);
    fetchAnime(1)
      .then((res) => {
        if (cancelled) return;
        setItems(res.results || []);
        setTotalPage(res.total_pages || 0);
        setPage(1);
      })
      .catch((e) => console.error("Anime fetch failed:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAnime]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchAnime(page + 1);
      setItems((prev) => [...prev, ...(res.results || [])]);
      setPage(page + 1);
    } catch (e) {
      console.error("Error loading more anime:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="catalog-page">
      <div className="container">
        <div className="section mb-3">
          <div className="catalog-page__header">
            <h2>Anime</h2>
            <p className="catalog-page__desc">{DESCRIPTION}</p>
          </div>

          <div className="grid-toolbar">
            <div className="grid-toolbar__sort">
              <i className="bx bx-sort-alt-2" />
              <span className="grid-toolbar__label">Sort by:</span>
              <GlassSelect
                className="glass-select--sm"
                ariaLabel="Sort by"
                clearable={false}
                options={SORT_OPTIONS}
                value={sort}
                onChange={(val) => setSort(val || DEFAULT_SORT)}
              />
            </div>
          </div>

          {loading ? (
            <Loading size="large" />
          ) : (
            <>
              <div className="movie-grid">
                {items.map(
                  (item, i) =>
                    (item.poster_path || item.backdrop_path) && (
                      <MovieCard category={category.tv} item={item} key={i} />
                    )
                )}
              </div>
              {page < totalPage && (
                <div className="movie-grid__loadmore">
                  <OutlineButton
                    className="small"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </OutlineButton>
                </div>
              )}
              {loadingMore && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "1rem",
                  }}
                >
                  <Loading size="small" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Anime;
