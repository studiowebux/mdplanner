// HX-Trigger header builder — sends custom events the client listens for.
// Used by view routes to trigger toast notifications and close sidenav after form submission.

export function hxTrigger(type: "success" | "error", message: string): string {
  return JSON.stringify({
    showToast: { type, message },
    closeSidenav: true,
  });
}
