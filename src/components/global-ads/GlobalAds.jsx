import { useEffect } from "react";
// raw-loader (see package.json devDependencies) — CRA's default webpack
// config explicitly refuses to import .html files from src/ any other way.
// eslint-disable-next-line import/no-webpack-loader-syntax
import adsHtml from "!!raw-loader!../../ads.html";
import { runAdMarkup } from "../../utils/runAdMarkup";

// Mounts src/ads.html — the site's fixed, always-on-screen ad banners
// (top/bottom/left/right/center, ported straight from movieace's
// src/ads.html/vite.config.ts) — once, directly on document.body, so it
// renders on every route without living inside any page's layout. Rendered
// once from App.js, outside <Routes>.
//
// To change which banners appear or their ad-network key, edit
// src/ads.html directly — that's the one file this reads from.
const GlobalAds = () => {
  useEffect(() => {
    if (!adsHtml || !adsHtml.trim()) return undefined;

    const root = document.createElement("div");
    root.id = "scenic-global-ads";
    // innerHTML runs <style> immediately but leaves every <script> inert —
    // runAdMarkup below is what actually executes them.
    root.innerHTML = adsHtml;
    document.body.appendChild(root);

    runAdMarkup(root);

    return () => {
      root.remove();
    };
  }, []);

  return null;
};

export default GlobalAds;
