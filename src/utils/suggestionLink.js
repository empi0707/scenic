// Detail-page link for a TMDB multi/discover result.
export const linkFor = (item) => {
  if (item.media_type === "person") return `/person/${item.id}`;
  const type = item.media_type === "tv" ? "tv" : "movie";
  return `/${type}/${item.id}`;
};
