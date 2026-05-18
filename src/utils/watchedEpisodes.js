// Watched-episode tracker for TV series. Stores both which episodes the
// user has marked complete and a pointer to the most-recently-opened one
// per series so Continue Watching can surface "S2 E5 - The Reckoning".
//
// Shape:
//   {
//     [seriesId]: {
//       episodes: { "S1E1": { watchedAt }, "S2E5": { watchedAt } },
//       lastWatched: { season, episode, episodeName, at }
//     }
//   }

const KEY = "scenic:watched-episodes";
const EVENT = "scenic:watched-episodes-changed";

const read = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const write = (data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
};

const epKey = (season, episode) => `S${season}E${episode}`;

export const watchedEpisodes = {
  isWatched: (seriesId, season, episode) => {
    const all = read();
    return Boolean(all[seriesId]?.episodes?.[epKey(season, episode)]);
  },

  // Toggle returns the new state (true = now watched, false = now unmarked)
  toggle: (seriesId, season, episode, meta = {}) => {
    const all = read();
    const series = all[seriesId] || { episodes: {}, lastWatched: null };
    const k = epKey(season, episode);
    if (series.episodes[k]) {
      delete series.episodes[k];
    } else {
      series.episodes[k] = { watchedAt: Date.now(), ...meta };
    }
    all[seriesId] = series;
    write(all);
    return Boolean(all[seriesId].episodes[k]);
  },

  markWatched: (seriesId, season, episode, meta = {}) => {
    const all = read();
    const series = all[seriesId] || { episodes: {}, lastWatched: null };
    series.episodes[epKey(season, episode)] = {
      watchedAt: Date.now(),
      ...meta,
    };
    all[seriesId] = series;
    write(all);
  },

  // Update the last-watched pointer without necessarily marking the
  // episode complete. Use for "user clicked play but may not have
  // finished" semantics. stillPath lets Continue Watching show the
  // episode's own still instead of the series backdrop.
  trackOpen: (seriesId, season, episode, episodeName = "", stillPath = null) => {
    const all = read();
    const series = all[seriesId] || { episodes: {}, lastWatched: null };
    series.lastWatched = {
      season,
      episode,
      episodeName,
      stillPath,
      at: Date.now(),
    };
    all[seriesId] = series;
    write(all);
  },

  getLastWatched: (seriesId) => {
    const all = read();
    return all[seriesId]?.lastWatched || null;
  },

  // Number of episodes marked watched in a given season
  getSeasonProgress: (seriesId, season) => {
    const eps = read()[seriesId]?.episodes || {};
    const prefix = `S${season}E`;
    return Object.keys(eps).filter((k) => k.startsWith(prefix)).length;
  },

  // Set of all watched episode keys for a series, e.g. {"S1E1", "S1E2"}
  getSeriesWatched: (seriesId) => {
    const eps = read()[seriesId]?.episodes || {};
    return new Set(Object.keys(eps));
  },

  // Per-episode meta (episodeName, stillPath, watchedAt) for fallback when
  // lastWatched doesn't carry the still — happens when an episode was
  // marked via the toggle chip rather than the play click.
  getEpisodeMeta: (seriesId, season, episode) => {
    const eps = read()[seriesId]?.episodes || {};
    return eps[`S${season}E${episode}`] || null;
  },

  clearSeries: (seriesId) => {
    const all = read();
    if (all[seriesId]) {
      delete all[seriesId];
      write(all);
    }
  },

  subscribe: (handler) => {
    window.addEventListener(EVENT, handler);
    const storageHandler = (e) => {
      if (e.key === KEY) handler();
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  },
};
