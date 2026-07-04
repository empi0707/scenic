import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import apiConfig from "../../api/apiConfig";
import Subtitles from "./Subtitles";
import { SUB_DEFAULTS } from "../../constants/constants";
import { strokeCss, hexToRgba, cueLines } from "./subtitleStyle";
import "./scenic-player.scss";


const S = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);

const Ic = {
  play: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.87l11-6.8a1 1 0 0 0 0-1.74l-11-6.8A1 1 0 0 0 8 5.2Z" /></svg>,
  pause: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><rect x="6.5" y="3.5" width="4" height="17" rx="1.4" /><rect x="13.5" y="3.5" width="4" height="17" rx="1.4" /></svg>,
  back10: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <g transform="translate(12 12) scale(0.9) translate(-12 -12)">
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        <text x="12" y="16" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor">10</text>
      </g>
    </svg>
  ),
  fwd10: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <g transform="translate(12 12) scale(0.9) translate(-12 -12)">
        <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
        <text x="12" y="16" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor">10</text>
      </g>
    </svg>
  ),
  volHigh: <S><path d="M3 8.5v7h4l6 5V3.5L7 8.5H3Z" fill="currentColor" stroke="none" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19.5 5.5a9 9 0 0 1 0 13" /></S>,
  volLow: <S><path d="M3 8.5v7h4l6 5V3.5L7 8.5H3Z" fill="currentColor" stroke="none" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></S>,
  volMute: <S><path d="M3 8.5v7h4l6 5V3.5L7 8.5H3Z" fill="currentColor" stroke="none" /><path d="m17 9.5 4 4M21 9.5l-4 4" /></S>,
  cc: <S><rect x="2.5" y="3.5" width="19" height="17" rx="4" /><path d="M10 9.8a2.9 2.9 0 1 0 0 4.4" /><path d="M17 9.8a2.9 2.9 0 1 0 0 4.4" /></S>,
  gear: <S strokeWidth="2.45"><g transform="translate(12 12) scale(0.82) translate(-12 -12)"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></g></S>,
  pip: <S><rect x="2.5" y="3.5" width="19" height="17" rx="3.5" /><rect x="11.5" y="11" width="8" height="6.5" rx="1.5" fill="currentColor" stroke="none" /></S>,
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

