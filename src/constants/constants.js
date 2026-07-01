export const servers = [
  "Server 1",
  "Server 2",
  "Server 3",
  "Server 4",
  "Server 5",
  "Server 6",
  "Server 7",
  "Server 8",
  "Server 9",
  "Server 10",
  "Server 11",
  "Server 12",
  "Server 13",
];

// Sentinel index for the ad-free HLS player; kept out of `servers` so iframe
// server indices and saved preferences stay stable.
export const AD_FREE_SERVER = -1;
export const AD_FREE_LABEL = "Scenic+";

export const server8Domains = (process.env.REACT_APP_SERVER8_DOMAINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
