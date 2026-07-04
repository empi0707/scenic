// Resume-playback memory. Stores the last position per movie / episode so the
// player can pick up where the user left off, and exposes a fraction for the
// progress bars on Continue Watching cards. Cleared once a title is finished.

const STORE = "scenic:playback-progress";
const MAX_ITEMS = 200;

const read = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
};

const write = (data) => {
  try {
    const keys = Object.keys(data);
    if (keys.length > MAX_ITEMS) {
      keys.sort((a, b) => (data[a].at || 0) - (data[b].at || 0));
      for (const k of keys.slice(0, keys.length - MAX_ITEMS)) delete data[k];
    }
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch {
    /* ignore */
  }
};

export const progressKey = (media) => {
  if (!media?.id) return null;
  return media.type === "tv"
    ? `tv:${media.id}:S${media.season}E${media.episode}`
    : `movie:${media.id}`;
};

export const playbackProgress = {
  get: (key) => (key ? read()[key] || null : null),

  save: (key, time, duration) => {
    if (!key || !Number.isFinite(time) || !Number.isFinite(duration) || duration < 1) return;
    const data = read();
    data[key] = { time, duration, at: Date.now() };
    write(data);
  },

  clear: (key) => {
    if (!key) return;
    const data = read();
    if (data[key]) {
      delete data[key];
      write(data);
    }
  },

  // 0..1 watched fraction for a media descriptor (0 when unknown/finished).
  fraction: (media) => {
    const p = playbackProgress.get(progressKey(media));
    return p && p.duration ? Math.min(1, p.time / p.duration) : 0;
  },
};
