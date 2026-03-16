// Milestone SSE client — listens for bus events and swaps cards in place
// without a full page reload. Fetches the updated card fragment from the
// server on each event so the server stays the single source of truth.

(function () {
  var es = new EventSource("/sse");

  es.onmessage = function (e) {
    var event = JSON.parse(e.data);
    if (!event.type.startsWith("milestone:")) return;

    if (event.type === "milestone:deleted") {
      var el = document.getElementById("milestone-" + event.id);
      if (el) el.remove();
      return;
    }

    fetch("/milestones/" + event.id + "/card")
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var tmp = document.createElement("div");
        tmp.innerHTML = html;
        var card = tmp.firstElementChild;
        if (!card) return;
        var existing = document.getElementById("milestone-" + event.id);
        if (existing) {
          existing.replaceWith(card);
        } else {
          var grid = document.getElementById("milestones-grid");
          if (grid) grid.appendChild(card);
        }
      });
  };
})();
