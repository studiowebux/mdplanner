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
};

export function SseRefresh({ getUrl, trigger, targetId }: SseRefreshProps) {
  return (
    <div
      hx-ext="sse"
      sse-connect="/sse"
      hx-get={getUrl}
      hx-trigger={trigger}
      hx-target={`#${targetId}`}
      hx-select={`#${targetId}`}
      hx-swap="outerHTML"
    />
  );
}
