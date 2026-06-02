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
