// Continue Watching — recently opened titles, most-recent first.
// Capped to keep the home row scannable and localStorage small.

const KEY = "scenic:continue-watching";
const EVENT = "scenic:continue-watching-changed";
const MAX_ITEMS = 14;

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
    /* ignore */
  }
};

const keyOf = (id, mediaType) => `${mediaType}:${id}`;

export const continueWatching = {
  getAll: () => read(),

  // Bump an item to the top, or insert it. Deduplicates by id+mediaType.
  track: (entry) => {
    const list = read();
    const k = keyOf(entry.id, entry.mediaType);
    const filtered = list.filter((it) => keyOf(it.id, it.mediaType) !== k);
    write([{ ...entry, openedAt: Date.now() }, ...filtered]);
  },

  remove: (id, mediaType) => {
    const k = keyOf(id, mediaType);
    write(read().filter((it) => keyOf(it.id, it.mediaType) !== k));
  },

  clear: () => write([]),

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
