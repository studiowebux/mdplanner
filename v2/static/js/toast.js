// Toast notification system — window.toast({ type, message, duration })
// Types: success, error, warning, info

(function () {
  var container = null;
  var DEFAULT_DURATION = 4000;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
  }

  function createToast(opts) {
    var type = opts.type || "info";
    var message = opts.message || "";
    var duration = opts.duration != null ? opts.duration : DEFAULT_DURATION;

    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.setAttribute("role", "alert");

    var msg = document.createElement("span");
    msg.className = "toast__message";
    msg.textContent = message;
    el.appendChild(msg);

    var close = document.createElement("button");
    close.className = "toast__close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "\u00d7";
    close.addEventListener("click", function () { dismiss(el); });
    el.appendChild(close);

    ensureContainer().appendChild(el);

    // Trigger enter animation
    requestAnimationFrame(function () {
      el.classList.add("toast--visible");
    });

    if (duration > 0) {
      setTimeout(function () { dismiss(el); }, duration);
    }

    return el;
  }

  function dismiss(el) {
    if (!el || !el.parentNode) return;
    el.classList.remove("toast--visible");
    el.addEventListener("transitionend", function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    // Fallback if no transition fires
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }

  window.toast = createToast;
})();
