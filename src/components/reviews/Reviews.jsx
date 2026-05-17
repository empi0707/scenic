import React, { useEffect, useState } from "react";
import tmdbApi from "../../api/tmdbApi";
import Loading from "../loading/Loading";
import { OutlineButton } from "../button/Button";
import "./reviews.scss";

// TMDB avatar_path quirks: can be a TMDB path "/abc.jpg", a Gravatar URL
// prefixed with a leading slash "/https://...", or null.
const resolveAvatar = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("/https")) return avatarPath.slice(1);
  return `https://image.tmdb.org/t/p/w200${avatarPath}`;
};

const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

// Extract the first complete sentence as the pull-quote preview. Falls
// back to a 110-character slice if no sentence break is found.
const previewQuote = (content) => {
  if (!content) return "";
  const cleaned = content.replace(/\s+/g, " ").trim();
  const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
  if (firstSentence && firstSentence[0].length <= 140) {
    return `"${firstSentence[0].trim()}"`;
  }
  return `"${cleaned.slice(0, 110).trim()}…"`;
};

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ExternalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const ReviewByline = ({ review, isOpen, onToggle }) => {
  const { author, author_details, content, created_at, url } = review;
  const rating = author_details?.rating;
  const avatar = resolveAvatar(author_details?.avatar_path);

  return (
    <article className="review-byline" data-open={isOpen}>
      <button
        className="review-byline__head"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="review-byline__meta">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="review-byline__avatar"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="review-byline__avatar review-byline__avatar--placeholder">
              {getInitial(author)}
            </span>
          )}
          <span className="review-byline__author">{author}</span>
          {rating ? (
            <span className="review-byline__rating">
              <StarIcon />
              {rating}
            </span>
          ) : null}
          {created_at && (
            <span className="review-byline__date">{formatDate(created_at)}</span>
          )}
        </span>
        <span className="review-byline__quote">{previewQuote(content)}</span>
        <span className="review-byline__icon">
          <PlusIcon />
        </span>
      </button>

      <div className="review-byline__body">
        <div className="review-byline__content">
          <p>{content}</p>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="review-byline__source"
            >
              Read on TMDB
              <ExternalIcon />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

const Reviews = ({ mediaType, id, title, imdbId }) => {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await tmdbApi.reviews(mediaType, id, 1);
        if (cancelled) return;
        setReviews(res.results || []);
        setPage(1);
        setTotalPages(res.total_pages || 0);
        setOpenId(null);
      } catch (e) {
        console.error("Reviews fetch failed:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mediaType, id]);

  const loadMore = async () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await tmdbApi.reviews(mediaType, id, nextPage);
      setReviews((prev) => [...prev, ...(res.results || [])]);
      setPage(nextPage);
    } catch (e) {
      console.error("Reviews load more failed:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggle = (rid) => {
    setOpenId((prev) => (prev === rid ? null : rid));
  };

  if (isLoading) return <Loading size="small" />;
  if (reviews.length === 0) {
    return (
      <p className="reviews-empty">No reviews yet. Be the first to weigh in.</p>
    );
  }

  const imdbUrl = imdbId
    ? `https://www.imdb.com/title/${imdbId}/reviews`
    : null;
  const googleUrl = title
    ? `https://www.google.com/search?q=${encodeURIComponent(
        `${title} reviews`
      )}`
    : null;

  return (
    <section className="reviews-list">
      {(imdbUrl || googleUrl) && (
        <header className="reviews-list__count">
          {imdbUrl && (
            <a
              href={imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="reviews-list__external reviews-list__external--imdb"
            >
              Read more on IMDB
              <ExternalIcon />
            </a>
          )}
          {imdbUrl && googleUrl && (
            <span className="reviews-list__sep">·</span>
          )}
          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="reviews-list__external reviews-list__external--google"
            >
              Read more on Google
              <ExternalIcon />
            </a>
          )}
        </header>
      )}

      {reviews.map((r) => (
        <ReviewByline
          key={r.id}
          review={r}
          isOpen={openId === r.id}
          onToggle={() => toggle(r.id)}
        />
      ))}

      {page < totalPages && (
        <div className="reviews-list__load-more">
          <OutlineButton
            className="small"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load more reviews"}
          </OutlineButton>
        </div>
      )}
    </section>
  );
};

export default Reviews;
