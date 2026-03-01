/**
 * Event Bus — Singleton pub/sub for Server-Sent Events.
 * Emitted after every successful mutation so connected browsers can reload.
 */

export interface SSEEvent {
  entity: string; // e.g. "tasks", "goals", "notes"
  action: "created" | "updated" | "deleted";
  id?: string;
}

type SSEEventHandler = (event: SSEEvent) => void;

class EventBus {
  private readonly handlers = new Set<SSEEventHandler>();

  subscribe(handler: SSEEventHandler): void {
    this.handlers.add(handler);
  }

  unsubscribe(handler: SSEEventHandler): void {
    this.handlers.delete(handler);
  }

  emit(event: SSEEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Handler errors must not crash the bus; stale handlers are cleaned up
        // on the next write error in the SSE route.
      }
    }
  }

  get subscriberCount(): number {
    return this.handlers.size;
  }
}

export const eventBus = new EventBus();
