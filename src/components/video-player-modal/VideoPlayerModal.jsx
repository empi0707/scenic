import React, { useState, useEffect } from "react";
import "./VideoPlayerModal.scss";
import { servers } from "../../constants/constants";

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
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setDropdownOpen(false); // Close dropdown when modal closes
    }

    return () => {
      document.body.style.overflow = "unset";
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
            <span className="server-hint">Video not loading? Try changing server →</span>
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
        </div>

        <div className="video-modal-player">
          {serverUrl ? (
            <iframe
              src={serverUrl}
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={title}
            />
          ) : (
            <div className="no-video-message">
              Loading video...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
