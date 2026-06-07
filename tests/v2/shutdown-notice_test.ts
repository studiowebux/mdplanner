// Unit tests for the DOM-free logic of src/static/js/shutdown-notice.js.
// Importing the classic-script file runs its IIFE; in Deno `document` is
// undefined so init() (the EventSource wiring) is skipped, leaving only the
// window.ShutdownNotice API to exercise.

import { assert, assertEquals } from "@std/assert";
import "../../src/static/js/shutdown-notice.js";

interface ToastOpts {
  type: string;
  message: string;
  duration: number;
}
interface ShutdownNoticeApi {
  showShutdownNotice: (toastFn?: (opts: ToastOpts) => unknown) => unknown;
  clearShutdownNotice: () => void;
  MESSAGE: string;
}

const ShutdownNotice =
  (globalThis as unknown as { ShutdownNotice: ShutdownNoticeApi })
    .ShutdownNotice;

Deno.test("shutdown-notice — shows a persistent warning toast via the toast fn", () => {
  ShutdownNotice.clearShutdownNotice();
  const calls: ToastOpts[] = [];
  ShutdownNotice.showShutdownNotice((opts) => {
    calls.push(opts);
    return { parentNode: null };
  });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].type, "warning");
  assertEquals(calls[0].duration, 0); // persistent until reconnect
  assert(calls[0].message.includes("shutting down"));
  assertEquals(calls[0].message, ShutdownNotice.MESSAGE);
});

Deno.test("shutdown-notice — de-duplicates: repeat events do not stack toasts", () => {
  ShutdownNotice.clearShutdownNotice();
  let count = 0;
  const toastFn = () => {
    count++;
    return { parentNode: null };
  };
  ShutdownNotice.showShutdownNotice(toastFn);
  ShutdownNotice.showShutdownNotice(toastFn);
  ShutdownNotice.showShutdownNotice(toastFn);

  assertEquals(count, 1);
});

Deno.test("shutdown-notice — no-ops when no toast fn is available", () => {
  ShutdownNotice.clearShutdownNotice();
  // Must not throw when window.toast is missing.
  const result = ShutdownNotice.showShutdownNotice(undefined);
  assertEquals(result, null);
});

Deno.test("shutdown-notice — clear allows a fresh notice afterwards", () => {
  ShutdownNotice.clearShutdownNotice();
  let count = 0;
  const toastFn = () => {
    count++;
    return { parentNode: null };
  };
  ShutdownNotice.showShutdownNotice(toastFn);
  ShutdownNotice.clearShutdownNotice();
  ShutdownNotice.showShutdownNotice(toastFn);

  assertEquals(count, 2);
});
