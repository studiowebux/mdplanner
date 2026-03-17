import type { ViewMode } from "../types/app.ts";
import { send, subscribedViews } from "../singletons/event-bus.ts";
import { renderToHtml } from "./render.ts";
import { log } from "../singletons/logger.ts";

// Render and send an SSE event to active subscribers.
// Checks subscribed views once, renders only the matching fragment.
export async function publishEvent(
  type: string,
  renderers: Record<ViewMode, () => unknown>,
): Promise<void> {
  const views = subscribedViews();
  if (views.has("grid")) {
    send(type, "grid", await renderToHtml(renderers.grid()));
  } else if (views.has("table")) {
    send(type, "table", await renderToHtml(renderers.table()));
  } else {
    log.debug(`SSE publish skipped (no subscribers): ${type}`);
  }
}

// Send static HTML (e.g. OOB delete) to active subscribers.
export function publishHtml(
  type: string,
  fragments: Record<ViewMode, string>,
): void {
  const views = subscribedViews();
  if (views.has("grid")) {
    send(type, "grid", fragments.grid);
  } else if (views.has("table")) {
    send(type, "table", fragments.table);
  } else {
    log.debug(`SSE publish skipped (no subscribers): ${type}`);
  }
}
