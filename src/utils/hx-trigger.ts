// HX-Trigger header builder — sends custom events the client listens for.
// Used by view routes to trigger toast notifications and close sidenav after form submission.

/**
 * Escape every non-ASCII code unit as a `\uXXXX` sequence so the result is a
 * valid HTTP header value (ByteString / Latin-1). Header values reject chars
 * above U+00FF (e.g. em-dash "—" U+2014, arrow "→" U+2192) — an unescaped
 * Unicode message throws "Value is not a valid ByteString" and the response
 * 500s before the toast ever reaches the client. The client `JSON.parse`s the
 * header, decoding the escapes back to the original characters.
 */
export function escapeHeaderUnicode(value: string): string {
  return value.replace(
    /[-￿]/g,
    (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** Build an `HX-Trigger` header value that fires a client toast and closes the
 * sidenav after a form submission. */
export function hxTrigger(type: "success" | "error", message: string): string {
  return escapeHeaderUnicode(JSON.stringify({
    showToast: { type, message },
    closeSidenav: true,
  }));
}
