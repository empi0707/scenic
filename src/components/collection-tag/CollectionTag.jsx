import React from "react";
import { Link } from "react-router-dom";
import "./collection-tag.scss";

const StackIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Shown on a movie detail page when the film is part of a TMDB collection.
// The whole pill links to the collection view; "View all" is the affordance.
const CollectionTag = ({ collection }) => {
  if (!collection || !collection.id) return null;

  return (
    <Link
      to={`/collection/${collection.id}`}
      className="collection-tag"
      aria-label={`View all films in ${collection.name}`}
    >
      <span className="collection-tag__icon">
        <StackIcon />
      </span>
      <span className="collection-tag__text">
        <span className="collection-tag__prefix">Part of the</span>
        <strong className="collection-tag__name">{collection.name}</strong>
      </span>
      <span className="collection-tag__cta">
        View all
        <ArrowIcon />
      </span>
    </Link>
  );
};

export default CollectionTag;
