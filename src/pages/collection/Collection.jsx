import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { detailPath } from "../../utils/slug";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import Loading from "../../components/loading/Loading";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import "./collection.scss";

const yearOf = (date) => (date ? date.slice(0, 4) : "");

const Collection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  useDocumentTitle(collection && collection.name);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.scrollTo(0, 0);
    tmdbApi
      .collection(id)
      .then((res) => {
        if (!cancelled) setCollection(res);
      })
      .catch((e) => console.error("Collection fetch failed:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Loading size="large" />;
  if (!collection) return null;

  const parts = [...(collection.parts || [])]
    .filter((p) => p.poster_path || p.backdrop_path)
    .sort((a, b) =>
      (a.release_date || "9999").localeCompare(b.release_date || "9999")
    );

  const years = parts.map((p) => yearOf(p.release_date)).filter(Boolean);
  const yearRange =
    years.length === 0
      ? ""
      : years[0] === years[years.length - 1]
      ? years[0]
      : `${years[0]} - ${years[years.length - 1]}`;

  const backdropPath =
    collection.backdrop_path ||
    (parts.find((p) => p.backdrop_path) || {}).backdrop_path;
  const backdrop = backdropPath ? apiConfig.originalImage(backdropPath) : null;

  return (
    <div className="collection-page">
      <div
        className="collection-hero"
        style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}
      >
        <div className="collection-back-bar">
          <button
            type="button"
            className="collection-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <i className="bx bx-chevron-left" />
            <span>Back</span>
          </button>
        </div>
        <div className="collection-hero__content">
          <span className="collection-hero__eyebrow">Collection</span>
          <h1 className="collection-hero__title">{collection.name}</h1>
          <div className="collection-hero__meta">
            <span>
              {parts.length} {parts.length === 1 ? "film" : "films"}
            </span>
            {yearRange && (
              <>
                <span className="collection-hero__dot" />
                <span>{yearRange}</span>
              </>
            )}
          </div>
          {collection.overview && (
            <p className="collection-hero__overview">{collection.overview}</p>
          )}
        </div>
      </div>

      <div className="collection-body">
        <h2 className="collection-section-head">Watch Order</h2>

        <ol className="collection-list">
          {parts.map((item, i) => {
            const poster = item.poster_path || item.backdrop_path;
            return (
              <li
                className="collection-list__item"
                style={{ "--row": i }}
                key={item.id}
              >
                <Link to={detailPath("movie", item.id, item.title)} className="collection-row">
                  <span className="collection-row__index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="collection-row__poster">
                    {poster ? (
                      <img
                        src={apiConfig.w500Image(poster)}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <span className="collection-row__poster-empty">
                        {item.title}
                      </span>
                    )}
                  </span>
                  <span className="collection-row__info">
                    <span className="collection-row__title">{item.title}</span>
                    <span className="collection-row__meta">
                      {yearOf(item.release_date) && (
                        <span>{yearOf(item.release_date)}</span>
                      )}
                      {item.vote_average > 0 && (
                        <>
                          <span className="collection-row__sep" />
                          <span className="collection-row__rating">
                            <i className="bx bxs-star" />
                            {item.vote_average.toFixed(1)}
                          </span>
                        </>
                      )}
                    </span>
                    {item.overview && (
                      <span className="collection-row__overview">
                        {item.overview}
                      </span>
                    )}
                  </span>
                  <span className="collection-row__go">
                    <i className="bx bx-right-arrow-alt" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default Collection;
