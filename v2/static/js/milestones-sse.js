// Milestone SSE handler — subscribes to milestone:* events via the shared
// sse-bus. Never opens its own EventSource.

function updateCount(delta) {
  var el = document.querySelector(".milestones-page__count");
  if (!el) return;
  var n = parseInt(el.textContent, 10);
  if (!isNaN(n)) el.textContent = (n + delta) + " total";
}

window.sseBus.on("milestone:", function (event) {
  if (event.type === "milestone:deleted") {
    var el = document.getElementById("milestone-" + event.id);
    if (el) { el.remove(); updateCount(-1); }
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
        if (grid) { grid.appendChild(card); updateCount(1); }
      }
    });
});
