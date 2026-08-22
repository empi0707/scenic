// Lets FreeMovies be white-labeled when embedded in an iframe: a parent page can
// pass ?brand=&logo=&color= on the query string once, and FreeMovies keeps using
// those values (via sessionStorage) as the visitor moves to other pages
// inside the embed, even though those later URLs don't carry the params.
// Ported from the same pattern in the movieace project (src/config/brand.ts).
//
// Outside an iframe this is a no-op — BRAND/LOGO_URL/PRIMARY_COLOR stay at
// their defaults and nothing is written to document.title or CSS custom
// properties, so a normal visit to FreeMovies looks exactly as before.

const DEFAULT_BRAND = "FreeMovies";
const DEFAULT_PRIMARY_COLOR = "#6366f1";
const BRAND_SESSION_KEY = "embed-brand";
const LOGO_SESSION_KEY = "embed-logo";
const COLOR_SESSION_KEY = "embed-color";

const sanitizeHex = (value) => {
  if (!value || !value.trim()) return null;

  const raw = value.trim();
  const candidate = raw.startsWith("#") ? raw : `#${raw}`;
  const shortMatch = candidate.match(/^#([\da-f]{3})$/i);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return /^#[\da-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : null;
};

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// Darker variant (factor < 1), used for the hover shade.
const darken = (rgb, factor) => {
  const channel = (v) => Math.round(v * factor).toString(16).padStart(2, "0");
  return `#${rgb.map(channel).join("")}`;
};

// Lighter variant (0 < amount < 1, mixes toward white), used for glow/bright accents.
const lighten = (rgb, amount) => {
  const channel = (v) =>
    Math.round(v + (255 - v) * amount).toString(16).padStart(2, "0");
  return `#${rgb.map(channel).join("")}`;
};

const isEmbedded = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// Strips ASCII control characters (below the space character, plus DEL) so a
// query param can't smuggle anything odd into document.title or the header.
const CONTROL_CHAR_FLOOR = " ".codePointAt(0); // 32
const DEL_CODE = 127;
const stripControlChars = (value) =>
  Array.from(value)
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code >= CONTROL_CHAR_FLOOR && code !== DEL_CODE;
    })
    .join("");

const sanitizeBrand = (value) => {
  if (!value) return null;
  const clean = stripControlChars(value).replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 80) : null;
};

const sanitizeLogoUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const readSession = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSession = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Sandboxed iframes can disable storage; the in-memory value still
    // applies for the current page, it just won't survive navigation.
  }
};

export let BRAND = DEFAULT_BRAND;
export let LOGO_URL = null;
export let PRIMARY_COLOR = DEFAULT_PRIMARY_COLOR;

const applyBrandTheme = () => {
  const root = document.documentElement;
  const rgb = hexToRgb(PRIMARY_COLOR);

  root.style.setProperty("--scenic-accent", PRIMARY_COLOR);
  root.style.setProperty("--scenic-accent-rgb", rgb.join(", "));
  root.style.setProperty("--scenic-accent-hover", darken(rgb, 0.84));
  root.style.setProperty("--scenic-accent-bright", lighten(rgb, 0.2));
};

export const initializeEmbedBranding = () => {
  if (!isEmbedded()) return;

  const params = new URLSearchParams(window.location.search);
  const queryBrand = sanitizeBrand(params.get("brand"));
  const queryLogo = sanitizeLogoUrl(params.get("logo"));
  const queryColor = sanitizeHex(params.get("color"));

  const storedBrand = sanitizeBrand(readSession(BRAND_SESSION_KEY));
  const storedLogo = sanitizeLogoUrl(readSession(LOGO_SESSION_KEY));
  const storedColor = sanitizeHex(readSession(COLOR_SESSION_KEY));

  if (queryBrand) {
    BRAND = queryBrand;
    writeSession(BRAND_SESSION_KEY, queryBrand);
  } else if (storedBrand) {
    BRAND = storedBrand;
  }

  if (queryLogo) {
    LOGO_URL = queryLogo;
    writeSession(LOGO_SESSION_KEY, queryLogo);
  } else if (storedLogo) {
    LOGO_URL = storedLogo;
  }

  if (queryColor) {
    PRIMARY_COLOR = queryColor;
    writeSession(COLOR_SESSION_KEY, queryColor);
  } else if (storedColor) {
    PRIMARY_COLOR = storedColor;
  }

  document.title = BRAND;
  applyBrandTheme();
};
