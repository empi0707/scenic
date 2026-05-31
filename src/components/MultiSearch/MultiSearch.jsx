import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TextInput, Text, ActionIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useDebounce } from 'use-debounce';
import MovieCard from "../movie-card/MovieCard";
import Loading from "../loading/Loading";
import tmdbApi from "../../api/tmdbApi";
import { category } from "../../api/tmdbApi";
import "./MultiSearch.scss";

const MultiSearch = () => {
  const { keyword } = useParams();
  const [searchResults, setSearchResults] = useState([]);
  // The input is the single source of truth. It is seeded from the URL once
  // (for shareable links) and is never written back to from the URL, so live
  // typing can't be interrupted mid-word.
  const [searchInput, setSearchInput] = useState(keyword || "");
  const [debouncedSearchTerm] = useDebounce(searchInput, 500);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const term = debouncedSearchTerm.trim();

    if (term.length === 0) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Keep the URL in sync for shareable/bookmarkable links. `replace` avoids
    // polluting history, and we never read this value back into the input.
    navigate(`/search/${encodeURIComponent(term)}`, { replace: true });

    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const response = await tmdbApi.search(category.multi, {
          params: { query: term },
        });
        if (!cancelled) {
          setSearchResults(response.results);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error searching:", err);
          setError("Failed to search. Please try again.");
          toast.error("Search failed. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchTerm, navigate]);

  return (
    <div className="search-page">
            <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="search-container"
      >
        <div className="movie-search">
          <TextInput
            type="text"
            placeholder="Search Movies, TV Shows, and More..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="lg"
            className="search-input"
            leftSection={
              isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="search-icon"
                >
                  <i className="bx bx-loader-alt bx-spin" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="search-icon"
                >
                  <i className="bx bx-search" />
                </motion.div>
              )
            }
            rightSection={
              searchInput && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setSearchInput("");
                    navigate("/");
                  }}
                  className="clear-button"
                >
                  <i className="bx bx-x" />
                </ActionIcon>
              )
            }
          />
        </div>
      </motion.div>
      <div className="container">
        {debouncedSearchTerm.trim().length > 0 && (
          <h2>Search Results for "{debouncedSearchTerm}"</h2>
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
