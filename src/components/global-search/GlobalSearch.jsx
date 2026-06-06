import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import SearchField from "../search-field/SearchField";
import MicButton from "../mic-button/MicButton";
import SearchSuggestions from "../search-suggestions/SearchSuggestions";
import SmartSearchHints from "../smart-search-hints/SmartSearchHints";
import useSearchSuggestions from "../../hooks/useSearchSuggestions";
import useSuggestionNav from "../../hooks/useSuggestionNav";
import "./global-search.scss";

// App-wide search overlay opened from the header (icon or "/"). Blurs the page
// and centers the same smart search used across the app.
const GlobalSearch = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const { suggestions, loading } = useSearchSuggestions(keyword);
  const { activeIndex, onKeyDown } = useSuggestionNav({
    items: suggestions,
    visible: open,
    onClose,
  });
  const formRef = useRef(null);

  // Lock scroll, focus the field, and close on Escape while open.
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => {
      const input = formRef.current && formRef.current.querySelector("input");
      if (input) input.focus();
    }, 60);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Reset the query whenever the overlay closes.
  useEffect(() => {
    if (!open) setKeyword("");
  }, [open]);

  const run = (term) => {
    const t = (term || "").trim();
    if (!t) return;
    navigate(`/search/${encodeURIComponent(t)}`);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    run(keyword);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="global-search"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="global-search__close"
        onClick={onClose}
        aria-label="Close search"
      >
        <i className="bx bx-x" />
      </button>

      <div className="global-search__panel">
        <form
          className="movie-search"
          onSubmit={handleSubmit}
          role="search"
          ref={formRef}
        >
          <SearchField
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {keyword && (
            <button
              type="button"
              className="clear-btn"
              aria-label="Clear search"
              onClick={() => setKeyword("")}
            >
              <i className="bx bx-x" />
            </button>
          )}
          <MicButton
            onTranscript={(t) => setKeyword(t)}
            onFinal={(t) => run(t)}
          />
          <button type="submit" className="search-btn" aria-label="Search">
            <i className="bx bx-search" />
          </button>
        </form>

        {keyword.trim().length >= 2 ? (
          <SearchSuggestions
            inline
            items={suggestions}
            loading={loading}
            query={keyword}
            activeIndex={activeIndex}
            onSelect={onClose}
            onSeeAll={handleSubmit}
          />
        ) : (
          <SmartSearchHints onPick={run} />
        )}
      </div>
    </div>,
    document.body
  );
};

export default GlobalSearch;
