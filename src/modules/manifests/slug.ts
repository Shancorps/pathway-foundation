/**
 * Generates a snake_case slug from a human-readable label.
 * Lowercase, underscore-separated, special characters stripped.
 * Returns "field" if input is empty or all-strip.
 */
export function generateSlug(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return slug || "field"
}

/**
 * Ensures the slug doesn't collide with anything in `existing`.
 * On collision, appends _2, _3, etc. until unique.
 */
export function ensureUniqueSlug(slug: string, existing: Set<string>): string {
  if (!existing.has(slug)) return slug
  let n = 2
  while (existing.has(`${slug}_${String(n)}`)) n++
  return `${slug}_${String(n)}`
}
