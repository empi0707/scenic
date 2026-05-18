// Watchlist — persisted to localStorage, synced across components via a
// custom event so any rendered BookmarkButton or grid updates instantly.

const KEY = "scenic:watchlist";
const EVENT = "scenic:watchlist-changed";
const MAX_ITEMS = 500;

const read = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota or disabled — ignore */
  }
};

const keyOf = (id, mediaType) => `${mediaType}:${id}`;

export const watchlist = {
  getAll: () => read(),

  has: (id, mediaType) => {
    const k = keyOf(id, mediaType);
    return read().some((it) => keyOf(it.id, it.mediaType) === k);
  },

  add: (entry) => {
    const list = read();
    const k = keyOf(entry.id, entry.mediaType);
    if (list.some((it) => keyOf(it.id, it.mediaType) === k)) return;
    write([{ ...entry, addedAt: Date.now() }, ...list]);
  },

  remove: (id, mediaType) => {
    const k = keyOf(id, mediaType);
    write(read().filter((it) => keyOf(it.id, it.mediaType) !== k));
  },

  toggle: (entry) => {
    if (watchlist.has(entry.id, entry.mediaType)) {
      watchlist.remove(entry.id, entry.mediaType);
      return false;
    }
    watchlist.add(entry);
    return true;
  },

  subscribe: (handler) => {
    window.addEventListener(EVENT, handler);
    // Also fire when another tab mutates storage
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
