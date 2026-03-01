// SSE Client
// Connects to GET /api/events and dispatches "mdplanner:change" DOM events.
// Reconnects automatically on disconnect (EventSource handles this natively).

export class SSEClient {
  constructor() {
    this._source = null;
    this._connected = false;
  }

  connect() {
    if (this._source) return;

    this._source = new EventSource("/api/events");

    this._source.onopen = () => {
      this._connected = true;
    };

    this._source.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        document.dispatchEvent(
          new CustomEvent("mdplanner:change", { detail: payload }),
        );
      } catch {
        // Ignore malformed events (e.g. keepalive comments arrive as blank data)
      }
    };

    this._source.onerror = () => {
      this._connected = false;
      // EventSource reconnects automatically — no manual retry needed.
    };
  }

  get connected() {
    return this._connected;
  }
}