const ScenicPlayer = ({ media, title, subtitle, onFatal }) => {
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
  const [extSubs, setExtSubs] = useState([]); // {lang, label, url} from the source
  const [activeSub, setActiveSub] = useState(null); // {key, url, lang, label} | null
  const [cueText, setCueText] = useState(""); // current subtitle text (custom overlay)
  const [subStyle, setSubStyle] = useState(() => {
    try {
      return { ...SUB_DEFAULTS, ...JSON.parse(localStorage.getItem("scenic:substyle") || "{}") };
    } catch {
      return SUB_DEFAULTS;
    }
  });
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(-1);
  const fileRef = useRef(null);

  const [menu, setMenu] = useState(null); // null | 'settings' | 'cc'
  const [isFs, setIsFs] = useState(false);
  const [hover, setHover] = useState(null); // { pct, time } while scrubbing
  const [brightness, setBrightness] = useState(1); // CSS-simulated screen brightness
  const [gesture, setGesture] = useState(null); // { mode, pct } during a touch swipe
  const [backdrop, setBackdrop] = useState(""); // TMDB backdrop shown while not playing
  const [srcIdx, setSrcIdx] = useState(0); // which ordered source to resolve (0 = primary)
  const [switching, setSwitching] = useState(false); // falling back to another source

  // A new title starts from the primary source again.
  useEffect(() => {
    setSrcIdx(0);
    setSwitching(false);
  }, [media?.type, media?.id, media?.season, media?.episode]);

  // Fetch the stream URL from /api/stream, then attach hls.js. On resolve or
  // playback failure, fall through to the next source (`next`) with a loader.
  useEffect(() => {
    if (!media?.id) return undefined;
    let cancelled = false;
    setStatus("loading");
    setStarted(false);

    const params = new URLSearchParams({ type: media.type || "movie", id: String(media.id), src: String(srcIdx) });
    if (media.type === "tv") {
      params.set("season", String(media.season));
      params.set("episode", String(media.episode));
    }

    const video = videoRef.current;
    const nextRef = { current: null };
    let watchdog = null;
    const fallback = () => {
      if (cancelled) return;
      clearTimeout(watchdog);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (nextRef.current != null) {
        setSwitching(true);
        setSrcIdx(nextRef.current);
      } else {
        setErrorMsg("No ad-free source found for this title.");
        setStatus("error");
      }
    };

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

        // Some mirror encodes resolve fine but the browser can't decode them:
        // hls emits non-fatal append errors forever and nothing ever buffers.
        // Watch for "no data appended" and fall through to the next encode.
        let appended = false;
        let appendFails = 0;
        watchdog = setTimeout(() => { if (!cancelled && !appended) fallback(); }, 12000);
        hls.on(Hls.Events.BUFFER_APPENDED, () => { appended = true; clearTimeout(watchdog); });

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          if (cancelled) return;
          setLevels(data.levels || []);
          const at = (hls.audioTracks || []).map((t, i) => ({ id: i, name: t.name || t.lang || `Audio ${i + 1}` }));
          setAudioTracks(at);
          const pref = preferredAudio(hls.audioTracks || []);
          if (pref >= 0) { hls.audioTrack = pref; setCurrentAudio(pref); }
          else setCurrentAudio(hls.audioTrack);
          setStatus("ready");
          setSwitching(false);
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : d.level);
          setActiveHeight(hls.levels?.[d.level]?.height || 0);
        });
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, d) => setCurrentAudio(d.id));

        hls.on(Hls.Events.ERROR, (_e, data) => {
          const D = Hls.ErrorDetails;
          // Undecodable encode: repeated append errors before any data buffered.
          if (!appended && (data.details === D.BUFFER_APPEND_ERROR || data.details === D.BUFFER_APPENDING_ERROR)) {
            if (++appendFails >= 3 && nextRef.current != null) { fallback(); return; }
          }
          if (!data.fatal) return;
          const manifestDead =
            data.details === D.MANIFEST_LOAD_ERROR ||
            data.details === D.MANIFEST_LOAD_TIMEOUT ||
            data.details === D.MANIFEST_PARSING_ERROR;
          // Unreachable/broken manifest with an encode left → try the next one.
          if (manifestDead && nextRef.current != null) { fallback(); return; }
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else if (nextRef.current != null) { fallback(); }
          else { setErrorMsg("Playback failed for this title."); setStatus("error"); }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS.
        video.src = url;
        video.addEventListener("loadedmetadata", () => { setStatus("ready"); setSwitching(false); video.play().catch(() => {}); }, { once: true });
      } else {
        setErrorMsg("Your browser can't play this stream."); setStatus("error");
      }
    };

    fetch(`/api/stream?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        nextRef.current = data?.next ?? null;
        if (!data?.url) { fallback(); return; }
        setExtSubs(Array.isArray(data.subtitles) ? data.subtitles : []);
        attach(data.url);
      })
      .catch(() => {
        if (cancelled) return;
        fallback();
      });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [media?.type, media?.id, media?.season, media?.episode, srcIdx]);

  // TMDB backdrop, shown behind the video while loading/buffering/paused.
  useEffect(() => {
    if (!media?.id) return undefined;
    let alive = true;
    setBackdrop("");
    const cate = media.type === "tv" ? "tv" : "movie";
    const key = process.env.REACT_APP_API_KEY;
    fetch(`https://api.themoviedb.org/3/${cate}/${media.id}?api_key=${key}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.backdrop_path) setBackdrop(apiConfig.w1280Image(d.backdrop_path));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [media?.type, media?.id]);

  useEffect(() => { setActiveSub(null); }, [media?.type, media?.id, media?.season, media?.episode]);
  useEffect(() => {
    try { localStorage.setItem("scenic:substyle", JSON.stringify(subStyle)); } catch { /* ignore */ }
  }, [subStyle]);

  // We render subtitles ourselves (::cue is styled unreliably by browsers), so
  // keep the chosen track "hidden" (still fires cues) and mirror its text.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) { setCueText(""); return undefined; }
    let track = null;
    const attach = () => {
      Array.from(v.textTracks).forEach((t) => { t.mode = "disabled"; });
      track = activeSub ? Array.from(v.textTracks).find((t) => t.label === activeSub.label) : null;
      if (track) {
        track.mode = "hidden";
        track.addEventListener("cuechange", onCue);
        onCue();
      } else {
        setCueText("");
      }
    };
    const onCue = () => {
      const cues = track ? Array.from(track.activeCues || []) : [];
      setCueText(cues.map((c) => c.text).join("\n"));
    };
    const id = setTimeout(attach, 0);
    return () => {
      clearTimeout(id);
      if (track) track.removeEventListener("cuechange", onCue);
    };
  }, [activeSub]);

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
  // Only active in fullscreen — avoids hijacking page scroll in the modal.
  const onTouchStart = (e) => {
    if (!isFs || e.touches.length !== 1) return;
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
  const selectSub = (sub) => { setActiveSub(sub); setMenu(null); };
  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let text = String(reader.result || "");
      if (!/^﻿?WEBVTT/.test(text.trimStart())) {
        text = "WEBVTT\n\n" + text.replace(/\r+/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      }
      const url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
      selectSub({ key: `up-${file.name}`, url, lang: "und", label: `Uploaded · ${file.name}` });
    };
    reader.readAsText(file);
    e.target.value = "";
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
  const paused = started && !playing && !buffering && status === "ready";
  const showBackdrop = !!backdrop && (status === "loading" || buffering || !started);
  const showNowWatching = status === "ready" && !buffering && (!started || paused);
  const epTag =
    media?.type === "tv" && media?.season != null
      ? `${title} · S${media.season}:E${media.episode}`
      : title;

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
        poster={backdrop || undefined}
        style={{ filter: `brightness(${brightness})` }}
      >
        {activeSub && (
          <track
            key={activeSub.key}
            kind="subtitles"
            src={activeSub.url}
            srcLang={activeSub.lang}
            label={activeSub.label}
          />
        )}
      </video>

      {/* Custom subtitle overlay — full control, no ::cue quirks */}
      {cueText && (
        <div className="scenic-player__cue" style={{ bottom: `${subStyle.position}%`, fontSize: `${(4.6 * subStyle.size) / 100}cqh` }}>
          {cueLines(cueText).map((line, i) => (
            <span
              key={i}
              className="scenic-player__cue-line"
              style={{
                fontFamily: `'${subStyle.family}', sans-serif`,
                fontWeight: subStyle.weight,
                color: subStyle.color,
                background: hexToRgba("#000000", subStyle.background / 100),
                textShadow: strokeCss(subStyle.stroke, subStyle.strokeWidth),
              }}
            >
              {line}
            </span>
          ))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".srt,.vtt,text/plain"
        style={{ display: "none" }}
        onChange={onUpload}
      />

      {/* Backdrop behind the video while there's no frame (loading/buffering) */}
      {showBackdrop && (
        <div
          className="scenic-player__backdrop"
          style={{ backgroundImage: `url(${backdrop})` }}
          aria-hidden="true"
        />
      )}

      {/* Netflix-style dim over the paused frame */}
      {paused && <div className="scenic-player__pause-dim" aria-hidden="true" />}

      {/* "You're Watching" card — before start and while paused */}
      {showNowWatching && (
        <div className={`scenic-player__nowwatching${paused ? " is-paused" : ""}`}>
          <span className="scenic-player__nw-eyebrow">You're watching</span>
          <strong>{title}</strong>
          {subtitle && <p className="scenic-player__nw-sub">{subtitle}</p>}
        </div>
      )}

      {/* Netflix-style "Paused" tag, bottom-right */}
      {paused && <span className="scenic-player__paused-tag">Paused</span>}

      {/* Title over the backdrop while the stream is loading */}
      {status === "loading" && (
        <div className="scenic-player__nowwatching">
          <span className="scenic-player__nw-eyebrow">Now Playing</span>
          <strong>{epTag}</strong>
        </div>
      )}

      {/* Loading / buffering */}
      {(status === "loading" || buffering) && status !== "error" && (
        <div className="scenic-player__spinner">
          {Ic.spinner}
          {switching && <span className="scenic-player__spinner-note">Trying another source…</span>}
        </div>
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
        <div className={`scenic-player__gesture scenic-player__gesture--${gesture.mode}`}>
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
              <Subtitles
                media={media}
                extSubs={extSubs}
                activeSub={activeSub}
                onSelect={selectSub}
                onOff={() => setActiveSub(null)}
                onUploadClick={() => fileRef.current && fileRef.current.click()}
                menu={menu}
                setMenu={setMenu}
                ccIcon={Ic.cc}
                subStyle={subStyle}
                setSubStyle={setSubStyle}
              />

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
