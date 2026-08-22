import React, { useRef, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { watchlist } from "../../utils/watchlist";
import GlobalSearch from "../global-search/GlobalSearch";
import { BRAND, LOGO_URL } from "../../config/embedBranding";
import "./header.scss";

const baseNav = [
  {
    display: "Home",
    path: "/",
  },
  {
    display: "Movies",
    path: "/movie",
  },
  {
    display: "TV Series",
    path: "/tv",
  },
  {
    display: "Anime",
    path: "/anime",
  },
];

const myListEntry = {
  display: "My List",
  path: "/my-list",
};

const Header = () => {
  const { pathname } = useLocation();
  const headerRef = useRef(null);

  // Only surface the My List tab once the user has actually saved
  // something — keeps the nav clean for first-time visitors.
  const [hasWatchlist, setHasWatchlist] = useState(
    () => watchlist.getAll().length > 0
  );
  useEffect(() => {
    const sync = () => setHasWatchlist(watchlist.getAll().length > 0);
    sync();
    return watchlist.subscribe(sync);
  }, []);

  const headerNav = hasWatchlist ? [...baseNav, myListEntry] : baseNav;
  const active = headerNav.findIndex((e) => e.path === pathname);

  const [searchOpen, setSearchOpen] = useState(false);
  // Falls back to the text wordmark if an embed's custom ?logo= 404s or
  // fails to load, rather than leaving a broken image icon in the header.
  const [logoBroken, setLogoBroken] = useState(false);

  // "/" opens search (unless the user is already typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el && el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (el && el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      setSearchOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const shrinkHeader = () => {
      if (
        document.body.scrollTop > 100 ||
        document.documentElement.scrollTop > 100
      ) {
        headerRef.current.classList.add("shrink");
      } else {
        headerRef.current.classList.remove("shrink");
      }
    };
    window.addEventListener("scroll", shrinkHeader);
    return () => {
      window.removeEventListener("scroll", shrinkHeader);
    };
  }, []);

  return (
    <>
      <div ref={headerRef} className="header">
        <div className="header__wrap container">
          <div className="logo">
            <Link to="/">
              {LOGO_URL && !logoBroken ? (
                <img
                  src={LOGO_URL}
                  alt={BRAND}
                  className="logo__image"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                BRAND
              )}
            </Link>
          </div>
          <ul className="header__nav">
            {headerNav.map((e, i) => (
              <li key={i} className={`${i === active ? "active" : ""}`}>
                <Link to={e.path}>{e.display}</Link>
              </li>
            ))}
            <li className="header__search">
              <button
                type="button"
                className="header__search-btn"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                title="Search (press /)"
              >
                <i className="bx bx-search" />
              </button>
            </li>
          </ul>
          <button
            type="button"
            className="header__search-mobile"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <i className="bx bx-search" />
          </button>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <ul className="header__mobile-nav">
        {headerNav.map((e, i) => (
          <li key={i} className={`${i === active ? "active" : ""}`}>
            <Link to={e.path}>{e.display}</Link>
          </li>
        ))}
      </ul>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
