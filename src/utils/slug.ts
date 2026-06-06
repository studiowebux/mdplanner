/** Slugify a string to kebab-case: lowercase, non-alphanumerics collapsed to
 * single dashes, leading/trailing dashes trimmed. Used for URL path segments
 * (e.g. portfolio project links). */
export function toKebab(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
