// Shared sort options + TMDB Discover param mapping, used by the catalog grid
// and the anime page so they stay in lockstep.

export const DEFAULT_SORT = "popularity.desc";

export const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Highest Popularity", icon: "bx-trending-up" },
  { value: "popularity.asc", label: "Lowest Popularity", icon: "bx-trending-down" },
  { value: "recent.desc", label: "Most Recent", icon: "bx-calendar" },
  { value: "recent.asc", label: "Least Recent", icon: "bx-calendar-alt" },
  { value: "rating.desc", label: "Highest Rating", icon: "bx-like" },
  { value: "rating.asc", label: "Lowest Rating", icon: "bx-dislike" },
  { value: "votes.desc", label: "Most Voted", icon: "bx-user-plus" },
  { value: "votes.asc", label: "Least Voted", icon: "bx-user-minus" },
];

// Rating/recent sorts gate on a minimum vote count so a single stray vote (or
// a 0-vote dump) doesn't top the list; "Most Recent" caps to today so it means
// newest *released*, not announced/future.
export const sortParamsFor = (mediaType, sort) => {
  const dateField = mediaType === "tv" ? "first_air_date" : "primary_release_date";
  const today = new Date().toISOString().slice(0, 10);

  switch (sort) {
    case "popularity.asc":
      return { sort_by: "popularity.asc" };
    case "recent.desc":
      return {
        sort_by: `${dateField}.desc`,
        [`${dateField}.lte`]: today,
        "vote_count.gte": 1,
      };
    case "recent.asc":
      return {
        sort_by: `${dateField}.asc`,
        [`${dateField}.gte`]: "1900-01-01",
        "vote_count.gte": 1,
      };
    case "rating.desc":
      return { sort_by: "vote_average.desc", "vote_count.gte": 200 };
    case "rating.asc":
      return { sort_by: "vote_average.asc", "vote_count.gte": 50 };
    case "votes.desc":
      return { sort_by: "vote_count.desc" };
    case "votes.asc":
      return { sort_by: "vote_count.asc" };
    default:
      return { sort_by: "popularity.desc" };
  }
};
