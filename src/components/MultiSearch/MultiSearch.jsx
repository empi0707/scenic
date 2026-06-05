import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import MovieCard from "../movie-card/MovieCard";
import Loading from "../loading/Loading";
import MicButton from "../mic-button/MicButton";
import SearchSuggestions from "../search-suggestions/SearchSuggestions";
import useSearchSuggestions from "../../hooks/useSearchSuggestions";
import tmdbApi from "../../api/tmdbApi";
import { category } from "../../api/tmdbApi";
import "./MultiSearch.scss";

const MultiSearch = () => {
  const { keyword } = useParams();
  const [searchResults, setSearchResults] = useState([]);
  const [searchInput, setSearchInput] = useState(keyword || "");
  // The query that results are actually shown for (only updated on submit).
  const [submittedTerm, setSubmittedTerm] = useState(keyword || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const { suggestions, loading: suggestLoading } = useSearchSuggestions(searchInput);
  const searchRef = useRef(null);

  const navigate = useNavigate();

  // Search runs ONLY when the user submits - clicking the search icon or
  // pressing Enter/Done/Search on the keyboard. No per-keystroke search, so
  // the on-screen keyboard (TV / mobile) keeps focus while typing.
  const runSearch = useCallback(async (rawTerm) => {
    const term = rawTerm.trim();

    if (term.length === 0) {
      setSearchResults([]);
      setSubmittedTerm("");
      setError(null);
      return;
    }

    setSubmittedTerm(term);
    navigate(`/search/${encodeURIComponent(term)}`, { replace: true });

    setIsLoading(true);
    try {
      const response = await tmdbApi.search(category.multi, {
        params: { query: term },
      });
      setSearchResults(response.results);
      setError(null);
    } catch (err) {
      console.error("Error searching:", err);
      setError("Failed to search. Please try again.");
      toast.error("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Run once on mount if we arrived with a keyword in the URL (shared link).
  const didInitialSearch = useRef(false);
  useEffect(() => {
    if (didInitialSearch.current) return;
    didInitialSearch.current = true;
    if (keyword) {
      runSearch(keyword);
    }
  }, [keyword, runSearch]);

  // Close the suggestions dropdown when clicking/tapping outside the search box.
  useEffect(() => {
    if (!showSuggest) return undefined;
    const onDocPointerDown = (e) => {
      const insideBox = searchRef.current && searchRef.current.contains(e.target);
      const insideDropdown = e.target.closest && e.target.closest(".search-suggestions");
      if (!insideBox && !insideDropdown) {
        setShowSuggest(false);
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
    };
  }, [showSuggest]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggest(false);
    runSearch(searchInput);
  };

  return (
    <div className="search-page">
            <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="search-container"
      >
        <form
          className="movie-search"
          onSubmit={handleSubmit}
          role="search"
          ref={searchRef}
        >
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            className="search-input"
            placeholder="Search Movies, TV Shows, and More..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setShowSuggest(true)}
          />
          {searchInput && (
            <button
              type="button"
              className="clear-btn"
              aria-label="Clear search"
              onClick={() => {
                setSearchInput("");
                navigate("/");
              }}
            >
              <i className="bx bx-x" />
            </button>
          )}
          <MicButton
            onTranscript={(t) => setSearchInput(t)}
            onFinal={(t) => {
              const term = t.trim();
              setSearchInput(term);
              setShowSuggest(false);
              runSearch(term);
            }}
          />
          <button type="submit" className="search-btn" aria-label="Search">
            {isLoading ? (
              <i className="bx bx-loader-alt bx-spin" />
            ) : (
              <i className="bx bx-search" />
            )}
          </button>
          {showSuggest && (
            <SearchSuggestions
              items={suggestions}
              loading={suggestLoading}
              query={searchInput}
              anchorRef={searchRef}
              onSelect={() => setShowSuggest(false)}
              onSeeAll={handleSubmit}
            />
          )}
        </form>
      </motion.div>
      <div className="container">
        {submittedTerm.trim().length > 0 && (
          <h2>Search Results for "{submittedTerm}"</h2>
        )}
        {isLoading ? (
          <Loading size="large" />
        ) : error ? (
          <div className="error-message">
            <Text color="red" size="lg" ta="center">
              {error}
            </Text>
          </div>
        ) : (
          <div className="movie-grid">
            {searchResults
              .filter((item) => item.backdrop_path || item.poster_path)
              .map((item, i) => (
                <MovieCard category={item.media_type} item={item} key={i} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSearch;
