import React from "react";
// Styles are imported globally in App.js to keep the CSS chunk order stable.

// Base shimmer block.
export const Skeleton = ({ className = "", style }) => (
  <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />
);

// Poster card placeholder - matches MovieCard (poster + title + year).
export const MovieCardSkeleton = () => (
  <div className="skeleton-card" aria-hidden="true">
    <span className="skeleton skeleton-card__poster" />
    <span className="skeleton skeleton-card__line skeleton-card__line--title" />
    <span className="skeleton skeleton-card__line skeleton-card__line--sub" />
  </div>
);

// Responsive grid of card placeholders (catalog / anime / search).
export const CardGridSkeleton = ({ count = 12 }) => (
  <div className="skeleton-grid" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <MovieCardSkeleton key={i} />
    ))}
  </div>
);

// Horizontal strip of card placeholders (home rows).
export const CardRowSkeleton = ({ count = 8 }) => (
  <div className="skeleton-row" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div className="skeleton-row__item" key={i}>
        <MovieCardSkeleton />
      </div>
    ))}
  </div>
);

// Detail page banner placeholder (poster + title + meta + buttons).
export const DetailSkeleton = () => (
  <div className="skeleton-detail" aria-hidden="true">
    <span className="skeleton skeleton-detail__poster" />
    <div className="skeleton-detail__info">
      <span className="skeleton skeleton-detail__title" />
      <span className="skeleton skeleton-detail__meta" />
      <div className="skeleton-detail__chips">
        <span className="skeleton skeleton-detail__chip" />
        <span className="skeleton skeleton-detail__chip" />
        <span className="skeleton skeleton-detail__chip" />
      </div>
      <span className="skeleton skeleton-detail__line" />
      <span className="skeleton skeleton-detail__line" />
      <span className="skeleton skeleton-detail__line skeleton-detail__line--short" />
      <div className="skeleton-detail__buttons">
        <span className="skeleton skeleton-detail__btn" />
        <span className="skeleton skeleton-detail__btn" />
      </div>
    </div>
  </div>
);

export default Skeleton;
