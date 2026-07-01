import { useState, useEffect, useCallback, useRef } from "react";
import "./VideoPlayer.scss";
import VideoPlayerModal from "../../../components/video-player-modal/VideoPlayerModal";
import { server8Domains, AD_FREE_SERVER } from "../../../constants/constants";
import { buildServerUrl } from "../../../utils/serverUrl";
import useDownloadAvailability from "../../../hooks/useDownloadAvailability";

const serverKey = (id) => `scenic:movie-server:${id}`;

const readSavedServer = (id) => {
  if (!id || typeof window === "undefined") return AD_FREE_SERVER;
  try {
    const raw = localStorage.getItem(serverKey(id));
    const n = raw == null ? AD_FREE_SERVER : parseInt(raw, 10);
    return Number.isFinite(n) && n >= AD_FREE_SERVER ? n : AD_FREE_SERVER;
  } catch {
    return AD_FREE_SERVER;
  }
};

const VideoPlayer = ({ id, title, shouldOpenPlayer, onPlayerOpen }) => {
  const [selectedServer, setSelectedServer] = useState(() => readSavedServer(id));
  const [serverUrl, setServerUrl] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mirrorRef = useRef(-1);
  const downloadAvailable = useDownloadAvailability("movie", id);

  const handleServerClick = (index) => {
    setSelectedServer(index);
    try {
      if (id) localStorage.setItem(serverKey(id), String(index));
    } catch {
      /* ignore */
    }
    setServerUrl(
      index === AD_FREE_SERVER
        ? ""
        : buildServerUrl({ mediaType: "movie", index, id, mirrorIndex: mirrorRef.current })
    );
  };

  const handleServerSelect = (index) => {
    if (index === 7 && server8Domains.length) {
      mirrorRef.current = (mirrorRef.current + 1) % server8Domains.length;
    }
    handleServerClick(index);
  };

  const handlePlayButtonClick = useCallback(() => {
    // Resume on the same server the user last picked for this title.
    const idx = readSavedServer(id);
    setServerUrl(
      idx === AD_FREE_SERVER
        ? ""
        : buildServerUrl({ mediaType: "movie", index: idx, id, mirrorIndex: mirrorRef.current })
    );
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
      onServerChange={handleServerSelect}
      selectedServer={selectedServer}
      mirrorCount={selectedServer === 7 ? server8Domains.length : 0}
      mirrorIndex={Math.max(mirrorRef.current, 0) + 1}
      hasPrevious={false}
      hasNext={false}
      streamMedia={{ type: "movie", id }}
      download={{ mediaType: "movie", id, title, available: downloadAvailable }}
    />
  );
};

export default VideoPlayer;
