// SSE event broadcast bus — domain-agnostic.
// Publishes named SSE events (no payload). Clients use hx-trigger="sse:<name>"
// to trigger a server fetch that renders the correct filtered view.

const subscribers = new Set<ReadableStreamDefaultController<string>>();

export function subscribe(): ReadableStream<string> {
  let ctrl!: ReadableStreamDefaultController<string>;
  return new ReadableStream<string>({
    start(controller) {
      ctrl = controller;
      subscribers.add(controller);
      controller.enqueue(": ping\n\n");
    },
    cancel() {
      subscribers.delete(ctrl);
    },
  });
}

export function publish(type: string): void {
  const message = `event: ${type}\ndata: \n\n`;
  for (const ctrl of subscribers) {
    try {
      ctrl.enqueue(message);
    } catch (_) {
      // Client disconnected — remove subscriber
      subscribers.delete(ctrl);
    }
  }
}
