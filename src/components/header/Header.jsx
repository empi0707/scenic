import React, { useRef, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { watchlist } from "../../utils/watchlist";
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
            <Link to="/">Scenic</Link>
          </div>
          <ul className="header__nav">
            {headerNav.map((e, i) => (
              <li key={i} className={`${i === active ? "active" : ""}`}>
                <Link to={e.path}>{e.display}</Link>
              </li>
            ))}
          </ul>
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
    </>
  );
};

export default Header;
