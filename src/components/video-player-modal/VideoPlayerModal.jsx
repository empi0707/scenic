import React, { useState, useEffect } from "react";
import "./VideoPlayerModal.scss";
import { servers } from "../../constants/constants";
import DownloadButton from "../download-button/DownloadButton";

const VideoPlayerModal = ({
  isOpen,
  onClose,
  serverUrl,
  title,
  subtitle,
  onServerChange,
  selectedServer,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  download,
  mirrorCount = 0,
  mirrorIndex = 1,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [serverTimedOut, setServerTimedOut] = useState(false);

  const switchMirror = () => {
    setSpinning(true);
    onServerChange(selectedServer);
    setTimeout(() => setSpinning(false), 550);
  };

  useEffect(() => {
    setIframeLoaded(false);
    setServerTimedOut(false);
  }, [serverUrl]);

  // If the server never finishes loading, assume it's down and prompt a switch.
  useEffect(() => {
    if (!serverUrl || iframeLoaded) return;
    const timer = setTimeout(() => setServerTimedOut(true), 22000);
    return () => clearTimeout(timer);
  }, [serverUrl, iframeLoaded]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      // Clear the inline override (not "unset", which resolves to `visible` and
      // clobbers the stylesheet's `overflow-x: hidden`, letting the fixed header
      // stretch past the viewport and pushing the search button off-screen).
      document.body.style.overflow = "";
      setDropdownOpen(false); // Close dropdown when modal closes
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="video-modal-backdrop" onClick={handleBackdropClick}>
      <div className="video-modal-container">
        <div className="video-modal-header">
          <div className="video-modal-title-section">
            <div className="title-with-nav">
              {hasPrevious && onPrevious && (
                <button className="nav-button" onClick={onPrevious}>
                  <i className="bx bx-chevron-left"></i>
                </button>
              )}
              <div className="title-wrapper">
                <h2 className="video-modal-title">{title}</h2>
                {subtitle && <p className="video-modal-subtitle">{subtitle}</p>}
              </div>
              {hasNext && onNext && (
                <button className="nav-button" onClick={onNext}>
                  <i className="bx bx-chevron-right"></i>
                </button>
              )}
            </div>
          </div>

          <div className="video-modal-controls">
            {download && download.id && (
              <DownloadButton
                mediaType={download.mediaType}
                id={download.id}
                title={download.title}
                season={download.season}
                episode={download.episode}
                available={download.available}
                onDownloaded={onClose}
              />
            )}
            {mirrorCount > 1 && (
              <button
                className={`mirror-switch${spinning ? " is-spinning" : ""}`}
                onClick={switchMirror}
                title="Try another source"
              >
                <i className="bx bx-revision"></i>
                <span className="mirror-switch__label">Try another source</span>
                <span className="mirror-switch__count">
                  {mirrorIndex}/{mirrorCount}
                </span>
              </button>
            )}
            <span className="server-hint">
              {mirrorCount > 1
                ? "If none load, switch server →"
                : "Video not loading? Try changing server →"}
            </span>
            <div className="server-dropdown">
              <button
                className="server-dropdown-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <i className="bx bx-server"></i>
                <span>{servers[selectedServer] || "Select Server"}</span>
                <i
                  className={`bx bx-chevron-down ${dropdownOpen ? "rotate" : ""}`}
                ></i>
              </button>

              {dropdownOpen && (
                <div className="server-dropdown-menu">
                  {servers.map((server, index) => (
                    <div
                      key={index}
                      className={`server-option ${
                        selectedServer === index ? "active" : ""
                      }`}
                      onClick={() => {
                        onServerChange(index);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{server}</span>
                      {selectedServer === index && (
                        <i className="bx bx-check"></i>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="close-button" onClick={onClose}>
              <i className="bx bx-x"></i>
            </button>
          </div>

          {mirrorCount > 1 ? (
            <div className="server-hint-mobile server-hint-mobile--stack">
              <button
                type="button"
                className={`mirror-chip${spinning ? " is-spinning" : ""}`}
                onClick={switchMirror}
              >
                <i className="bx bx-revision"></i>
                Try another source ({mirrorIndex}/{mirrorCount})
              </button>
              <span>If none load, tap the "Server" button to switch</span>
            </div>
          ) : (
            <span className="server-hint-mobile">
              Not loading? Tap the "Server" button to switch
            </span>
          )}
        </div>

        <div className="video-modal-player">
          {serverUrl && (
            <iframe
              src={serverUrl}
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={title}
              onLoad={() => setIframeLoaded(true)}
            />
          )}
          {serverUrl && !iframeLoaded && serverTimedOut ? (
            <div className="video-modal-timeout">
              <i className="bx bx-error-circle"></i>
              <p>This server is taking too long to respond. It might be down right now, so try another one.</p>
              <button
                className="video-modal-timeout__action"
                onClick={() => setDropdownOpen(true)}
              >
                Try another source
              </button>
            </div>
          ) : (
            (!serverUrl || !iframeLoaded) && (
              <div className="video-modal-loader skeleton" aria-hidden="true">
                <i className="bx bx-loader-alt bx-spin"></i>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
