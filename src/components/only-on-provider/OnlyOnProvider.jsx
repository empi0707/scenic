import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import Button from "../button/Button";
import "./only-on-provider.scss";

const SWIPER_BREAKPOINTS = {
  480: { slidesPerView: 3, slidesPerGroup: 3 },
  768: { slidesPerView: 4, slidesPerGroup: 3 },
  1024: { slidesPerView: 5, slidesPerGroup: 3 },
  1280: { slidesPerView: 6, slidesPerGroup: 3 },
};

// Curated TMDB provider IDs to feature per region (in priority order). All
// other provider metadata (name, logo) comes from the API at runtime.
const FEATURED_BY_REGION = {
  US: [8, 9, 1899, 337, 350, 531, 15],
  IN: [8, 119, 122, 220, 237, 232, 350],
  GB: [8, 9, 337, 350, 1899, 39],
  CA: [8, 9, 337, 350, 1899],
  AU: [8, 9, 337, 350, 1899, 33],
};
const DEFAULT_FEATURED = [8, 9, 337, 350, 1899];

// Brand colors used for the trigger's left underline / glow.
const PROVIDER_COLORS = {
  8: "#E50914", 9: "#1A98FF", 119: "#1A98FF", 1899: "#3A1572",
  337: "#0E4DD9", 122: "#1F80E0", 220: "#E50914", 237: "#0096F6",
  232: "#8c52ff", 350: "#1d1d1f", 531: "#0064FF", 15: "#1CE783",
  39: "#00D86B", 33: "#000000",
};

// Timezone-to-region map. Used to default the region selector to the
// user's most likely real location.
const TIMEZONE_TO_REGION = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Karachi": "PK", "Asia/Dhaka": "BD",
  "Asia/Tokyo": "JP", "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG", "Asia/Bangkok": "TH",
  "Asia/Dubai": "AE",
  "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE",
  "Europe/Madrid": "ES", "Europe/Rome": "IT",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
};

const detectRegion = () => {
  try {
    const tz =
      (typeof Intl !== "undefined" &&
        Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "";
    if (TIMEZONE_TO_REGION[tz]) return TIMEZONE_TO_REGION[tz];
    const langs =
      (typeof navigator !== "undefined" &&
        (navigator.languages || [navigator.language])) ||
      ["en-US"];
    for (const lang of langs) {
      if (!lang) continue;
      const parts = lang.split("-");
      if (parts.length >= 2 && parts[1].length === 2) {
        return parts[1].toUpperCase();
      }
    }
  } catch (_) {}
  return "US";
};

// Cross-platform flag image via flagcdn.com (SVG, free, no API key).
// Windows doesn't render flag emojis natively, so we use real images.
const flagUrl = (code) => {
  if (!code || code.length !== 2) return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
};

const getFeaturedIds = (region) =>
  FEATURED_BY_REGION[region] || DEFAULT_FEATURED;

const ProviderSkeleton = () => (
  <div className="only-on-provider__skeleton-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="only-on-provider__skeleton-card" />
    ))}
  </div>
);

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const CheckIcon = () => (
  <span className="only-on-provider__check" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  </span>
);

