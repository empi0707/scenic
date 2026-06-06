import { useState, useEffect, useCallback } from "react";
import "./VideoPlayer.scss";
import VideoPlayerModal from "../../../components/video-player-modal/VideoPlayerModal";
import useDownloadAvailability from "../../../hooks/useDownloadAvailability";

const serverKey = (id) => `scenic:movie-server:${id}`;

const readSavedServer = (id) => {
  if (!id || typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(serverKey(id));
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
};

const VideoPlayer = ({ id, title, shouldOpenPlayer, onPlayerOpen }) => {
  const [selectedServer, setSelectedServer] = useState(() => readSavedServer(id));
  const [serverUrl, setServerUrl] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const downloadAvailable = useDownloadAvailability("movie", id);

  const handleServerClick = (index) => {
    setSelectedServer(index);
    try {
      if (id) localStorage.setItem(serverKey(id), String(index));
    } catch {
      /* ignore */
    }
    switch (index) {
      case 0:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER1}${id}`);
        break;
      case 1:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER2}${id}`);
        break;
      case 2:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER3}${id}`);
        break;
      case 3:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER4}${id}?autoplay=true&colour=6366f1`);
        break;
      case 4:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER5}${id}`);
        break;
      case 5:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER6}${id}`);
        break;
      case 6:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER7}${id}`);
        break;
      case 7:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER8}${id}`);
        break;
      case 8:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER9}${id}`);
        break;
      case 9:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER10}${id}?autoplay=true`);
        break;
      case 10:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER11}${id}?theme=6366f1&startAt=15`);
        break;
      case 11:
        setServerUrl(`${process.env.REACT_APP_MOVIE_SERVER12}${id}`);
        break;
      default:
        break;
    }
  };

  const handlePlayButtonClick = useCallback(() => {
    // Resume on the same server the user last picked for this title.
    const idx = readSavedServer(id);
    const serverVar =
      process.env[`REACT_APP_MOVIE_SERVER${idx + 1}`] ||
      process.env.REACT_APP_MOVIE_SERVER1;
    setServerUrl(`${serverVar}${id}`);
    setSelectedServer(idx);
    setIsModalOpen(true);
  }, [id]);

  useEffect(() => {
    if (shouldOpenPlayer) {
      handlePlayButtonClick();
      if (onPlayerOpen) {
        onPlayerOpen();
      }
    }
  }, [shouldOpenPlayer, handlePlayButtonClick, onPlayerOpen]);

  return (
    <VideoPlayerModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      serverUrl={serverUrl}
      title={title}
      onServerChange={handleServerClick}
      selectedServer={selectedServer}
      hasPrevious={false}
      hasNext={false}
      download={{ mediaType: "movie", id, title, available: downloadAvailable }}
    />
  );
};

export default VideoPlayer;
