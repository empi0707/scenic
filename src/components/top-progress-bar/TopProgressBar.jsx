import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./top-progress-bar.scss";

// Thin accent bar pinned to the top of the window that animates on every route
// change (YouTube/nprogress-style) for an instant "loading" cue between pages.
const TopProgressBar = () => {
  const location = useLocation();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(false);
  const timers = useRef([]);
  const firstRender = useRef(true);

  useEffect(() => {
    // The initial load is covered by the Suspense fallback, so don't flash then.
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }

    timers.current.forEach(clearTimeout);
    setActive(true);
    setWidth(0);

    // Quick jump to near-complete, hold, then finish and fade out.
    const t0 = setTimeout(() => setWidth(90), 30);
    const t1 = setTimeout(() => setWidth(100), 420);
    const t2 = setTimeout(() => setActive(false), 680);
    const t3 = setTimeout(() => setWidth(0), 1000);
    timers.current = [t0, t1, t2, t3];

    return () => timers.current.forEach(clearTimeout);
  }, [location.key]);

  return (
    <div className={`route-progress${active ? " is-active" : ""}`} aria-hidden="true">
      <div className="route-progress__bar" style={{ width: `${width}%` }} />
    </div>
  );
};

export default TopProgressBar;
