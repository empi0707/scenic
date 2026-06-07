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
  // Hover-capable pointer (desktop mouse) vs touch/TV. Drives whether the
  // trailer is hover-triggered (desktop) or autoplays (touch/TV).
  const canHover =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : true;

  const [bannerTrailer, setBannerTrailer] = useState(false);
  const [bannerStopped, setBannerStopped] = useState(false);
  // Desktop unmutes on the hover gesture; touch/TV stay muted (autoplay-safe)
  // until the user taps the speaker.
  const [bannerMuted, setBannerMuted] = useState(!canHover);
  const bannerIframeRef = useRef(null);
  const bannerRef = useRef(null);
  const bannerStateRef = useRef(-1); // YouTube playerState: 1 = playing, 2 = paused
  const hoverSuppressedRef = useRef(false); // block hover-restart after Stop until cursor leaves

  // Reflect the current title in the browser tab; restore on leave.
  useDocumentTitle(
    item && (item.title || item.name || item.original_title || item.original_name)
  );

  // Reset trailer state on navigation. On desktop the trailer starts on hover
  // (handled on the banner). On touch/TV - where there's no hover - autoplay it
  // a couple seconds after the page settles (skipped when jumping to the player).
  useEffect(() => {
    setBannerTrailer(false);
    setBannerStopped(false);
    if (canHover || !item || wantsAutoPlay) return undefined;
    const hasTrailer = (item.videos?.results || []).some(
      (v) => v.site === "YouTube"
    );
    if (!hasTrailer) return undefined;
    const timer = setTimeout(() => setBannerTrailer(true), 2500);
    return () => clearTimeout(timer);
  }, [item, canHover, wantsAutoPlay]);

  // Loop the banner trailer just before YouTube's end-screen could appear.
  // Loop the clip ourselves (no &loop/&playlist, which add the < > controls):
  // restart just before it ends, and as a fallback when it reports ENDED.
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
      const win = bannerIframeRef.current && bannerIframeRef.current.contentWindow;
      if (!win) return;
      const restart = () => {
        win.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
          "*"
        );
        win.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: "" }),
          "*"
        );
      };
      if (info.playerState === 0) {
        restart();
      } else if (
        info.duration &&
        info.currentTime != null &&
        info.currentTime >= info.duration - 2
      ) {
        restart();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [bannerTrailer, modalActive]);

  // Control sound via the iframe API so the clip is never reloaded/interrupted.
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

  // Pause the trailer once the banner scrolls out of view (resume happens on
  // hover, handled on the banner element).
  useEffect(() => {
    if (!bannerTrailer) return undefined;
    const el = bannerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (canHover) {
          // Desktop: out of view → stop + revert; waits for a fresh hover.
          if (!entry.isIntersecting) setBannerStopped(true);
        } else if (entry.isIntersecting) {
          // Touch/TV (no hover): just pause off-screen and resume on-screen.
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

  const bannerVideos = item.videos?.results || [];
  const bannerTrailerKey =
    (
      bannerVideos.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
      bannerVideos.find((v) => v.type === "Teaser" && v.site === "YouTube") ||
      bannerVideos.find((v) => v.site === "YouTube") ||
      {}
    ).key || null;
  const showBannerTrailer =
    bannerTrailer && bannerTrailerKey && !modalActive && !bannerStopped;

  return (
    <div className="detail-page">
      <div
        className={`banner${showBannerTrailer ? " banner--playing" : ""}`}
        ref={bannerRef}
        style={{ backgroundImage: `url(${backgroundImage})` }}
        onMouseMove={() => {
          // Hover-to-play is desktop-only; touch/TV autoplay instead.
          // mousemove (not mouseenter) so it also fires when the cursor is
          // already over the banner after scrolling back. Guarded so it's a
          // no-op once the trailer is already showing, and suppressed right
          // after Stop until the cursor leaves (so Stop actually sticks).
          if (!canHover || !bannerTrailerKey || modalActive || showBannerTrailer)
            return;
          if (hoverSuppressedRef.current) return;
          setBannerStopped(false);
          setBannerTrailer(true);
          if (!bannerMuted) postToBannerTrailer("unMute");
        }}
        onMouseLeave={() => {
          hoverSuppressedRef.current = false;
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
                onClick={() => {
                  setBannerStopped(true);
                  hoverSuppressedRef.current = true;
                }}
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
