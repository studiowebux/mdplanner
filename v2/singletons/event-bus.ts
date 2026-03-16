// SSE event broadcast bus — domain-agnostic. Publishes any typed event to all
// connected clients. Domains define their own event type strings; the bus does
// not enumerate them.

export type BusEvent = { type: string; id: string };

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

export function publish(event: BusEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const ctrl of subscribers) {
    try {
      ctrl.enqueue(data);
    } catch {
      subscribers.delete(ctrl);
    }
  }
}
