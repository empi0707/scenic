import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import useListboxKeyboard from "../../hooks/useListboxKeyboard";
import "./glass-select.scss";

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// A glass-morphism dropdown that needs no typing: the focused trigger handles
// arrow / Enter / Esc, the highlighted option auto-scrolls into view, and the
// menu is portaled so the page can't paint over it. Works with a TV remote
// (D-pad arrows) the same as a keyboard.
const GlassSelect = ({
  options = [],
  value = null,
  onChange,
  placeholder = "Select",
  ariaLabel,
  clearable = true,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const activeRef = useRef(null);

  const allOptions = clearable
    ? [{ value: null, label: placeholder, clear: true }, ...options]
    : options;

  const selected = options.find((o) => String(o.value) === String(value));
  const selectedIndex =
    value == null
      ? clearable
        ? 0
        : -1
      : Math.max(
          0,
          allOptions.findIndex((o) => !o.clear && String(o.value) === String(value))
        );

  const close = () => {
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  };

  const choose = (i) => {
    const opt = allOptions[i];
    if (!opt) return;
    onChange(opt.clear ? null : opt.value);
    close();
  };

  const { highlighted, setHighlighted, onKeyDown } = useListboxKeyboard({
    isOpen: open,
    itemCount: allOptions.length,
    selectedIndex,
    onOpen: () => setOpen(true),
    onClose: close,
    onChoose: choose,
  });

  // Pin the portaled menu under the trigger.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Close on outside click (the menu is portaled, so match it by class).
  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const inMenu = e.target.closest && e.target.closest(".glass-select__menu");
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted, open]);

  // Ensure the trigger holds focus while open, so arrow keys reach it even on
  // browsers (e.g. TV) that don't focus a button on click.
  useEffect(() => {
    if (open && triggerRef.current) triggerRef.current.focus();
  }, [open]);

  // Type-ahead: while open, typed characters jump the highlight to the first
  // matching option (like a native <select>). No input box, so no on-screen
  // keyboard is needed - it just reacts to key presses on the focused trigger.
  const typeahead = useRef({ buffer: "", timer: null });
  useEffect(
    () => () => {
      if (typeahead.current.timer) clearTimeout(typeahead.current.timer);
    },
    []
  );

  const handleTriggerKeyDown = (e) => {
    if (
      open &&
      e.key.length === 1 &&
      e.key !== " " &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const ta = typeahead.current;
      ta.buffer += e.key.toLowerCase();
      if (ta.timer) clearTimeout(ta.timer);
      ta.timer = setTimeout(() => {
        ta.buffer = "";
      }, 800);
      const starts = allOptions.findIndex(
        (o) => !o.clear && o.label.toLowerCase().startsWith(ta.buffer)
      );
      const idx =
        starts >= 0
          ? starts
          : allOptions.findIndex(
              (o) => !o.clear && o.label.toLowerCase().includes(ta.buffer)
            );
      if (idx >= 0) setHighlighted(idx);
      return;
    }
    onKeyDown(e);
  };

  return (
    <div className="glass-select">
      <button
        type="button"
        ref={triggerRef}
        className={`glass-select__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={`glass-select__value${selected ? "" : " is-placeholder"}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span className="glass-select__actions">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              className="glass-select__clear"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <i className="bx bx-x" />
            </span>
          )}
          <span className="glass-select__chevron">
            <ChevronIcon />
          </span>
        </span>
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            className="glass-select__menu"
            role="listbox"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            {allOptions.map((opt, i) => {
              const isSelected = opt.clear
                ? value == null
                : String(opt.value) === String(value);
              return (
                <li
                  key={opt.clear ? "__clear__" : opt.value}
                  ref={i === highlighted ? activeRef : null}
                  role="option"
                  aria-selected={isSelected}
                  className={`glass-select__option${
                    i === highlighted ? " is-active" : ""
                  }${opt.clear ? " glass-select__option--clear" : ""}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                >
                  <span className="glass-select__option-label">{opt.label}</span>
                  {isSelected && !opt.clear && (
                    <i className="bx bx-check glass-select__check" />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
};

export default GlassSelect;
