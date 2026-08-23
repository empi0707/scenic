// Config for the two in-page ad slots (src/components/ad-slot/AdSlot.jsx),
// mounted at a fixed spot inside a page's own layout — as opposed to the
// fixed, always-on-screen banners in src/ads.html (see GlobalAds.jsx), which
// aren't tied to any one page.
//
// This is the ONE file to edit to change an ad-network key/host/size for
// these two slots — everything is a plain JS value here (no .env layer), so
// an edit takes effect on save with no dev-server restart. Same
// "invoke.js"/atOptions network pattern as movieace's src/config/ads.ts and
// src/ads.html.
//
// An empty key means "not configured": AdSlot renders nothing for that slot.
const NETWORK_HOST = "focusameneducation.com";
const scriptSrc = (key) => `https://${NETWORK_HOST}/${key}/invoke.js`;

// Shown on movie/TV detail pages, below the top cast section.
export const DETAIL_PAGE_AD = {
  key: "b8df2b4252342db2db56dcf778d5d27d",
  width: 320,
  height: 50,
  scriptSrc,
};

// Shown below the player once a title starts playing.
export const WATCH_PAGE_AD = {
  key: "b8df2b4252342db2db56dcf778d5d27d",
  width: 320,
  height: 50,
  scriptSrc,
};
