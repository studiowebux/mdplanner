// Graceful-shutdown sequencer with a BOUNDED drain.
//
// The HTTP server's graceful drain (`Deno.HttpServer.shutdown()`) waits for
// every in-flight connection to finish. Long-lived `/sse` streams and MCP
// keep-alive connections never close on their own, so an unbounded
// `await server.shutdown()` hangs the process forever on Ctrl+C (ticket
// ix0b4b). This helper races the drain against a timeout so the process always
// exits, while still giving connections a brief window to close cleanly.
//
// All side effects are injected so the sequence is unit-testable without a real
// server, signals, or process exit.

export interface ShutdownDeps {
  /** Tell connected clients we're going down (e.g. publish("server.shutdown")). */
  notify: () => void;
  /** Pause (ms) after notify so the event flushes to sockets before streams end. */
  flushMs: number;
  /** End open SSE streams so the drain below returns promptly (e.g. closeAll). */
  closeStreams: () => void;
  /** Begin the server's graceful drain (e.g. () => server.shutdown()). */
  drain: () => Promise<void>;
  /** Maximum time (ms) to wait for the drain before forcing exit. */
  drainMs: number;
  /** Terminate the process (e.g. Deno.exit). */
  exit: (code: number) => void;
  /** Optional logger for diagnostics. */
  log?: (msg: string) => void;
  /** Sleep impl (injectable for tests); defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run the shutdown sequence: notify → flush → close streams → bounded drain →
 * exit(0). Always resolves and always calls `exit`, even if `drain` never
 * settles or rejects.
 */
export async function runShutdown(deps: ShutdownDeps): Promise<void> {
  const {
    notify,
    flushMs,
    closeStreams,
    drain,
    drainMs,
    exit,
    log = () => {},
    sleep = defaultSleep,
  } = deps;

  try {
    notify();
    await sleep(flushMs);
    closeStreams();

    // A late rejection must not surface as an unhandled rejection after the
    // race has already settled via the timeout.
    const drained = drain().catch((err) => {
      log(`[shutdown] drain failed: ${String(err)}`);
    });

    let timer: number | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        log(`[shutdown] drain exceeded ${drainMs}ms — forcing exit`);
        resolve();
      }, drainMs);
    });

    await Promise.race([drained, timeout]);
    if (timer !== undefined) clearTimeout(timer);
  } catch (err) {
    log(`[shutdown] error: ${String(err)}`);
  }

  exit(0);
}
