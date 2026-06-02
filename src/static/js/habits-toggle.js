// Habit note dialog — JS only handles the note dialog for not-done cells.
// Done (uncheck) cells use native hx-post attributes on the <span> in the TSX.

(function () {
  const dialog = document.getElementById("habit-note-dialog");
  const form = document.getElementById("habit-note-form");
  const noteInput = document.getElementById("habit-note-input");
  const cancelBtn = document.getElementById("habit-note-cancel");

  if (!dialog || !form || !noteInput || !cancelBtn) return;

  document.body.appendChild(dialog);

  function openFor(postUrl, targetSelector) {
    form.setAttribute("hx-post", postUrl);
    form.setAttribute("hx-target", targetSelector);
    noteInput.value = "";
    htmx.process(form);
    dialog.showModal();
    noteInput.focus();
  }

  document.addEventListener("click", (e) => {
    const cell = e.target.closest(".habit-heatmap__cell");
    if (!cell) return;
    // Done cells: native hx-post on the element handles the toggle directly.
    if (cell.dataset.done === "true") return;
    // Not-done cells: open note dialog, form submits via htmx.
    const row = cell.closest(".habit-heatmap__row");
    const habitId = row.dataset.habitId;
    const date = cell.dataset.date;
    openFor(`/habits/${habitId}/toggle-date/${date}`, `#hrow-${habitId}`);
  });

  form.addEventListener("htmx:afterRequest", (e) => {
    if (e.detail.successful) dialog.close();
  });

  cancelBtn.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    noteInput.value = "";
  });
})();
