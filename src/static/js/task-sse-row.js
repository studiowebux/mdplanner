// Targeted task-row live-update. Pairs with TaskSseRefresh (task-list.tsx) and
// GET /tasks/row/:id (views/tasks/routes.tsx).
//
// A SAME-section field edit publishes `task.updated` carrying the changed task
// id as JSON. The htmx SSE extension dispatches `htmx:sseMessage` (the verb-less
// subscriber <span> in TaskSseRefresh is what makes it wire the listener). We
// read the id and morph-swap ONLY `#task-row-<id>` via GET /tasks/row/:id,
// instead of refetching and morphing the whole #tasks-view.
//
// If the row is not in the DOM (filtered out, on a later page, or the board/
// timeline view which has no `#task-row-*` nodes) we do nothing: the next
// interaction, or a `task.moved`/`task.created`/`task.deleted` full-view
// refetch, reconciles it.
//
// Classic <script> IIFE on globalThis (NOT an ES module), consistent with the
// rest of static/js.
(function () {
  function onSseMessage(evt) {
    // htmx forwards the native SSE MessageEvent as `evt.detail`; for a named
    // EventSource event `detail.type` is the event name and `detail.data` is
    // the raw payload string.
    var msg = evt && evt.detail;
    if (!msg || msg.type !== "task.updated" || !msg.data) return;

    var id;
    try {
      id = JSON.parse(msg.data).id;
    } catch (_) {
      return;
    }
    if (!id) return;

    var row = document.getElementById("task-row-" + id);
    if (!row || !window.htmx) return;

    window.htmx.ajax("GET", "/tasks/row/" + encodeURIComponent(id), {
      target: row,
      swap: "morph:outerHTML",
    });
  }

  document.body.addEventListener("htmx:sseMessage", onSseMessage);
})();
