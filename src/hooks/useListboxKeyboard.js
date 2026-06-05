import { useState, useEffect, useCallback } from "react";

// Keyboard / D-pad support for custom (non-native) dropdowns. Focus stays on the
// trigger element; arrow keys move a highlight through the options, Enter/Space
// selects, Escape closes. The trigger must be focusable (a <button>, or a div
// with tabIndex={0}) and wire up the returned onKeyDown handler.
export default function useListboxKeyboard({
  isOpen,
  itemCount,
  selectedIndex = 0,
  onOpen,
  onClose,
  onChoose,
}) {
  const [highlighted, setHighlighted] = useState(-1);

  // When the menu opens, start the highlight on the current selection.
  useEffect(() => {
    if (isOpen) {
      setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setHighlighted(-1);
    }
  }, [isOpen, selectedIndex]);

  const onKeyDown = useCallback(
    (e) => {
      if (itemCount <= 0) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) onOpen();
          else setHighlighted((h) => (h + 1) % itemCount);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!isOpen) onOpen();
          else setHighlighted((h) => (h - 1 + itemCount) % itemCount);
          break;
        case "Home":
          if (isOpen) {
            e.preventDefault();
            setHighlighted(0);
          }
          break;
        case "End":
          if (isOpen) {
            e.preventDefault();
            setHighlighted(itemCount - 1);
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (!isOpen) onOpen();
          else if (highlighted >= 0) onChoose(highlighted);
          break;
        case "Escape":
          if (isOpen) {
            e.preventDefault();
            onClose();
          }
          break;
        case "Tab":
          if (isOpen) onClose();
          break;
        default:
          break;
      }
    },
    [isOpen, itemCount, highlighted, onOpen, onClose, onChoose]
  );

  return { highlighted, setHighlighted, onKeyDown };
}
