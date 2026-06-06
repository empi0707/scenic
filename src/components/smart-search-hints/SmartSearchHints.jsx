import React from "react";
import "./smart-search-hints.scss";

// label = short text on the chip; query = what actually runs.
const GROUPS = [
  {
    label: "By title",
    sublabel: "A movie or show",
    icon: "bx-search",
    items: [
      { label: "The Boys", query: "The Boys" },
      { label: "Dhurandhar", query: "Dhurandhar" },
      { label: "Stranger Things", query: "Stranger Things" },
    ],
  },
  {
    label: "By vibe",
    sublabel: "Genres & languages",
    icon: "bx-film",
    items: [
      { label: "Punjabi", query: "punjabi movies" },
      { label: "Korean thrillers", query: "korean thrillers" },
      { label: "Hindi comedy", query: "hindi comedy" },
      { label: "Anime", query: "anime" },
    ],
  },
  {
    label: "By people",
    sublabel: "Actors & directors",
    icon: "bx-user",
    items: [
      { label: "Tom Cruise", query: "tom cruise movies" },
      { label: "By Nolan", query: "directed by christopher nolan" },
      { label: "Zendaya", query: "movies with zendaya" },
    ],
  },
  {
    label: "More like this",
    sublabel: "Find similar titles",
    icon: "bx-shuffle",
    items: [
      { label: "Like Inception", query: "movies like inception" },
      { label: "Like Breaking Bad", query: "shows like breaking bad" },
    ],
  },
];

const SmartSearchHints = ({ onPick }) => (
  <div className="smart-hints">
    <div className="smart-hints__head">
      <h3>Search, your way</h3>
      <p>Type it like you'd say it. Scenic figures out the rest.</p>
    </div>

    <div className="smart-hints__rows">
      {GROUPS.map((group, gi) => (
        <div className="smart-hints__row" key={group.label} style={{ "--g": gi }}>
          <div className="smart-hints__rail">
            <span className="smart-hints__badge">
              <i className={`bx ${group.icon}`} aria-hidden="true" />
            </span>
            <span className="smart-hints__rail-text">
              <span className="smart-hints__label">{group.label}</span>
              <span className="smart-hints__sublabel">{group.sublabel}</span>
            </span>
          </div>
          <div className="smart-hints__chips">
            {group.items.map((it) => (
              <button
                key={it.query}
                type="button"
                className="smart-hints__chip"
                onClick={() => onPick(it.query)}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SmartSearchHints;
