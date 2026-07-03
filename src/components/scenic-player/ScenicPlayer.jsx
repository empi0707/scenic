import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import "./scenic-player.scss";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const S = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);

const Ic = {
  play: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" /></svg>,
  pause: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.4" /><rect x="14" y="4.5" width="4" height="15" rx="1.4" /></svg>,
  back10: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
      <text x="12" y="16" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor">10</text>
    </svg>
  ),
  fwd10: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
      <text x="12" y="16" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor">10</text>
    </svg>
  ),
  volHigh: <S><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" /><path d="M16 8.5a5 5 0 0 1 0 7" /><path d="M19 5.5a9 9 0 0 1 0 13" /></S>,
  volLow: <S><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" /><path d="M16 8.5a5 5 0 0 1 0 7" /></S>,
  volMute: <S><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" /><path d="m17 9 4 4M21 9l-4 4" /></S>,
  cc: <S><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M10 10.5a2.6 2.6 0 1 0 0 3" /><path d="M17.5 10.5a2.6 2.6 0 1 0 0 3" /></S>,
  gear: <S><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></S>,
  pip: <S><rect x="2.5" y="4.5" width="19" height="15" rx="3" /><rect x="12" y="11" width="7.5" height="6" rx="1.5" fill="currentColor" stroke="none" /></S>,
  full: <S><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" /></S>,
  exit: <S><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></S>,
  alert: <S><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></S>,
  sun: <S><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>,
  spinner: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className="scenic-player__spin" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.22)" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
};

const fmtTime = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

// Prefer an English audio track when the source defaults to another language.
const preferredAudio = (tracks) => {
  const en = tracks.findIndex((t) => /^en/i.test(t.lang || t.name || ""));
  return en >= 0 ? en : -1;
};

