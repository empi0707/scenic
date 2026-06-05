import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { linkFor } from "../utils/suggestionLink";

// Keyboard / D-pad navigation for the autocomplete dropdown. Focus stays in the
// input (so typing continues and the on-screen keyboard stays up); arrow keys
// just move a visual highlight, Enter opens the highlighted item, Escape closes.
export default function useSuggestionNav({ items, visible, onClose }) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastIndex = items.length - 1;

  // Reset the highlight whenever the list changes or the dropdown toggles.
  useEffect(() => {
    setActiveIndex(-1);
  }, [items, visible]);

  const onKeyDown = useCallback(
    (e) => {
      if (!visible || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i >= lastIndex ? 0 : i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? lastIndex : i - 1));
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex <= lastIndex) {
          // Open the highlighted suggestion. With no highlight (-1) we don't
          // preventDefault, so the form submits and runs the full search.
          e.preventDefault();
          if (onClose) onClose();
          navigate(linkFor(items[activeIndex]));
        }
      } else if (e.key === "Escape") {
        if (onClose) onClose();
        setActiveIndex(-1);
      }
    },
    [visible, items, activeIndex, lastIndex, navigate, onClose]
  );

  return { activeIndex, onKeyDown };
}
