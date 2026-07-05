// Pretty detail URLs: /tv/kohrra-230034. The trailing numeric id is the source
// of truth; the slug is decorative, so bare /tv/230034 links keep resolving.

export function slugify(str) {
  return String(str || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Build a detail path. Title optional — falls back to the bare id.
export function detailPath(mediaType, id, title) {
  const slug = slugify(title);
  return slug ? `/${mediaType}/${slug}-${id}` : `/${mediaType}/${id}`;
}

// Extract the numeric TMDB id from a route param (slug-id or bare id).
export function idFromParam(param) {
  const m = String(param || "").match(/(\d+)$/);
  return m ? m[1] : String(param || "");
}