const ScenicPlayer = ({ media, title, onFatal }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimer = useRef(null);
  const volRef = useRef(null);
  const touchRef = useRef(null);
  const swipeConsumed = useRef(false);
  const gestureTimer = useRef(null);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [started, setStarted] = useState(false);

  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [activeHeight, setActiveHeight] = useState(0); // resolution actually playing
  const [subtitles, setSubtitles] = useState([]); // {id, name} — in-manifest (hls.js)
  const [extSubs, setExtSubs] = useState([]); // {lang, label, url} — external <track>
  const [currentSub, setCurrentSub] = useState(-1); // -1 = off
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(-1);
  const [rate, setRate] = useState(1);

  const [menu, setMenu] = useState(null); // null | 'settings' | 'cc'
  const [isFs, setIsFs] = useState(false);
  const [hover, setHover] = useState(null); // { pct, time } while scrubbing
  const [brightness, setBrightness] = useState(1); // CSS-simulated screen brightness
  const [gesture, setGesture] = useState(null); // { mode, pct } during a touch swipe

  // Fetch the stream URL from /api/stream, then attach hls.js.
  useEffect(() => {
    if (!media?.id) return undefined;
    let cancelled = false;
    setStatus("loading");
    setStarted(false);

    const params = new URLSearchParams({ type: media.type || "movie", id: String(media.id) });
    if (media.type === "tv") {
      params.set("season", String(media.season));
      params.set("episode", String(media.episode));
    }

    const video = videoRef.current;

    const attach = (url) => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startFragPrefetch: true,
          maxBufferLength: 30,
          backBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          if (cancelled) return;
          setLevels(data.levels || []);
          const at = (hls.audioTracks || []).map((t, i) => ({ id: i, name: t.name || t.lang || `Audio ${i + 1}` }));
          setAudioTracks(at);
          const pref = preferredAudio(hls.audioTracks || []);
          if (pref >= 0) { hls.audioTrack = pref; setCurrentAudio(pref); }
          else setCurrentAudio(hls.audioTrack);
          setStatus("ready");
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
          if (cancelled) return;
          setSubtitles((data.subtitleTracks || []).map((t, i) => ({
            id: i, name: t.name || t.lang || `Track ${i + 1}`,
          })));
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : d.level);
          setActiveHeight(hls.levels?.[d.level]?.height || 0);
        });
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, d) => setCurrentAudio(d.id));

        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else { setErrorMsg("Playback failed for this title."); setStatus("error"); }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS.
        video.src = url;
        video.addEventListener("loadedmetadata", () => { setStatus("ready"); video.play().catch(() => {}); }, { once: true });
      } else {
        setErrorMsg("Your browser can't play this stream."); setStatus("error");
      }
    };

    fetch(`/api/stream?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.url) {
          setErrorMsg("No ad-free source found for this title.");
          setStatus("error");
          return;
        }
        setExtSubs(Array.isArray(data.subtitles) ? data.subtitles : []);
        attach(data.url);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMsg("Couldn't reach the ad-free source.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [media?.type, media?.id, media?.season, media?.episode]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => {
      setCurrent(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => { setPlaying(true); setStarted(true); };
    const onPause = () => setPlaying(false);
    const onVol = () => { setMuted(v.muted); setVolume(v.volume); };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
    };
  }, []);

  useEffect(() => {
    if (status === "error" && onFatal) onFatal(errorMsg);
  }, [status, errorMsg, onFatal]);

  useEffect(() => {
    const onFs = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFs(fs);
      if (!fs) {
        try {
          window.screen?.orientation?.unlock?.();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = useCallback((delta) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  }, []);

  const seekTo = (e) => {
    const v = videoRef.current;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    if (v && v.duration) v.currentTime = pct * v.duration;
  };

  const onScrubHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    setHover({ pct, time: pct * (duration || 0) });
  };

  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted; };

  const setVolFromX = (clientX) => {
    const el = volRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const r = el.getBoundingClientRect();
    const pct = Math.min(Math.max(0, (clientX - r.left) / r.width), 1);
    v.volume = pct;
    v.muted = pct === 0;
  };

  const onVolPointerDown = (e) => {
    e.preventDefault();
    setVolFromX(e.clientX);
    const move = (ev) => setVolFromX(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Mobile: vertical swipe on the left half = volume, right half = brightness.
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    // Ignore swipes that start on the bottom control strip.
    if (t.clientY > rect.bottom - 72) return;
    const isRight = t.clientX - rect.left > rect.width / 2;
    touchRef.current = {
      startY: t.clientY,
      height: rect.height,
      mode: isRight ? "brightness" : "volume",
      startVal: isRight ? brightness : muted ? 0 : volume,
      moved: false,
    };
  };

  const onTouchMove = (e) => {
    const st = touchRef.current;
    if (!st || e.touches.length !== 1) return;
    const dy = st.startY - e.touches[0].clientY;
    if (!st.moved && Math.abs(dy) < 10) return;
    st.moved = true;
    const min = st.mode === "brightness" ? 0.2 : 0;
    const val = Math.min(1, Math.max(min, st.startVal + dy / (st.height * 0.6)));
    if (st.mode === "volume") {
      const v = videoRef.current;
      if (v) { v.volume = val; v.muted = val === 0; }
    } else {
      setBrightness(val);
    }
    setGesture({ mode: st.mode, pct: Math.round(val * 100) });
  };

  const onTouchEnd = () => {
    if (touchRef.current?.moved) swipeConsumed.current = true;
    touchRef.current = null;
    clearTimeout(gestureTimer.current);
    gestureTimer.current = setTimeout(() => setGesture(null), 500);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current?.requestFullscreen?.();
        // Rotate to landscape on mobile; unsupported on desktop/iOS (ignored).
        try {
          await window.screen?.orientation?.lock?.("landscape");
        } catch {
          /* orientation lock not available */
        }
      }
    } catch {
      /* fullscreen not available */
    }
  };

  const togglePip = async () => {
    const v = videoRef.current;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v?.requestPictureInPicture) await v.requestPictureInPicture();
    } catch { /* ignore */ }
  };

  const pickQuality = (lvl) => {
    if (hlsRef.current) hlsRef.current.currentLevel = lvl;
    setCurrentLevel(lvl);
    if (lvl >= 0 && levels[lvl]) setActiveHeight(levels[lvl].height);
    setMenu(null);
  };
  const pickAudio = (id) => {
    if (hlsRef.current) hlsRef.current.audioTrack = id;
    setCurrentAudio(id);
    setMenu(null);
  };
  // External subs are native <track>s toggled by textTrack mode; in-manifest
  // subs go through hls.js. Ids >= 1000 are external.
  const showNativeSub = (label) => {
    const v = videoRef.current;
    if (!v) return;
    Array.from(v.textTracks).forEach((t) => {
      t.mode = label != null && t.label === label ? "showing" : "hidden";
    });
  };
  const pickSub = (id) => {
    const ext = id >= 1000 ? extSubs[id - 1000] : null;
    if (ext) {
      if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
      showNativeSub(ext.label || ext.lang || `Subtitle ${id - 999}`);
    } else {
      if (hlsRef.current) hlsRef.current.subtitleTrack = id;
      showNativeSub(null);
    }
    setCurrentSub(id);
    setMenu(null);
  };
  const pickRate = (r) => {
    if (videoRef.current) videoRef.current.playbackRate = r;
    setRate(r);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": seekBy(-10); break;
        case "ArrowRight": seekBy(10); break;
        case "f": toggleFullscreen(); break;
        case "m": toggleMute(); break;
        default: return;
      }
      showControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, showControls]);

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;
  const qualityTag = activeHeight >= 2160 ? "4K" : activeHeight >= 720 ? "HD" : "";
  const allSubs = [
    ...subtitles,
    ...extSubs.map((s, i) => ({ id: 1000 + i, name: s.label || s.lang || `Subtitle ${i + 1}` })),
  ];

  return (
    <div
      ref={containerRef}
      className={`scenic-player${controlsVisible || !playing ? " controls-on" : ""}`}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        if (swipeConsumed.current) { swipeConsumed.current = false; return; }
        if (e.target === e.currentTarget || e.target.tagName === "VIDEO") togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="scenic-player__video"
        playsInline
        crossOrigin="anonymous"
        style={{ filter: `brightness(${brightness})` }}
      >
        {extSubs.map((s, i) => (
          <track
            key={`ext-${i}`}
            kind="subtitles"
            src={s.url}
            srcLang={s.lang || "en"}
            label={s.label || s.lang || `Subtitle ${i + 1}`}
          />
        ))}
      </video>

      {/* Center title card before playback starts */}
      {!started && status === "ready" && (
        <div className="scenic-player__nowwatching">
          <span>You're Watching</span>
          <strong>{title}</strong>
        </div>
      )}

      {/* Loading / buffering */}
      {(status === "loading" || buffering) && status !== "error" && (
        <div className="scenic-player__spinner">{Ic.spinner}</div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="scenic-player__error">
          {Ic.alert}
          <p>{errorMsg}</p>
          <span>Switching to another server...</span>
        </div>
      )}

      {/* Touch gesture feedback (volume / brightness) */}
      {gesture && (
        <div className="scenic-player__gesture">
          {gesture.mode === "brightness"
            ? Ic.sun
            : gesture.pct === 0 ? Ic.volMute : Ic.volHigh}
          <div className="scenic-player__gesture-bar">
            <span style={{ height: `${gesture.pct}%` }} />
          </div>
          <span className="scenic-player__gesture-val">{gesture.pct}%</span>
        </div>
      )}

      {/* Big center play button when paused */}
      {status === "ready" && !playing && !buffering && (
        <button className="scenic-player__bigplay" onClick={togglePlay} aria-label="Play">
          {Ic.play}
        </button>
      )}

      {/* Bottom controls */}
      {status === "ready" && (
        <div className="scenic-player__controls" onClick={(e) => e.stopPropagation()}>
          <div
            className="scenic-player__scrub"
            onClick={seekTo}
            onMouseMove={onScrubHover}
            onMouseLeave={() => setHover(null)}
          >
            {hover && (
              <span className="scenic-player__scrub-tip" style={{ left: `${hover.pct * 100}%` }}>
                {fmtTime(hover.time)}
              </span>
            )}
            {hover && <div className="scenic-player__scrub-hover" style={{ width: `${hover.pct * 100}%` }} />}
            <div className="scenic-player__scrub-buffered" style={{ width: `${bufPct}%` }} />
            <div className="scenic-player__scrub-played" style={{ width: `${pct}%` }}>
              <span className="scenic-player__scrub-knob" />
            </div>
          </div>

          <div className="scenic-player__bar">
            <div className="scenic-player__group scenic-player__group--left">
              <button className="scenic-player__play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing ? Ic.pause : Ic.play}
              </button>
              <button onClick={() => seekBy(-10)} aria-label="Back 10 seconds">{Ic.back10}</button>
              <button onClick={() => seekBy(10)} aria-label="Forward 10 seconds">{Ic.fwd10}</button>

              <div className="scenic-player__volume">
                <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                  {muted || volume === 0 ? Ic.volMute : volume < 0.5 ? Ic.volLow : Ic.volHigh}
                </button>
                <div
                  ref={volRef}
                  className="scenic-player__vol"
                  onPointerDown={onVolPointerDown}
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                >
                  <div className="scenic-player__vol-fill" style={{ width: `${(muted ? 0 : volume) * 100}%` }}>
                    <span className="scenic-player__vol-knob" />
                  </div>
                </div>
              </div>

              <span className="scenic-player__time">
                {fmtTime(current)} <em>/</em> {fmtTime(duration)}
              </span>
            </div>

            <div className="scenic-player__group scenic-player__group--right">
              {allSubs.length > 0 && (
                <div className="scenic-player__menuwrap">
                  <button className={currentSub >= 0 ? "is-active" : ""} onClick={() => setMenu(menu === "cc" ? null : "cc")} aria-label="Subtitles">
                    {Ic.cc}
                  </button>
                  {menu === "cc" && (
                    <div className="scenic-player__menu">
                      <div className="scenic-player__menu-title">Subtitles</div>
                      <button className={currentSub === -1 ? "sel" : ""} onClick={() => pickSub(-1)}>Off</button>
                      {allSubs.map((s) => (
                        <button key={s.id} className={currentSub === s.id ? "sel" : ""} onClick={() => pickSub(s.id)}>{s.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="scenic-player__menuwrap">
                <button onClick={() => setMenu(menu === "settings" ? null : "settings")} aria-label="Settings">
                  {Ic.gear}
                  {qualityTag && <span className="scenic-player__hd">{qualityTag}</span>}
                </button>
                {menu === "settings" && (
                  <div className="scenic-player__menu scenic-player__menu--wide">
                    <div className="scenic-player__menu-title">Quality</div>
                    <button className={currentLevel === -1 ? "sel" : ""} onClick={() => pickQuality(-1)}>Auto</button>
                    {levels.map((l, i) => (
                      <button key={i} className={currentLevel === i ? "sel" : ""} onClick={() => pickQuality(i)}>{l.height}p</button>
                    ))}
                    {audioTracks.length > 1 && (
                      <>
                        <div className="scenic-player__menu-title">Audio</div>
                        {audioTracks.map((a) => (
                          <button key={a.id} className={currentAudio === a.id ? "sel" : ""} onClick={() => pickAudio(a.id)}>{a.name}</button>
                        ))}
                      </>
                    )}
                    <div className="scenic-player__menu-title">Speed</div>
                    <div className="scenic-player__speeds">
                      {SPEEDS.map((r) => (
                        <button key={r} className={rate === r ? "sel" : ""} onClick={() => pickRate(r)}>{r === 1 ? "Normal" : `${r}x`}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {document.pictureInPictureEnabled && (
                <button onClick={togglePip} aria-label="Picture in picture">{Ic.pip}</button>
              )}
              <button onClick={toggleFullscreen} aria-label="Fullscreen">
                {isFs ? Ic.exit : Ic.full}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenicPlayer;
