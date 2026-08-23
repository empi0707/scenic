// Executes third-party ad markup (inline <script>, plus external <script src>
// tags that rely on document.write() — most ad-network "invoke.js" loaders
// do) after it's already been inserted into the live DOM via innerHTML /
// insertAdjacentHTML. Browsers only honor document.write() while the
// document is still parsing, and innerHTML never runs <script> tags at all —
// both would otherwise silently drop this markup.
//
// Runs every <script> found under `root`, in document order, one at a time:
// external scripts wait for load/error before the next one starts (so a
// global like `atOptions` set by one script isn't clobbered before the
// script that reads it has run), and whatever a script wrote via
// document.write() is spliced in right after that script — inside its own
// parent, not some unrelated container — matching where a real, statically
// parsed <script> tag would have dropped it.

function runOneScript(scriptEl) {
  return new Promise((resolve) => {
    let buffer = "";
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    document.write = (...text) => {
      buffer += text.join("");
    };
    document.writeln = (...text) => {
      buffer += text.join("") + "\n";
    };

    const restore = () => {
      document.write = originalWrite;
      document.writeln = originalWriteln;
    };

    const flushAndResolve = (fresh) => {
      restore();
      if (buffer) fresh.insertAdjacentHTML("afterend", buffer);
      resolve();
    };

    const fresh = document.createElement("script");
    Array.from(scriptEl.attributes).forEach((attr) =>
      fresh.setAttribute(attr.name, attr.value)
    );

    if (!scriptEl.src) {
      fresh.text = scriptEl.text;
      scriptEl.replaceWith(fresh);
      flushAndResolve(fresh);
      return;
    }

    fresh.onload = () => flushAndResolve(fresh);
    fresh.onerror = () => flushAndResolve(fresh);
    scriptEl.replaceWith(fresh);
  });
}

export async function runAdMarkup(root) {
  const scripts = Array.from(root.querySelectorAll("script"));
  for (const scriptEl of scripts) {
    // Sequential on purpose — see the file header.
    // eslint-disable-next-line no-await-in-loop
    await runOneScript(scriptEl);
  }

  // Any script's real DOMContentLoaded listener already fired long before
  // this markup was injected at runtime, so give newly-registered ones
  // (e.g. ads.html's own close-button setup) a synthetic one to catch.
  document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));
}
