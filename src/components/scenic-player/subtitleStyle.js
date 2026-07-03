// Shared helpers for rendering the custom subtitle overlay (we render cues
// ourselves rather than via ::cue, which Chrome styles unreliably).

// Text-shadow outline; width 0 = none.
export const strokeCss = (c, w) => {
  if (!w) return "none";
  const o = `${w}px`;
  return [`-${o} -${o}`, `${o} -${o}`, `-${o} ${o}`, `${o} ${o}`, `0 ${o}`, `0 -${o}`, `${o} 0`, `-${o} 0`]
    .map((p) => `${p} 0 ${c}`)
    .join(", ");
};

export const hexToRgba = (hex, a) => {
  const n = parseInt((hex || "#000000").slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// VTT cue text -> plain lines (strip tags/positioning cruft).
export const cueLines = (text) =>
  (text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\\[^}]*\}/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
