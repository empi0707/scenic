import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import "./detail.scss";
import CastList from "./CastList/CastList";
import MovieList from "../../components/movie-list/MovieList";
import VideoPlayer from "./MovieVideoPlayer/VideoPlayer";
import Button, { OutlineButton } from "../../components/button/Button";
import Modal, { ModalContent } from "../../components/modal/Modal";
import Loading from "../../components/loading/Loading";
import { PlayIcon } from "../../assets/icons/PlayIcon";
import { ShareIcon, CheckIcon } from "../../assets/icons/ShareIcon";
import Reviews from "../../components/reviews/Reviews";
import BookmarkButton from "../../components/bookmark-button/BookmarkButton";
import CollectionTag from "../../components/collection-tag/CollectionTag";
import { DetailSkeleton } from "../../components/skeleton/Skeleton";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { continueWatching } from "../../utils/continueWatching";

const SeriesVideoPlayer = lazy(() => import("./SeriesVideoPlayer/SeriesVideoPlayer"));

const Detail = () => {
  const { category, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoPlayerRef = useRef(null);

  // Parse autoplay intent from the URL — Continue Watching links pass
  // `?play=1`, and for series `?s=2&e=5&play=1` to jump straight to
  // the right episode.
  const search = new URLSearchParams(location.search);
  const wantsAutoPlay = search.get("play") === "1";
  const initialSeason = parseInt(search.get("s") || "", 10);
  const initialEpisode = parseInt(search.get("e") || "", 10);
  const autoPlayConsumedRef = useRef(false);

  const [modalActive, setModalActive] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [shouldOpenPlayer, setShouldOpenPlayer] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Reflect the current title in the browser tab; restore on leave.
  useDocumentTitle(
    item && (item.title || item.name || item.original_title || item.original_name)
  );

  const handleShare = async () => {
    if (!item) return;
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    const displayTitle = year ? `${title} (${year})` : title;
    const subject = category === "tv" ? "this series" : "this movie";
    const url = window.location.href;
    const promo = `Watch ${subject} free on Scenic. Stream blockbusters and hidden gems instantly, no signup needed.`;
    const credit = `© ${new Date().getFullYear()} Scenic. Developed with ❤️ by Vanshaj Pahwa`;
    const fullMessage = `${displayTitle}\n\n${promo}\n\n${credit}\n\n${url}`;

    const flashSuccess = () => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 1400);
    };

    if (navigator.share) {
      try {
        // URL is embedded in `text` (not passed separately) so WhatsApp puts
        // it on its own line instead of appending it after the body with a
        // space. WhatsApp still auto-detects the URL and renders the preview.
        await navigator.share({
          title: `${displayTitle} - Scenic`,
          text: fullMessage,
        });
        flashSuccess();
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(fullMessage);
      toast.success("Link copied to clipboard");
      flashSuccess();
    } catch (_) {
      toast.error("Could not copy link");
    }
  };

  const handleWatchTrailer = () => {
    const videos = item?.videos?.results || [];
    const youtubeTrailer = videos.find(
      (video) => video.type === "Trailer" && video.site === "YouTube"
    );
    if (youtubeTrailer) {
      setTrailerUrl(`https://www.youtube.com/embed/${youtubeTrailer.key}`);
      setModalActive(true);
    } else {
      alert("Trailer not available");
    }
  };

  const handleCloseModal = () => {
    setModalActive(false);
    setTrailerUrl("");
  };

  const getDetail = async () => {
    setIsLoading(true);
    try {
      // Check if ID is numeric, if not redirect to catalog
      if (id && isNaN(Number(id))) {
        window.location.href = `/${category}`;
        return;
      }
      
      const response = await tmdbApi.detail(category, id, {
        params: { append_to_response: "credits,recommendations,videos,external_ids" },
      });
      setItem(response);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error fetching movie/TV details:", error);
      // Redirect to catalog if detail fetch fails
      window.location.href = `/${category}`;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getDetail();
    // eslint-disable-next-line
  }, [category, id]);

  // Record this title in Continue Watching once we have the data. Fires
  // every time the page is opened so the row reflects recent activity.
  useEffect(() => {
    if (!item) return;
    const isTv = category === "tv";
    // For series, sum the episode_count across real seasons (skip 0/specials)
    // so the Continue Watching card can render a progress bar.
    const totalEpisodes = isTv
      ? (item.seasons || [])
          .filter((s) => s.season_number !== 0)
          .reduce((sum, s) => sum + (s.episode_count || 0), 0)
      : null;

    continueWatching.track({
      id: item.id,
      mediaType: isTv ? "tv" : "movie",
      title: item.title || item.name || "",
      posterPath: item.poster_path || null,
      backdropPath: item.backdrop_path || null,
      voteAverage: item.vote_average ?? null,
      releaseDate: item.release_date || item.first_air_date || null,
      totalEpisodes,
    });
  }, [item, category]);

  // Autoplay handoff from Continue Watching. Movies open the player
  // straight away once the item loads; series need the episode list to
  // render first, which SeriesVideoPlayer handles via its own autoPlay
  // prop. We strip the query params after firing so a refresh doesn't
  // re-trigger playback.
  useEffect(() => {
    if (!item || !wantsAutoPlay || autoPlayConsumedRef.current) return;
    const isTv = category === "tv";
    if (!isTv) {
      setShouldOpenPlayer(true);
      autoPlayConsumedRef.current = true;
      navigate(location.pathname, { replace: true });
    }
    // For TV we leave the URL params in place — SeriesVideoPlayer reads
    // them on mount and clears the consumed flag itself once it acts.
  }, [item, wantsAutoPlay, category, location.pathname, navigate]);

  const handlePlayButtonClick = () => {
    setShouldOpenPlayer(true);
  };

  const handleWatchNow = () => {
    setShouldOpenPlayer(true);
  };

  if (isLoading) {
    return (
      <div className="detail-page">
        <DetailSkeleton />
      </div>
    );
  }

  if (!item) return null;

  const backgroundImage = apiConfig.originalImage(
    item.backdrop_path || item.poster_path
  );
  const posterImage = apiConfig.originalImage(
    item.poster_path || item.backdrop_path
  );
  const title = item.title || item.name;

  return (
    <div className="detail-page">
      <div
        className="banner"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <button
          type="button"
          className="detail-back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <i className="bx bx-chevron-left" />
          <span>Back</span>
        </button>
        <div className="movie-content container">
          <div className="movie-content__poster">
            <div
              className="movie-content__poster__img"
              style={{ backgroundImage: `url(${posterImage})` }}
            >
              <Button onClick={handlePlayButtonClick}>
                <i className="bx bx-play"></i>
              </Button>
            </div>
          </div>
          <div className="movie-content__info">
            <h1 className="title stagger-1">{title}</h1>
            <div className="meta-row stagger-2">
              {item.release_date && <span>{new Date(item.release_date).getFullYear()}</span>}
              {item.first_air_date && <span>{new Date(item.first_air_date).getFullYear()}</span>}
              {(item.runtime || item.episode_run_time?.[0]) && (
                <>
                  <span className="meta-divider"></span>
                  <span>{item.runtime || item.episode_run_time?.[0]} min</span>
                </>
              )}
              {item.seasons && (
                <>
                  <span className="meta-divider"></span>
                  <span>{item.seasons.length} Season{item.seasons.length > 1 ? 's' : ''}</span>
                </>
              )}
              {item.original_language && (
                <>
                  <span className="meta-divider"></span>
                  <span>{item.original_language.toUpperCase()}</span>
                </>
              )}
              {item.vote_average ? (
                <>
                  <span className="meta-divider"></span>
                  <span
                    className="meta-rating"
                    aria-label={`Rated ${item.vote_average.toFixed(1)} out of 10`}
                  >
                    <i className="bx bxs-star" aria-hidden="true"></i>
                    {item.vote_average.toFixed(1)}
                  </span>
                </>
              ) : null}
            </div>
            <div className="genres stagger-3">
              {item.genres?.slice(0, 5).map((genre, i) => (
                <span key={i} className="genres__item">
                  {genre.name}
                </span>
              ))}
            </div>
            {item.belongs_to_collection && (
              <div className="collection-tag-row stagger-3">
                <CollectionTag collection={item.belongs_to_collection} />
              </div>
            )}
            <p className="overview stagger-4">{item.overview}</p>
            <div className="buttons stagger-5">
              {!item.seasons && (
                <Button onClick={handleWatchNow} className='watch-now-btn' icon={<PlayIcon />}>
                  Watch Now
                </Button>
              )}
              <OutlineButton onClick={handleWatchTrailer} className='trailer-btn'>Watch Trailer</OutlineButton>
              <BookmarkButton item={item} mediaType={category} variant="action" />
              <button
                type="button"
                onClick={handleShare}
                className={`share-btn${shareSuccess ? " is-success" : ""}`}
                aria-label={shareSuccess ? "Link copied" : "Share"}
                title={shareSuccess ? "Copied" : "Share"}
              >
                {shareSuccess ? <CheckIcon /> : <ShareIcon />}
              </button>
            </div>
            <div className="cast stagger-6">
              <div className="section__header">
                <h2>Top Cast</h2>
              </div>
              <CastList casts={item.credits?.cast} />
            </div>
          </div>
        </div>
      </div>
      <Modal active={modalActive} id="trailer-modal">
        <ModalContent onClose={handleCloseModal}>
          <iframe
            width="100%"
            height="400"
            src={trailerUrl}
            title="Trailer"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </ModalContent>
      </Modal>
      <div className="container">
        <div className="section mb-3" ref={videoPlayerRef}>
          {item.seasons ? (
            <Suspense fallback={<Loading size="small" />}>
              <SeriesVideoPlayer
                id={item.id}
                title={title}
                series={item}
                onEpisodeClick={handlePlayButtonClick}
                initialSeason={
                  wantsAutoPlay && Number.isFinite(initialSeason)
                    ? initialSeason
                    : undefined
                }
                initialEpisode={
                  wantsAutoPlay && Number.isFinite(initialEpisode)
                    ? initialEpisode
                    : undefined
                }
                autoPlay={wantsAutoPlay}
                onAutoPlayConsumed={() =>
                  navigate(location.pathname, { replace: true })
                }
              />
            </Suspense>
          ) : (
            <VideoPlayer
              id={item.id}
              title={title}
              shouldOpenPlayer={shouldOpenPlayer}
              onPlayerOpen={() => setShouldOpenPlayer(false)}
            />
          )}
        </div>
        <div className="section mb-3">
          <div className="section__header mb-2">
            <h2>Reviews</h2>
          </div>
          <Reviews
            mediaType={category}
            id={item.id}
            title={title}
            imdbId={item.imdb_id || item.external_ids?.imdb_id}
          />
        </div>
        <div className="section mb-3">
          <div className="section__header mb-2">
            <h2>More Like This</h2>
          </div>
          <MovieList category={category} type="recommendations" id={item.id} data={item.recommendations?.results} />
        </div>
      </div>
    </div>
  );
};

export default Detail;
