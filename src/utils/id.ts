/** Generate a unique entity id: `<prefix>_<epochMs>_<6-char base36 random>`.
 * The canonical id scheme for every domain entity. */
export function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}
