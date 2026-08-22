// Config for inline ad slots rendered inside the app (placed wherever a page
// mounts <AdSlot config={...} />), ported from the same pattern used in the
// movieace project (src/config/ads.ts / src/components/ads/AdSlot.vue).
//
// Each slot points at an ad-network "invoke" script keyed by an ad unit id.
// All the network-specific bits are env-driven so a real key/host never has
// to be hardcoded into the repo — set them in .env (see .env.example). An
// empty key means "not configured": AdSlot renders nothing for that slot
// instead of pointing at a fake host.
const NETWORK_HOST = process.env.REACT_APP_AD_NETWORK_HOST || "";
const scriptSrc = (key) => `https://${NETWORK_HOST}/${key}/invoke.js`;

// Shown on movie/TV detail pages, below the top cast section.
export const DETAIL_PAGE_AD = {
  key: process.env.REACT_APP_AD_DETAIL_KEY || "",
  width: 320,
  height: 50,
  scriptSrc,
};

// Shown below the player once a title starts playing.
export const WATCH_PAGE_AD = {
  key: process.env.REACT_APP_AD_WATCH_KEY || "",
  width: 320,
  height: 50,
  scriptSrc,
};
