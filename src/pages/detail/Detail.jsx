import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
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

const SeriesVideoPlayer = lazy(() => import("./SeriesVideoPlayer/SeriesVideoPlayer"));

const Detail = () => {
  const { category, id } = useParams();
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoPlayerRef = useRef(null);

  const [modalActive, setModalActive] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [shouldOpenPlayer, setShouldOpenPlayer] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShare = async () => {
    if (!item) return;
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    const displayTitle = year ? `${title} (${year})` : title;
    const subject = category === "tv" ? "this series" : "this movie";
    const url = window.location.href;
    const shareText = `${displayTitle}\n\nStream ${subject} free on Scenic. Watch blockbusters and hidden gems instantly, no signup needed.\n\n${url}`;

    const flashSuccess = () => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 1400);
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayTitle} - Scenic`,
          url,
        });
        flashSuccess();
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
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
        params: { append_to_response: "credits,recommendations,videos" },
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

  const handlePlayButtonClick = () => {
    setShouldOpenPlayer(true);
  };

  const handleWatchNow = () => {
    setShouldOpenPlayer(true);
  };

  if (isLoading) {
    return <Loading size="large" />;
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
    <>
      <div
        className="banner"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
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
            </div>
            <div className="genres stagger-3">
              {item.genres?.slice(0, 5).map((genre, i) => (
                <span key={i} className="genres__item">
                  {genre.name}
                </span>
              ))}
            </div>
            <p className="overview stagger-4">{item.overview}</p>
            <div className="buttons stagger-5">
              {!item.seasons && (
                <Button onClick={handleWatchNow} className='watch-now-btn' icon={<PlayIcon />}>
                  Watch Now
                </Button>
              )}
              <OutlineButton onClick={handleWatchTrailer} className='trailer-btn'>Watch Trailer</OutlineButton>
              <div className="rating-tag">
                <i className="bx bxs-star"></i>
                <span>{item.vote_average?.toFixed(1)}/10</span>
              </div>
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
            <h2>More Like This</h2>
          </div>
          <MovieList category={category} type="recommendations" id={item.id} data={item.recommendations?.results} />
        </div>
      </div>
    </>
  );
};

export default Detail;
