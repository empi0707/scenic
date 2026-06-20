import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { watchlist } from "../../utils/watchlist";
import { buildShareText } from "../../utils/shareList";
import BookmarkButton from "../../components/bookmark-button/BookmarkButton";
import InfoTooltip from "../../components/info-tooltip/InfoTooltip";
import { ShareIcon, CheckIcon } from "../../assets/icons/ShareIcon";
import apiConfig from "../../api/apiConfig";
import "./my-list.scss";

const formatYear = (date) => {
  if (!date) return null;
  try {
    return new Date(date).getFullYear();
  } catch {
    return null;
  }
};

const ListCard = ({ item }) => {
  const link = `/${item.mediaType}/${item.id}`;
  const bg = apiConfig.w500Image(item.posterPath || item.backdropPath);
  const year = formatYear(item.releaseDate);

  // Reconstruct an item shape BookmarkButton expects
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
    <Link to={link} className="my-list__card-link">
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

const MyList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => watchlist.getAll());
  const [shareSuccess, setShareSuccess] = useState(false);
  const hadItemsRef = useRef(items.length > 0);

  useEffect(() => {
    const sync = () => setItems(watchlist.getAll());
    sync();
    return watchlist.subscribe(sync);
  }, []);

  useEffect(() => {
    if (items.length === 0 && hadItemsRef.current) navigate("/");
    hadItemsRef.current = items.length > 0;
  }, [items, navigate]);

  const handleShare = async () => {
    if (!items.length) return;
    const text = buildShareText(items);
    const flash = () => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 1400);
    };
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Scenic watchlist", text });
        flash();
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("List link copied to clipboard");
      flash();
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="my-list-page">
      <div className="container">
        <header className="section__header my-list__header">
          <div className="my-list__title">
            <h2>My List</h2>
            <InfoTooltip label="About My List">
              Your list is saved on this browser only. Since Scenic doesn't ask
              you to sign up, anything you add here won't appear on other
              devices or browsers. Clearing site data will erase the list.
            </InfoTooltip>
          </div>
          {items.length > 0 && (
            <div className="my-list__actions">
              {(() => {
                const movies = items.filter((it) => it.mediaType === "movie").length;
                const series = items.filter((it) => it.mediaType === "tv").length;
                const parts = [];
                if (movies > 0) parts.push(`${movies} ${movies === 1 ? "Movie" : "Movies"}`);
                if (series > 0) parts.push(`${series} ${series === 1 ? "Series" : "Series"}`);
                return (
                  <span className="my-list__count">
                    {parts.map((p, i) => (
                      <React.Fragment key={p}>
                        {i > 0 && <span className="my-list__count-sep">·</span>}
                        {p}
                      </React.Fragment>
                    ))}
                  </span>
                );
              })()}
              <button
                type="button"
                className={`my-list__share${shareSuccess ? " is-success" : ""}`}
                onClick={handleShare}
                aria-label={shareSuccess ? "List link copied" : "Share my list"}
              >
                {shareSuccess ? <CheckIcon /> : <ShareIcon />}
                <span>{shareSuccess ? "Copied" : "Share list"}</span>
              </button>
            </div>
          )}
        </header>

        {items.length === 0 ? (
          <div className="my-list__empty">
            <p className="my-list__empty-headline">Nothing saved yet</p>
            <p className="my-list__empty-sub">
              Tap the bookmark on any poster to save it here.
            </p>
            <Link to="/" className="my-list__empty-cta">Browse Movies &amp; Series</Link>
          </div>
        ) : (
          <div className="my-list__grid">
            {items.map((it) => (
              <ListCard key={`${it.mediaType}:${it.id}`} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyList;
