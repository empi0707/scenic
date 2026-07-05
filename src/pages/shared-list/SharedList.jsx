import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { detailPath } from "../../utils/slug";
import toast from "react-hot-toast";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import { watchlist } from "../../utils/watchlist";
import { decodeList } from "../../utils/shareList";
import BookmarkButton from "../../components/bookmark-button/BookmarkButton";
import { CardGridSkeleton } from "../../components/skeleton/Skeleton";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "../my-list/my-list.scss";
import "./shared-list.scss";

const formatYear = (date) => {
  if (!date) return null;
  try {
    return new Date(date).getFullYear();
  } catch {
    return null;
  }
};

const SharedCard = ({ item }) => {
  const bg = apiConfig.w500Image(item.posterPath || item.backdropPath);
  const year = formatYear(item.releaseDate);
  const toggleItem = {
    id: item.id,
    media_type: item.mediaType,
    title: item.title,
    poster_path: item.posterPath,
    backdrop_path: item.backdropPath,
    vote_average: item.voteAverage,
    release_date: item.releaseDate,
  };

  return (
    <Link to={detailPath(item.mediaType, item.id, item.title || item.name)} className="my-list__card-link">
      <div className="my-list__card">
        <div
          className="my-list__poster"
          style={bg ? { backgroundImage: `url(${bg})` } : {}}
        >
          {!bg && (
            <span className="my-list__poster-fallback">
              {item.title?.charAt(0) || "?"}
            </span>
          )}
          <span className={`my-list__badge my-list__badge--${item.mediaType}`}>
            {item.mediaType === "tv" ? "Series" : "Movie"}
          </span>
          {item.voteAverage ? (
            <span className="my-list__rating">
              <i className="bx bxs-star"></i>
              {item.voteAverage.toFixed(1)}
            </span>
          ) : null}
          <BookmarkButton item={toggleItem} mediaType={item.mediaType} variant="card" />
        </div>
        <div className="my-list__meta">
          <h3>{item.title}</h3>
          {year && <p>{year}</p>}
        </div>
      </div>
    </Link>
  );
};

const SharedList = () => {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("items") || "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle("Shared list");

  useEffect(() => {
    const refs = decodeList(token);
    if (!refs.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled(
      refs.map((r) => tmdbApi.detail(r.mediaType, r.id, { params: {} }))
    ).then((results) => {
      if (cancelled) return;
      const mapped = results
        .map((res, i) => {
          if (res.status !== "fulfilled" || !res.value) return null;
          const d = res.value;
          return {
            id: d.id,
            mediaType: refs[i].mediaType,
            title: d.title || d.name,
            posterPath: d.poster_path,
            backdropPath: d.backdrop_path,
            voteAverage: d.vote_average,
            releaseDate: d.release_date || d.first_air_date,
          };
        })
        .filter(Boolean);
      setItems(mapped);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const addAll = () => {
    let added = 0;
    items.forEach((it) => {
      if (!watchlist.has(it.id, it.mediaType)) {
        watchlist.add(it);
        added += 1;
      }
    });
    if (added > 0) toast.success(`Added ${added} to My List`);
    else toast("Everything here is already in your list");
  };

  return (
    <div className="my-list-page shared-list-page">
      <div className="container">
        <header className="section__header my-list__header">
          <div className="my-list__title">
            <h2>Shared list</h2>
          </div>
          {items.length > 0 && (
            <div className="shared-list__actions">
              <span className="my-list__count">
                {items.length} {items.length === 1 ? "title" : "titles"}
              </span>
              <button type="button" className="shared-list__add" onClick={addAll}>
                <i className="bx bx-list-plus"></i>
                <span>Add all to My List</span>
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <div className="my-list__empty">
            <p className="my-list__empty-headline">This shared list is empty</p>
            <p className="my-list__empty-sub">
              The link may be broken or the titles are no longer available.
            </p>
            <Link to="/" className="my-list__empty-cta">Browse Movies &amp; Series</Link>
          </div>
        ) : (
          <div className="my-list__grid">
            {items.map((it) => (
              <SharedCard key={`${it.mediaType}:${it.id}`} item={it} />
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="shared-list__browse">
            <Link to="/" className="my-list__empty-cta">
              Browse other Movies &amp; Series →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedList;
