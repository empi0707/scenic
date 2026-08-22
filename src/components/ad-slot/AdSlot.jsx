import React, { useEffect, useRef } from "react";
import "./ad-slot.scss";

// Re-parses a chunk of ad markup into real nodes and appends it to `container`.
// insertAdjacentHTML() drops any <script> tags without running them, so each
// one is rebuilt via createElement and swapped in — that's what actually
// executes it.
function appendMarkup(container, html) {
  if (!html) return;
  container.insertAdjacentHTML("beforeend", html);
  container.querySelectorAll("script").forEach((old) => {
    const fresh = document.createElement("script");
    Array.from(old.attributes).forEach((attr) =>
      fresh.setAttribute(attr.name, attr.value)
    );
    fresh.text = old.text;
    old.replaceWith(fresh);
  });
}

// Renders one ad unit from `config` (see src/config/adsConfig.js) at the spot
// it's mounted — drop <AdSlot config={SOME_AD} /> anywhere a page wants an
// ad to appear. Ported from movieace's src/components/ads/AdSlot.vue.
const AdSlot = ({ config }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || !config?.key) return undefined;

    const container = mountRef.current;
    const { key, width, height, scriptSrc } = config;

    window.atOptions = { key, format: "iframe", height, width, params: {} };

    // invoke.js drops its markup via document.write(), which the browser
    // only honors while the document is still parsing — not for a <script>
    // appended after mount. So instead of letting that call get silently
    // dropped, we shim document.write() for the duration of the script's
    // execution, capture what it would have written, and splice that markup
    // straight into `container` ourselves. This keeps the ad inline in the
    // real page (no wrapper iframe to clip/mismatch size).
    //
    // Only one AdSlot should load at a time per page — the shim is a single
    // global and concurrent loads would race on it.
    let buffer = "";
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    document.write = (...text) => {
      buffer += text.join("");
    };
    document.writeln = (...text) => {
      buffer += text.join("") + "\n";
    };

    const finish = () => {
      document.write = originalWrite;
      document.writeln = originalWriteln;
      appendMarkup(container, buffer);
    };

    const scriptEl = document.createElement("script");
    scriptEl.src = scriptSrc(key);
    scriptEl.onload = finish;
    scriptEl.onerror = finish;
    container.appendChild(scriptEl);

    return () => {
      scriptEl.remove();
      delete window.atOptions;
    };
  }, [config]);

  if (!config?.key) return null;

  return (
    <div className="ad-slot">
      <span className="ad-slot__label">Advertisement</span>
      <div ref={mountRef} className="ad-slot__frame" />
    </div>
  );
};

export default AdSlot;
