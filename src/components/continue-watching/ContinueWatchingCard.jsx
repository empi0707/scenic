import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiConfig from "../../api/apiConfig";
import { watchedEpisodes } from "../../utils/watchedEpisodes";
import { playbackProgress } from "../../utils/playbackProgress";
import { detailPath } from "../../utils/slug";

// Landscape (16:9) card used inside Continue Watching. For series we
// prefer the episode's own still image (so the user sees what they were
// actually watching) and fall back to the show's backdrop. A
// Netflix-style progress bar at the bottom reflects season progress.
const ContinueWatchingCard = ({ entry }) => {
  // Detail page consumes `play=1` (and for TV `s`/`e`) to launch the
  // player automatically on the right episode + saved server, so the
  // user can resume from Continue Watching in one click.
  const buildLink = () => {
    const base = detailPath(entry.mediaType, entry.id, entry.title);
    if (entry.mediaType === "tv") {
      const last = watchedEpisodes.getLastWatched(entry.id);
      if (last) {
        return `${base}?s=${last.season}&e=${last.episode}&play=1`;
      }
    }
    return `${base}?play=1`;
  };
  const link = buildLink();

  // Re-render when watched-episode state changes so the progress bar,
  // image, and resume label all stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (entry.mediaType !== "tv") return undefined;
    return watchedEpisodes.subscribe(() => setTick((t) => t + 1));
  }, [entry.mediaType, entry.id]);

  let progressPct = null;
  let resumeLabel = null;
  let episodeStillPath = null;
  if (entry.mediaType === "tv") {
    const watched = watchedEpisodes.getSeriesWatched(entry.id).size;
    if (watched > 0) {
      if (entry.totalEpisodes) {
        progressPct = Math.min(
          100,
          Math.round((watched / entry.totalEpisodes) * 100)
        );
      } else {
        // Total unknown (entry tracked before episode counts were stored).
        // Show a minimum-visible bar; revisiting Detail backfills the total.
        progressPct = 6;
      }
    }
    const last = watchedEpisodes.getLastWatched(entry.id);
    if (last) {
      resumeLabel = last.episodeName
        ? `S${last.season} E${last.episode} · ${last.episodeName}`
        : `S${last.season} E${last.episode}`;
      // Prefer the still stored on the lastWatched pointer, fall back to
      // the still stored on the episode entry itself (in case the episode
      // was marked via the toggle chip rather than a play click).
      if (last.stillPath) {
        episodeStillPath = last.stillPath;
      } else {
        const meta = watchedEpisodes.getEpisodeMeta(
          entry.id,
          last.season,
          last.episode
        );
        if (meta?.stillPath) episodeStillPath = meta.stillPath;
      }
    }
    // Blend in how far through the resume episode the user actually is.
    if (last) {
      const frac = playbackProgress.fraction({ type: "tv", id: entry.id, season: last.season, episode: last.episode });
      if (frac > 0.01) progressPct = Math.max(progressPct || 0, Math.round(frac * 100));
    }
  } else {
    // Movies: bar reflects the saved playback position.
    const frac = playbackProgress.fraction({ type: "movie", id: entry.id });
    if (frac > 0.01) progressPct = Math.min(100, Math.round(frac * 100));
  }

  // Prefer the last-watched episode's still for TV; otherwise fall back
  // to the show's backdrop / poster. w780 gives crisp results on
  // retina-density screens at the card's actual rendered size.
  const bg = apiConfig.w780Image(
    episodeStillPath || entry.backdropPath || entry.posterPath
  );

  const year = entry.releaseDate
    ? new Date(entry.releaseDate).getFullYear()
    : null;

  return (
    <Link to={link} className="cw-card-link">
      <div
        className={`cw-card${bg ? "" : " cw-card--no-image"}`}
        style={bg ? { backgroundImage: `url(${bg})` } : {}}
      >
        <span className={`cw-card__badge cw-card__badge--${entry.mediaType}`}>
          {entry.mediaType === "tv" ? "Series" : "Movie"}
        </span>

        <div className="cw-card__play" aria-hidden="true">
          <i className="bx bx-play"></i>
        </div>

        {/* Bottom gradient improves text legibility over busy backdrops */}
        <div className="cw-card__shade" aria-hidden="true" />

        {progressPct !== null && (
          <div
            className="cw-card__progress"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressPct}% watched`}
          >
            <div
              className="cw-card__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="cw-card__meta">
        <h3 className="cw-card__title">{entry.title}</h3>
        {resumeLabel ? (
          <p className="cw-card__resume">{resumeLabel}</p>
        ) : year ? (
          <p className="cw-card__year">{year}</p>
        ) : null}
      </div>
    </Link>
  );
};

export default ContinueWatchingCard;
