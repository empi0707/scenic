import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  fetchDownloads,
  buildDownloadFilename,
  buildDownloadUrl,
} from "../../utils/download";
import "./download-button.scss";

const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const triggerDownload = (url, filename) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename; // ignored cross-origin; the URL's n= drives the name
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const DownloadButton = ({
  mediaType,
  id,
  title,
  season,
  episode,
  available,
  onDownloaded,
}) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);

  const start = (opt) => {
    triggerDownload(opt.url, opt.filename);
    toast.success("Starting download…");
    setOptions(null);
    if (onDownloaded) onDownloaded();
  };

  const handleClick = async () => {
    if (loading || !id) return;
    if (options) {
      setOptions(null);
      return;
    }
    setLoading(true);
    try {
      const downloads = await fetchDownloads(mediaType, id, season, episode);
      if (!downloads.length) {
        toast.error("No download available for this title yet.");
        return;
      }
      const prepared = downloads.map((d) => {
        const filename = buildDownloadFilename({
          title,
          mediaType,
          season,
          episode,
          download: d,
        });
        return {
          filename,
          url: buildDownloadUrl(d.url, filename),
          label: d.quality || d.format || "Download",
        };
      });
      if (prepared.length === 1) start(prepared[0]);
      else setOptions(prepared);
    } catch (e) {
      toast.error(e.message || "Download failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!available) return null;

  return (
    <div className="download-control">
      <button
        type="button"
        className="download-btn"
        onClick={handleClick}
        disabled={loading}
        aria-label="Download"
        title="Download"
      >
        {loading ? (
          <i className="bx bx-loader-alt bx-spin" />
        ) : (
          <DownloadIcon />
        )}
      </button>

      {options && (
        <div className="download-menu" role="menu">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="download-menu__item"
              onClick={() => start(opt)}
            >
              <i className="bx bx-download" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DownloadButton;
