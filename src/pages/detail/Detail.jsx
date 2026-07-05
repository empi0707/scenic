import React, { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import { detailPath, idFromParam } from "../../utils/slug";
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
import lazyWithRetry from "../../utils/lazyWithRetry";

const SeriesVideoPlayer = lazyWithRetry(() => import("./SeriesVideoPlayer/SeriesVideoPlayer"));

const Detail = () => {
  const { category, id: idParam } = useParams();
  const id = idFromParam(idParam); // accept /tv/kohrra-230034 or bare /tv/230034
  const location = useLocation();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoPlayerRef = useRef(null);

  // Continue Watching deep links: ?play=1 (and ?s=&e= for series).
  const search = new URLSearchParams(location.search);
  const wantsAutoPlay = search.get("play") === "1";
  const initialSeason = parseInt(search.get("s") || "", 10);
  const initialEpisode = parseInt(search.get("e") || "", 10);
  const autoPlayConsumedRef = useRef(false);

  const [modalActive, setModalActive] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [shouldOpenPlayer, setShouldOpenPlayer] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  // Desktop (hover) plays the trailer on hover; touch/TV autoplays.
  const canHover =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : true;

  const [bannerTrailer, setBannerTrailer] = useState(false);
  // Transient pause/revert while scrolled out of view (can return).
  const [bannerStopped, setBannerStopped] = useState(false);
  // Permanent dismiss (✕ or playback start); resets on navigation.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerMuted, setBannerMuted] = useState(false);
  const bannerIframeRef = useRef(null);
  const bannerRef = useRef(null);
  const bannerStateRef = useRef(-1); // YouTube playerState: 1 = playing, 2 = paused

  useDocumentTitle(
    item && (item.title || item.name || item.original_title || item.original_name)
  );

  // Reset on navigation; touch/TV autoplays after a delay (no hover there).
  useEffect(() => {
    setBannerTrailer(false);
    setBannerStopped(false);
    setBannerDismissed(false);
    if (canHover || !item || wantsAutoPlay) return undefined;
    const hasTrailer = (item.videos?.results || []).some(
      (v) => v.site === "YouTube"
    );
    if (!hasTrailer) return undefined;
    // Trailer autoplay disabled.
    // const timer = setTimeout(() => setBannerTrailer(true), 2500);
    // return () => clearTimeout(timer);
    return undefined;
  }, [item, canHover, wantsAutoPlay]);

  // Play once, no loop: revert to the static poster when the trailer ends.
  useEffect(() => {
    if (!bannerTrailer || modalActive) return undefined;
    const onMsg = (e) => {
      if (typeof e.data !== "string" || e.origin.indexOf("youtube") === -1) return;
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      const info = data && data.info;
      if (!info) return;
      if (typeof info.playerState === "number") {
        bannerStateRef.current = info.playerState;
      }
      const ended =
        info.playerState === 0 ||
        (info.duration &&
          info.currentTime != null &&
          info.currentTime >= info.duration - 1);
      if (ended) setBannerDismissed(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [bannerTrailer, modalActive]);

  // Mute via the iframe API so the clip isn't reloaded.
  const postToBannerTrailer = (func) => {
    const win = bannerIframeRef.current && bannerIframeRef.current.contentWindow;
    if (win) {
      win.postMessage(JSON.stringify({ event: "command", func, args: "" }), "*");
    }
  };

  const toggleBannerMute = () => {
    const next = !bannerMuted;
    postToBannerTrailer(next ? "mute" : "unMute");
    setBannerMuted(next);
  };

  // Pause off-screen; desktop reverts and waits for hover, touch/TV resumes.
  useEffect(() => {
    if (!bannerTrailer) return undefined;
    const el = bannerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (canHover) {
          if (!entry.isIntersecting) setBannerStopped(true);
        } else if (entry.isIntersecting) {
          if (bannerStateRef.current !== 1) postToBannerTrailer("playVideo");
        } else {
          postToBannerTrailer("pauseVideo");
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerTrailer]);

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
        // URL inside `text` (not the url field) so WhatsApp puts it on its own line.
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
      toast("No trailer available for this title", { icon: "🎬" });
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

  // Redirect legacy/bare-id URLs to the pretty slug (bookmarks keep working,
  // never 404). Query + hash are preserved so play/season/episode flows survive.
  useEffect(() => {
    if (!item) return;
    const canonical = detailPath(category, id, item.title || item.name || "");
    if (canonical !== decodeURIComponent(location.pathname)) {
      navigate(canonical + location.search + location.hash, { replace: true });
    }
    // eslint-disable-next-line
  }, [item, category, id]);

  // Autoplay handoff from Continue Watching; strip params so a refresh doesn't replay.
  useEffect(() => {
    if (!item || !wantsAutoPlay || autoPlayConsumedRef.current) return;
    const isTv = category === "tv";
    if (!isTv) {
      setShouldOpenPlayer(true);
      autoPlayConsumedRef.current = true;
      navigate(location.pathname, { replace: true });
    }
    // TV keeps the params; SeriesVideoPlayer consumes them on mount.
  }, [item, wantsAutoPlay, category, location.pathname, navigate]);

  const handlePlayButtonClick = () => {
    setShouldOpenPlayer(true);
  };

  const handleWatchNow = () => {
    setShouldOpenPlayer(true);
  };

  const trackContinueWatching = () => {
    if (!item) return;
    const isTv = category === "tv";
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
  };

  // On play: dismiss the trailer and add to Continue Watching (only now).
  useEffect(() => {
    if (shouldOpenPlayer) {
      setBannerDismissed(true);
      trackContinueWatching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenPlayer]);

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

  const bannerVideos = item.videos?.results || [];
  const bannerTrailerKey =
    (
      bannerVideos.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
      bannerVideos.find((v) => v.type === "Teaser" && v.site === "YouTube") ||
      bannerVideos.find((v) => v.site === "YouTube") ||
      {}
    ).key || null;
  const showBannerTrailer =
    bannerTrailer &&
    bannerTrailerKey &&
    !modalActive &&
    !bannerStopped &&
    !bannerDismissed;

  return (
    <div className="detail-page">
      <div
        className={`banner${showBannerTrailer ? " banner--playing" : ""}`}
        ref={bannerRef}
        style={{ backgroundImage: `url(${backgroundImage})` }}
        onMouseMove={() => {
          // Desktop hover-to-play; mousemove also fires when already over the banner after a scroll.
          if (
            !canHover ||
            !bannerTrailerKey ||
            modalActive ||
            bannerDismissed ||
            showBannerTrailer
          )
            return;
          // Trailer autoplay disabled.
          // setBannerStopped(false);
          // setBannerTrailer(true);
          // if (!bannerMuted) postToBannerTrailer("unMute");
        }}
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

        {showBannerTrailer && (
          <>
            <div className="banner__trailer">
              <iframe
                ref={bannerIframeRef}
                src={`https://www.youtube.com/embed/${bannerTrailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3&fs=0&disablekb=1&vq=hd1080&hd=1`}
                title="Trailer"
                allow="autoplay; encrypted-media"
                onLoad={() => {
                  const win =
                    bannerIframeRef.current && bannerIframeRef.current.contentWindow;
                  if (!win) return;
                  win.postMessage(JSON.stringify({ event: "listening" }), "*");
                  win.postMessage(
                    JSON.stringify({
                      event: "command",
                      func: "setPlaybackQuality",
                      args: ["hd1080"],
                    }),
                    "*"
                  );
                  if (!bannerMuted) {
                    win.postMessage(
                      JSON.stringify({ event: "command", func: "unMute", args: "" }),
                      "*"
                    );
                  }
                }}
              />
              <span className="banner__trailer-shield" aria-hidden="true" />
            </div>
            <div className="banner__controls">
              <button
                type="button"
                className="banner__ctrl"
                onClick={toggleBannerMute}
                aria-label={bannerMuted ? "Unmute trailer" : "Mute trailer"}
              >
                <i className={`bx ${bannerMuted ? "bx-volume-mute" : "bx-volume-full"}`} />
              </button>
              <button
                type="button"
                className="banner__ctrl"
                onClick={() => setBannerDismissed(true)}
                aria-label="Stop trailer"
              >
                <i className="bx bx-x" />
              </button>
            </div>
          </>
        )}

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
                  <span>{item.runtime ? `${item.runtime} min` : `~${item.episode_run_time[0]} min/ep`}</span>
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
              overview={item.overview}
              year={(item.release_date || item.first_air_date || "").slice(0, 4)}
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
