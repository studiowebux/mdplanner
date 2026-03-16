// Milestone SSE handler — subscribes to milestone:* events via the shared
// sse-bus. Updates both card grid and table row without page reload.

function updateCount(delta) {
  var el = document.querySelector(".milestones-page__count");
  if (!el) return;
  var n = parseInt(el.textContent, 10);
  if (!isNaN(n)) el.textContent = (n + delta) + " total";
}

function swapFragment(url, containerId, itemId, prefix) {
  return fetch(url)
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var tmp = document.createElement("div");
      tmp.innerHTML = html;
      var el = tmp.firstElementChild;
      if (!el) return;
      var existing = document.getElementById(prefix + itemId);
      if (existing) {
        existing.replaceWith(el);
      } else {
        var container = document.getElementById(containerId);
        if (container) {
          container.appendChild(el);
          return true;
        }
      }
      return false;
    });
}

function swapTableRow(url, itemId) {
  return fetch(url)
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var tmp = document.createElement("tbody");
      tmp.innerHTML = html;
      var row = tmp.firstElementChild;
      if (!row) return;
      var existing = document.querySelector(
        ".data-table__row[data-row-id=\"" + itemId + "\"]"
      );
      if (existing) {
        existing.replaceWith(row);
      } else {
        var tbody = document.querySelector(".data-table__body");
        if (tbody) tbody.appendChild(row);
      }
    });
}

window.sseBus.on("milestone:", function (event) {
  if (event.type === "milestone:deleted") {
    var card = document.getElementById("milestone-" + event.id);
    if (card) card.remove();
    var row = document.querySelector(
      ".data-table__row[data-row-id=\"" + event.id + "\"]"
    );
    if (row) row.remove();
    updateCount(-1);
    return;
  }

  var isNew = event.type === "milestone:created";

  swapFragment(
    "/milestones/" + event.id + "/card",
    "milestones-grid",
    event.id,
    "milestone-"
  ).then(function (added) {
    if (added && isNew) updateCount(1);
  });

  swapTableRow("/milestones/" + event.id + "/row", event.id);
});
