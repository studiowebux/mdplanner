// Shared SSE live-refresh wrapper for detail views.
// Sits outside <main> to avoid htmx inheritance conflicts.
// On SSE event, re-fetches the detail page and swaps the root element.

type SseRefreshProps = {
  /** URL to re-fetch on SSE event (e.g. "/goals/goal_123") */
  getUrl: string;
  /** SSE event triggers (e.g. "sse:goal.updated" or "sse:task.updated, sse:task.deleted") */
  trigger: string;
  /** Target element ID to swap (without #) */
  targetId: string;
  /**
   * Optional client-side htmx trigger spec appended to the SSE triggers, e.g.
   * "note:refresh from:body". Lets in-page JS request the same declarative
   * re-render by dispatching a DOM event — no htmx.ajax() needed.
   */
  clientTrigger?: string;
};

export function SseRefresh(
  { getUrl, trigger, targetId, clientTrigger }: SseRefreshProps,
) {
  const triggers = clientTrigger ? `${trigger}, ${clientTrigger}` : trigger;
  return (
    <div
      hx-ext="sse, morph"
      sse-connect="/sse"
      hx-get={getUrl}
      hx-trigger={triggers}
      hx-target={`#${targetId}`}
      hx-select={`#${targetId}`}
      hx-swap="morph:outerHTML"
    />
  );
}

type SseListRefreshProps = {
  /** Domain config name — drives the view URL, target id, and toolbar include. */
  name: string;
  /** SSE event prefix (e.g. "task") — listens on .created/.updated/.deleted. */
  ssePrefix: string;
};

/**
 * Background SSE refresh for a domain list view. Lives inside <main> (which owns
 * the sse-connect) but carries its OWN hx-get: htmx 2.x resolves the request
 * verb via hasAttribute on the element directly, so hx-get is NOT inherited from
 * <main> — only modifier attrs (target/swap/include) inherit. A span without its
 * own verb fires the trigger but issues no request, so the list never refreshes.
 *
 * `hidden` + `hx-indicator="this"` pin the request indicator to this node so the
 * background morph never flashes the shared #global-loading bar.
 */
export function SseListRefresh({ name, ssePrefix }: SseListRefreshProps) {
  return (
    <span
      hidden
      hx-get={`/${name}/view`}
      hx-trigger={`sse:${ssePrefix}.created, sse:${ssePrefix}.updated, sse:${ssePrefix}.deleted`}
      hx-target={`#${name}-view`}
      hx-swap="morph:outerHTML"
      hx-include={`#${name}-toolbar`}
      hx-indicator="this"
    />
  );
}
