import React, { useEffect, useState } from "react";
import { SUB_FONTS, SUB_WEIGHTS, SUB_COLORS, SUB_STROKES, SUB_LANGUAGES } from "../../constants/constants";

const langInfo = (code) => SUB_LANGUAGES[(code || "").toLowerCase()] || [(code || "?").toUpperCase(), "🏳️"];

const IcClose = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const IcBack = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// Captions button + panels: OpenSubtitles list, source subtitles, upload, and
// appearance settings. Selection and style changes flow up to ScenicPlayer.
const Subtitles = ({ media, extSubs, activeSub, onSelect, onOff, onUploadClick, menu, setMenu, ccIcon, subStyle, setSubStyle }) => {
  const [capList, setCapList] = useState({ total: 0, items: [] });

  useEffect(() => {
    if (!media?.id) return undefined;
    let alive = true;
    setCapList({ total: 0, items: [] });
    const q = new URLSearchParams({ type: media.type || "movie", id: String(media.id) });
    if (media.type === "tv") {
      q.set("season", String(media.season));
      q.set("episode", String(media.episode));
    }
    fetch(`/api/subtitle?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setCapList({ total: d.total || 0, items: d.items || [] }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [media?.type, media?.id, media?.season, media?.episode]);

  const setSub = (patch) => setSubStyle((s) => ({ ...s, ...patch }));
  const pickSource = (s, i) =>
    onSelect({ key: `src-${i}`, url: s.url, lang: s.lang || "en", label: s.label || `Subtitle ${i + 1}` });
  const pickOpenSub = (it) =>
    onSelect({
      key: `os-${it.file_id}`,
      url: `/api/subtitle?file_id=${it.file_id}`,
      lang: it.lang,
      label: `${langInfo(it.lang)[0]}${it.hi ? " (HI)" : ""}`,
    });

  return (
    <div className="scenic-player__menuwrap">
      <button
        className={activeSub ? "is-active" : ""}
        onClick={() => setMenu(menu === "cc" || menu === "capset" ? null : "cc")}
        aria-label="Captions"
      >
        {ccIcon}
      </button>

      {menu === "cc" && (
        <div className="scenic-player__caps">
          <div className="scenic-player__caps-head">
            <span className="scenic-player__caps-title">Subtitles</span>
            <div className="scenic-player__caps-actions">
              {capList.total > 0 && <span className="scenic-player__caps-total">{capList.total}</span>}
              <button className="scenic-player__caps-icon" onClick={() => setMenu(null)} aria-label="Close">{IcClose}</button>
            </div>
          </div>

          <div className="scenic-player__caps-seg">
            <button className={`scenic-player__seg-btn${!activeSub ? " is-on" : ""}`} onClick={onOff}>Off</button>
            <button className="scenic-player__seg-btn" onClick={onUploadClick}>Upload</button>
          </div>
          <button className="scenic-player__caps-settings" onClick={() => setMenu("capset")}>Subtitle Settings</button>

          <div className="scenic-player__caps-list">
            {extSubs.length > 0 && (
              <>
                <div className="scenic-player__caps-section">From source</div>
                {extSubs.map((s, i) => (
                  <button key={i} className={`scenic-player__caps-item${activeSub?.key === `src-${i}` ? " is-sel" : ""}`} onClick={() => pickSource(s, i)}>
                    <span className="scenic-player__caps-lang">{s.label || `Subtitle ${i + 1}`}</span>
                  </button>
                ))}
              </>
            )}

            {capList.items.length > 0 && (
              <>
                <div className="scenic-player__caps-section">OpenSubtitles</div>
                {capList.items.map((it) => (
                  <button
                    key={it.file_id}
                    className={`scenic-player__caps-item${activeSub?.key === `os-${it.file_id}` ? " is-sel" : ""}`}
                    onClick={() => pickOpenSub(it)}
                  >
                    <span className="scenic-player__caps-flag">{langInfo(it.lang)[1]}</span>
                    <span className="scenic-player__caps-lang">{langInfo(it.lang)[0]}{it.hi ? " (HI)" : ""}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {menu === "capset" && (
        <div className="scenic-player__caps scenic-player__capset">
          <div className="scenic-player__caps-head">
            <button className="scenic-player__caps-icon" onClick={() => setMenu("cc")} aria-label="Back">{IcBack}</button>
            <span className="scenic-player__caps-title">Appearance</span>
            <button className="scenic-player__caps-icon" onClick={() => setMenu(null)} aria-label="Close">{IcClose}</button>
          </div>

          <div className="scenic-player__caps-section">Font Family</div>
          <div className="scenic-player__pillgrid">
            {SUB_FONTS.map((f) => (
              <button key={f} className={subStyle.family === f ? "sel" : ""} style={{ fontFamily: f }} onClick={() => setSub({ family: f })}>
                {f.replace(" MS", "").replace(" New", "")}
              </button>
            ))}
          </div>

          <div className="scenic-player__caps-section">Font Weight</div>
          <div className="scenic-player__pillgrid">
            {SUB_WEIGHTS.map((w) => (
              <button key={w.v} className={subStyle.weight === w.v ? "sel" : ""} style={{ fontWeight: w.v }} onClick={() => setSub({ weight: w.v })}>
                {w.l}
              </button>
            ))}
          </div>

          <div className="scenic-player__caps-section">Font Color</div>
          <div className="scenic-player__swatches">
            {SUB_COLORS.map((c) => (
              <button key={c} className={`scenic-player__swatch${subStyle.color === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setSub({ color: c })} aria-label={c} />
            ))}
            <label className="scenic-player__swatch scenic-player__swatch--custom">
              +<input type="color" value={subStyle.color} onChange={(e) => setSub({ color: e.target.value })} />
            </label>
          </div>

          <div className="scenic-player__caps-section">Stroke Color</div>
          <div className="scenic-player__swatches">
            {SUB_STROKES.map((c) => (
              <button key={c} className={`scenic-player__swatch${subStyle.stroke === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setSub({ stroke: c })} aria-label={c} />
            ))}
            <label className="scenic-player__swatch scenic-player__swatch--custom">
              +<input type="color" value={subStyle.stroke} onChange={(e) => setSub({ stroke: e.target.value })} />
            </label>
          </div>

          <div className="scenic-player__slider-row">
            <span>Font Size</span><em>{subStyle.size}%</em>
          </div>
          <input className="scenic-player__range" type="range" min="60" max="220" step="10" value={subStyle.size} onChange={(e) => setSub({ size: Number(e.target.value) })} />

          <div className="scenic-player__slider-row">
            <span>Stroke Width</span><em>{subStyle.strokeWidth}px</em>
          </div>
          <input className="scenic-player__range" type="range" min="0" max="6" step="1" value={subStyle.strokeWidth} onChange={(e) => setSub({ strokeWidth: Number(e.target.value) })} />

          <div className="scenic-player__slider-row">
            <span>Background</span><em>{subStyle.background}%</em>
          </div>
          <input className="scenic-player__range" type="range" min="0" max="100" step="5" value={subStyle.background} onChange={(e) => setSub({ background: Number(e.target.value) })} />

          <div className="scenic-player__slider-row">
            <span>Position</span><em>{subStyle.position}%</em>
          </div>
          <input className="scenic-player__range" type="range" min="0" max="50" step="2" value={subStyle.position} onChange={(e) => setSub({ position: Number(e.target.value) })} />
        </div>
      )}
    </div>
  );
};

export default Subtitles;
