import React, { useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import apiConfig from "../../api/apiConfig";
import "./search-suggestions.scss";

const linkFor = (item) => {
  if (item.media_type === "person") return `/person/${item.id}`;
  const type = item.media_type === "tv" ? "tv" : "movie";
  return `/${type}/${item.id}`;
};

const labelFor = (item) => item.title || item.name || "";

const typeLabel = (item) =>
  item.media_type === "tv"
    ? "Series"
    : item.media_type === "person"
    ? "Person"
    : "Movie";

const yearOf = (item) => {
  const d = item.release_date || item.first_air_date;
  if (!d) return "";
  const y = new Date(d).getFullYear();
  return Number.isNaN(y) ? "" : `${y}`;
};

const imgFor = (item) => {
  const path = item.poster_path || item.profile_path;
  return path ? apiConfig.w500Image(path) : null;
};

// Splits the title around the typed query and wraps matching runs in <mark>.
const highlightMatch = (text, query) => {
  const q = (query || "").trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="search-suggestions__hl">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const SearchSuggestions = ({
  items = [],
  loading = false,
  query = "",
  onSelect,
  onSeeAll,
  anchorRef,
}) => {
  const [pos, setPos] = useState(null);
  const visibleCount = loading && items.length === 0 ? 1 : items.length;

  // Position the portaled dropdown under the search box and keep it pinned
  // there on scroll/resize. Rendering into document.body escapes every page
  // stacking context, so the card grid can never paint over it.
  useLayoutEffect(() => {
    const anchor = anchorRef && anchorRef.current;
    if (!anchor) return undefined;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, visibleCount]);

  const hasQuery = query.trim().length >= 2;
  if (!hasQuery) return null;
  if (!loading && items.length === 0) return null;
  if (!pos) return null;

  const dropdown = (
    <div
      className="search-suggestions"
      role="listbox"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
      }}
    >
      {loading && items.length === 0 ? (
        <div className="search-suggestions__status">
          <i className="bx bx-loader-alt bx-spin" />
          <span>Searching…</span>
        </div>
      ) : (
        <ul className="search-suggestions__list">
          {items.map((item, index) => {
            const img = imgFor(item);
            const year = yearOf(item);
            return (
              <li
                key={`${item.media_type}-${item.id}`}
                style={{ "--row": index }}
                className="search-suggestions__row"
              >
                <Link
                  to={linkFor(item)}
                  className="search-suggestions__item"
                  role="option"
                  onClick={onSelect}
                >
                  <span className="search-suggestions__thumb">
                    {img ? (
                      <img src={img} alt="" loading="lazy" />
                    ) : (
                      <i className="bx bx-film" />
                    )}
                  </span>
                  <span className="search-suggestions__meta">
                    <span className="search-suggestions__title">
                      {highlightMatch(labelFor(item), query)}
                    </span>
                    <span className="search-suggestions__sub">
                      <span
                        className={`search-suggestions__type search-suggestions__type--${item.media_type}`}
                      >
                        {typeLabel(item)}
                      </span>
                      {year && (
                        <>
                          <span className="search-suggestions__dot" />
                          <span>{year}</span>
                        </>
                      )}
                    </span>
                  </span>
                  {item.media_type !== "person" && item.vote_average > 0 && (
                    <span className="search-suggestions__rating">
                      <i className="bx bxs-star" />
                      {item.vote_average.toFixed(1)}
                    </span>
                  )}
                  <i className="bx bx-chevron-right search-suggestions__chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {onSeeAll && items.length > 0 && (
        <button
          type="button"
          className="search-suggestions__seeall"
          onClick={onSeeAll}
        >
          <i className="bx bx-search" />
          <span>
            See all results for <strong>“{query.trim()}”</strong>
          </span>
        </button>
      )}
    </div>
  );

  return createPortal(dropdown, document.body);
};

export default SearchSuggestions;
