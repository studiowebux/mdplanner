// Cache-busting for local static assets.
//
// CSS/JS are served with `Cache-Control: public, max-age=3600` (bin.ts) and no
// revalidation, so a browser holds a stale copy for up to an hour after any
// change — most visibly, CSS fixes (e.g. print/export styles) don't show up.
// Stamping the URL with the app version makes each release fetch fresh assets
// while keeping the long cache lifetime for unchanged versions.

import { APP_VERSION } from "../constants/mod.ts";

/** Append the app version to a local asset path: `/css/x.css` → `/css/x.css?v=0.39.0`. */
export function asset(path: string): string {
  return `${path}?v=${APP_VERSION}`;
}
