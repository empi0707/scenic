import React, { useEffect, useRef, useState } from "react";
import "./info-tooltip.scss";

const InfoIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4" />
    <circle cx="12" cy="8" r="0.5" fill="currentColor" />
  </svg>
);

const InfoTooltip = ({ children, label = "More info" }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <span
      className={`info-tooltip${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className={`info-tooltip__btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
      >
        <InfoIcon />
      </button>
      <div className="info-tooltip__popover" role="tooltip">
        {children}
      </div>
    </span>
  );
};

export default InfoTooltip;
