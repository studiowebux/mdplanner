// SSE event broadcast bus — domain-agnostic. Each subscriber declares a view
// mode. Publishers render per-view and the bus sends only the matching fragment.

import type { ViewMode } from "../types/app.ts";

type Subscriber = {
  ctrl: ReadableStreamDefaultController<string>;
  view: ViewMode;
};

const subscribers = new Set<Subscriber>();

export function subscribe(view: ViewMode): ReadableStream<string> {
  let sub!: Subscriber;
  return new ReadableStream<string>({
    start(controller) {
      sub = { ctrl: controller, view };
      subscribers.add(sub);
      controller.enqueue(": ping\n\n");
    },
    cancel() {
      subscribers.delete(sub);
    },
  });
}

// Returns the view mode that has active subscribers, or null if none.
// When multiple views are active (rare — multiple tabs), returns both.
export function subscribedViews(): Set<ViewMode> {
  const views = new Set<ViewMode>();
  for (const sub of subscribers) views.add(sub.view);
  return views;
}

// Send a named SSE event to all subscribers of the given view mode.
export function send(type: string, view: ViewMode, html: string): void {
  const message = `event: ${type}\ndata: ${html}\n\n`;
  for (const sub of subscribers) {
    if (sub.view !== view) continue;
    try {
      sub.ctrl.enqueue(message);
    } catch {
      subscribers.delete(sub);
    }
  }
}
