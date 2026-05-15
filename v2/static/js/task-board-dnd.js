// Task board drag-and-drop — pointer events (works on mouse + touch, no HTML5 DnD bugs).
// Cross-column moves: PATCH /api/v1/tasks/:id/move
// Within-column reorder: POST /api/v1/tasks/:id/reorder

(function () {
  "use strict";

  // ── state ─────────────────────────────────────────────────────────────────

  var dragging = null;
  // dragging = {
  //   id: string,
  //   sourceSection: string,
  //   ghost: HTMLElement,
  //   offsetX: number,
  //   offsetY: number,
  //   indicator: HTMLElement,
  //   activeColumn: HTMLElement|null,
  // }

  // ── helpers ───────────────────────────────────────────────────────────────

  function getCard(el) {
    return el ? el.closest(".task-board__card") : null;
  }

  function getColumnBody(el) {
    return el ? el.closest(".task-board__column-body") : null;
  }

  function getSection(columnBody) {
    var col = columnBody && columnBody.closest(".task-board__column");
    return col ? col.dataset.section : null;
  }

  /** Cards in DOM order, excluding the one being dragged. */
  function visibleCards(columnBody) {
    return Array.prototype.slice.call(
      columnBody.querySelectorAll(
        ".task-board__card:not(.task-board__card--dragging)",
      ),
    );
  }

  /**
   * Find the card to insert the indicator before (null = append after all).
   * Uses the midpoint of each card to decide above/below.
   */
  function findInsertBefore(columnBody, clientY) {
    var cards = visibleCards(columnBody);
    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return { before: cards[i], index: i };
      }
    }
    return { before: null, index: cards.length };
  }

  function createGhost(card) {
    var rect = card.getBoundingClientRect();
    var ghost = card.cloneNode(true);
    ghost.classList.add("task-board__card--ghost");
    ghost.style.position = "fixed";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.opacity = "0.85";
    ghost.style.transform = "rotate(1.5deg)";
    ghost.style.transition = "none";
    document.body.appendChild(ghost);
    return ghost;
  }

  function moveGhost(ghost, clientX, clientY, offsetX, offsetY) {
    ghost.style.left = (clientX - offsetX) + "px";
    ghost.style.top = (clientY - offsetY) + "px";
  }

  /**
   * Position the indicator absolutely inside the column body.
   * Uses CSSOM (style.setProperty) which is CSP-safe.
   * Never inserts into DOM flow — no card layout shift, no feedback loop.
   */
  function placeIndicator(indicator, columnBody, clientY) {
    if (indicator.parentNode !== columnBody) {
      columnBody.appendChild(indicator);
    }

    var colRect = columnBody.getBoundingClientRect();
    var cards = visibleCards(columnBody);
    var y;

    if (cards.length === 0) {
      y = 8; // top padding fallback
    } else {
      var placed = false;
      for (var i = 0; i < cards.length; i++) {
        var rect = cards[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          y = rect.top - colRect.top;
          placed = true;
          break;
        }
      }
      if (!placed) {
        var last = cards[cards.length - 1].getBoundingClientRect();
        y = last.bottom - colRect.top;
      }
    }

    indicator.style.setProperty("top", y + "px");
    indicator.classList.remove("is-hidden");
  }

  function hideIndicator(indicator) {
    indicator.classList.add("is-hidden");
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  function clearDragoverClass() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".task-board__column-body--dragover"),
      function (el) {
        el.classList.remove("task-board__column-body--dragover");
      },
    );
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  function callMove(taskId, targetSection) {
    fetch("/api/v1/tasks/" + taskId + "/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: targetSection }),
    }).catch(console.error);
  }

  function callReorder(taskId, index) {
    fetch("/api/v1/tasks/" + taskId + "/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: index }),
    }).catch(console.error);
  }

  // ── pointerdown — start drag ───────────────────────────────────────────────

  document.addEventListener("pointerdown", function (e) {
    // Only primary button (left mouse or first touch)
    if (e.button !== undefined && e.button !== 0) return;

    var card = getCard(e.target);
    if (!card) return;

    // Don't drag when clicking a link or button inside the card
    if (e.target.closest("a, button")) return;

    var col = card.closest(".task-board__column");
    var sourceSection = col ? col.dataset.section : null;
    if (!sourceSection) return;

    var rect = card.getBoundingClientRect();
    var ghost = createGhost(card);

    card.classList.add("task-board__card--dragging");

    // Single shared indicator element
    var indicator = document.createElement("div");
    indicator.className = "task-board__drop-indicator is-hidden";

    dragging = {
      id: card.dataset.taskId,
      sourceSection: sourceSection,
      ghost: ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      indicator: indicator,
      activeColumn: null,
    };

    // Capture pointer so we get move/up even outside the element
    card.setPointerCapture(e.pointerId);

    e.preventDefault(); // prevent text selection and scroll on touch
  });

  // ── pointermove — move ghost + indicator ──────────────────────────────────

  document.addEventListener("pointermove", function (e) {
    if (!dragging) return;

    moveGhost(
      dragging.ghost,
      e.clientX,
      e.clientY,
      dragging.offsetX,
      dragging.offsetY,
    );

    // Hide ghost temporarily so elementFromPoint can see what's underneath
    dragging.ghost.style.display = "none";
    var below = document.elementFromPoint(e.clientX, e.clientY);
    dragging.ghost.style.display = "";

    var columnBody = getColumnBody(below);

    if (columnBody !== dragging.activeColumn) {
      // Left old column
      if (dragging.activeColumn) {
        dragging.activeColumn.classList.remove(
          "task-board__column-body--dragover",
        );
      }
      hideIndicator(dragging.indicator);
      dragging.activeColumn = columnBody;
      if (columnBody) {
        columnBody.classList.add("task-board__column-body--dragover");
      }
    }

    if (columnBody) {
      placeIndicator(dragging.indicator, columnBody, e.clientY);
    }
  });

  // ── pointerup — drop ──────────────────────────────────────────────────────

  document.addEventListener("pointerup", function (e) {
    if (!dragging) return;
    finishDrag(e.clientX, e.clientY);
  });

  document.addEventListener("pointercancel", function () {
    if (!dragging) return;
    cancelDrag();
  });

  function finishDrag(clientX, clientY) {
    var d = dragging;
    dragging = null;

    // Clean ghost before hit-testing
    d.ghost.style.display = "none";
    var below = document.elementFromPoint(clientX, clientY);
    d.ghost.remove();

    // Remove dragging class from the original card
    var originalCard = document.querySelector(
      ".task-board__card--dragging[data-task-id='" + d.id + "']",
    );
    if (originalCard) {
      originalCard.classList.remove("task-board__card--dragging");
    }

    clearDragoverClass();
    hideIndicator(d.indicator);

    var columnBody = getColumnBody(below);
    if (!columnBody) return;

    var targetSection = getSection(columnBody);
    if (!targetSection) return;

    if (d.sourceSection !== targetSection) {
      callMove(d.id, targetSection);
    } else {
      var result = findInsertBefore(columnBody, clientY);
      callReorder(d.id, result.index);
    }
  }

  function cancelDrag() {
    var d = dragging;
    dragging = null;
    d.ghost.remove();
    var originalCard = document.querySelector(
      ".task-board__card--dragging[data-task-id='" + d.id + "']",
    );
    if (originalCard) {
      originalCard.classList.remove("task-board__card--dragging");
    }
    clearDragoverClass();
    hideIndicator(d.indicator);
  }

  // ── prevent scroll during card drag on touch ──────────────────────────────

  document.addEventListener("touchstart", function (e) {
    if (getCard(e.target) && !e.target.closest("a, button")) {
      e.preventDefault();
    }
  }, { passive: false });
})();