const OnlyOnProvider = ({ mediaType = "tv", limit = 12 }) => {
  const [region, setRegion] = useState(detectRegion());
  const [regions, setRegions] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [openProvider, setOpenProvider] = useState(false);
  const [openRegion, setOpenRegion] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");

  const providerRef = useRef(null);
  const regionRef = useRef(null);
  const regionSearchRef = useRef(null);

  // Filter regions based on search query
  const filteredRegions = useMemo(() => {
    if (!regionSearch.trim()) return regions;
    const q = regionSearch.toLowerCase().trim();
    return regions.filter(
      (r) =>
        (r.english_name || "").toLowerCase().includes(q) ||
        (r.native_name || "").toLowerCase().includes(q) ||
        r.iso_3166_1.toLowerCase().includes(q)
    );
  }, [regions, regionSearch]);

  // Clear search when region menu opens (no autofocus — user clicks to type)
  useEffect(() => {
    if (openRegion) {
      setRegionSearch("");
    }
  }, [openRegion]);

  // Fetch the supported region list once on mount
  useEffect(() => {
    let cancelled = false;
    tmdbApi
      .getWatchRegions()
      .then((res) => {
        if (cancelled) return;
        const sorted = [...(res.results || [])].sort((a, b) =>
          (a.english_name || "").localeCompare(b.english_name || "")
        );
        setRegions(sorted);
      })
      .catch((e) => console.error("Failed to fetch regions:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch providers (with logos + names) for the selected region + media type
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await tmdbApi.getWatchProviders(mediaType, region);
        const all = res.results || [];
        const featured = getFeaturedIds(region);
        const map = new Map(all.map((p) => [p.provider_id, p]));
        const list = featured
          .map((id) => map.get(id))
          .filter(Boolean)
          .map((p) => ({
            id: p.provider_id,
            name: p.provider_name,
            logo: p.logo_path
              ? `https://image.tmdb.org/t/p/original${p.logo_path}`
              : null,
            color: PROVIDER_COLORS[p.provider_id] || "#6366f1",
          }));

        if (cancelled) return;
        setProviders(list);
        if (list.length > 0) {
          setProviderId((prev) =>
            list.find((p) => p.id === prev) ? prev : list[0].id
          );
        }
      } catch (e) {
        console.error("Failed to fetch providers:", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [region, mediaType]);

  const provider = useMemo(
    () => providers.find((p) => p.id === providerId),
    [providers, providerId]
  );

  // Fetch titles for selected provider/region. Falls back to US if the
  // chosen region returns nothing for that provider.
  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingItems(true);
      try {
        let res = await tmdbApi.discoverByProvider(
          mediaType,
          providerId,
          region
        );
        let results = res.results || [];
        if (results.length === 0 && region !== "US") {
          res = await tmdbApi.discoverByProvider(mediaType, providerId, "US");
          results = res.results || [];
        }
        const filtered = results
          .filter((i) => i.backdrop_path || i.poster_path)
          .slice(0, limit);
        if (!cancelled) setItems(filtered);
      } catch (e) {
        console.error("Discover failed:", e);
      } finally {
        if (!cancelled) setIsLoadingItems(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [providerId, mediaType, region, limit]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (providerRef.current && !providerRef.current.contains(e.target))
        setOpenProvider(false);
      if (regionRef.current && !regionRef.current.contains(e.target))
        setOpenRegion(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const linkFor = (item) =>
    `/${mediaType === "tv" ? "tv" : "movie"}/${item.id}`;

  return (
    <div className="only-on-provider">
      <div className="section__header mb-2 only-on-provider__header">
        <h2 className="only-on-provider__title">
          <span className="only-on-provider__prefix only-on-provider__prefix--lead">
            Streaming on
          </span>

          {/* Provider trigger */}
          <span className="only-on-provider__trigger-wrap" ref={providerRef}>
            <button
              type="button"
              className={`only-on-provider__trigger${
                openProvider ? " is-open" : ""
              }`}
              onClick={() => {
                setOpenProvider((v) => !v);
                setOpenRegion(false);
              }}
              style={{ "--provider-color": provider?.color || "#6366f1" }}
              aria-haspopup="listbox"
              aria-expanded={openProvider}
            >
              <span className="only-on-provider__trigger-name">
                {provider?.name || "…"}
              </span>
              <span className="only-on-provider__chevron">
                <ChevronIcon />
              </span>
            </button>

            {openProvider && providers.length > 0 && (
              <ul className="only-on-provider__menu" role="listbox">
                {providers.map((p) => {
                  const selected = p.id === providerId;
                  return (
                    <li key={p.id} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        className={`only-on-provider__option${
                          selected ? " is-selected" : ""
                        }`}
                        onClick={() => {
                          setProviderId(p.id);
                          setOpenProvider(false);
                        }}
                      >
                        <span
                          className="only-on-provider__avatar"
                          style={{ background: p.color }}
                        >
                          {p.logo ? (
                            <img src={p.logo} alt="" />
                          ) : (
                            p.name.charAt(0)
                          )}
                        </span>
                        <span className="only-on-provider__option-name">
                          {p.name}
                        </span>
                        {selected && <CheckIcon />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </span>

          <span className="only-on-provider__prefix">in</span>

          {/* Region trigger — same visual style as provider trigger */}
          <span className="only-on-provider__trigger-wrap" ref={regionRef}>
            <button
              type="button"
              className={`only-on-provider__trigger only-on-provider__trigger--region${
                openRegion ? " is-open" : ""
              }`}
              onClick={() => {
                setOpenRegion((v) => !v);
                setOpenProvider(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={openRegion}
            >
              {flagUrl(region) && (
                <img
                  className="only-on-provider__flag-img"
                  src={flagUrl(region)}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <span className="only-on-provider__trigger-name">{region}</span>
              <span className="only-on-provider__chevron">
                <ChevronIcon />
              </span>
            </button>

            {openRegion && regions.length > 0 && (
              <div className="only-on-provider__menu only-on-provider__menu--region">
                <div className="only-on-provider__menu-search">
                  <i className="bx bx-search"></i>
                  <input
                    ref={regionSearchRef}
                    type="text"
                    placeholder="Search…"
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <ul
                  className="only-on-provider__menu-list"
                  role="listbox"
                >
                  {filteredRegions.length === 0 ? (
                    <li className="only-on-provider__menu-empty">
                      No matches
                    </li>
                  ) : (
                    filteredRegions.map((r) => {
                      const selected = r.iso_3166_1 === region;
                      return (
                        <li
                          key={r.iso_3166_1}
                          role="option"
                          aria-selected={selected}
                        >
                          <button
                            type="button"
                            className={`only-on-provider__option${
                              selected ? " is-selected" : ""
                            }`}
                            onClick={() => {
                              setRegion(r.iso_3166_1);
                              setOpenRegion(false);
                            }}
                          >
                            {flagUrl(r.iso_3166_1) && (
                              <img
                                className="only-on-provider__flag-img only-on-provider__flag-img--lg"
                                src={flagUrl(r.iso_3166_1)}
                                alt=""
                                aria-hidden="true"
                              />
                            )}
                            <span className="only-on-provider__option-name">
                              {r.english_name || r.iso_3166_1}
                            </span>
                            {selected && <CheckIcon />}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </span>
        </h2>
      </div>

      {isLoadingItems ? (
        <ProviderSkeleton />
      ) : items.length === 0 ? (
        <p className="only-on-provider__empty">
          No titles available on {provider?.name || "this provider"} right now.
        </p>
      ) : (
        <Swiper
          modules={[Navigation, Pagination]}
          spaceBetween={12}
          slidesPerView={2}
          slidesPerGroup={2}
          navigation
          pagination={{ clickable: true }}
          speed={500}
          breakpoints={SWIPER_BREAKPOINTS}
        >
          {items.map((item) => {
            const poster = item.poster_path
              ? apiConfig.w500Image(item.poster_path)
              : apiConfig.w500Image(item.backdrop_path);
            const title = item.title || item.name;
            const dateStr = item.release_date || item.first_air_date;
            const year = dateStr ? new Date(dateStr).getFullYear() : null;
            return (
              <SwiperSlide key={item.id}>
                <Link to={linkFor(item)} className="only-on-provider__card">
                  <div
                    className="only-on-provider__card-image"
                    style={{ backgroundImage: `url(${poster})` }}
                  >
                    <Button>
                      <i className="bx bx-play"></i>
                    </Button>
                    {item.vote_average > 0 && (
                      <span className="only-on-provider__rating">
                        <i className="bx bxs-star"></i>
                        {item.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="only-on-provider__meta">
                    <h3>{title}</h3>
                    <div className="only-on-provider__meta-sub">
                      {year && <span>{year}</span>}
                      <span className="only-on-provider__sep">·</span>
                      <span>{mediaType === "tv" ? "TV Show" : "Movie"}</span>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}
    </div>
  );
};

export default OnlyOnProvider;
