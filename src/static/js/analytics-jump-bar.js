// Sticky jump-bar for /analytics. Highlights the anchor matching the
// section currently in the viewport via IntersectionObserver.
//
// Anchors carry `data-jump-anchor="<key>"`; sections carry
// `data-jump-target="<key>"`. The map is rebuilt on every init so the
// observer survives htmx body swaps (filter bar + customize panel both
// re-render the entire <main id="analytics-content">).

let activeObserver = null;

function initJumpBar(root) {
  const scope = root && root.querySelector ? root : document;

  const anchors = scope.querySelectorAll("[data-jump-anchor]");
  const targets = scope.querySelectorAll("[data-jump-target]");
  if (anchors.length === 0 || targets.length === 0) return;

  const anchorByKey = new Map();
  anchors.forEach((a) => {
    const key = a.getAttribute("data-jump-anchor");
    if (key) anchorByKey.set(key, a);
  });

  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  const visibleKeys = new Set();

  const setActive = (key) => {
    anchorByKey.forEach((anchor, k) => {
      if (k === key) anchor.classList.add("is-active");
      else anchor.classList.remove("is-active");
    });
  };

  activeObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const key = entry.target.getAttribute("data-jump-target");
      if (!key) continue;
      if (entry.isIntersecting) visibleKeys.add(key);
      else visibleKeys.delete(key);
    }
    // Pick the first key from ALL_SECTIONS order that is currently visible.
    // DOM order matches ALL_SECTIONS order, so iterate the anchor map keys
    // (insertion order = DOM order = canonical section order).
    for (const key of anchorByKey.keys()) {
      if (visibleKeys.has(key)) {
        setActive(key);
        return;
      }
    }
  }, {
    rootMargin: "-30% 0px -60% 0px",
    threshold: 0,
  });

  targets.forEach((t) => activeObserver.observe(t));
}

document.addEventListener("DOMContentLoaded", () => initJumpBar(document));

document.addEventListener("htmx:afterSettle", (e) => {
  const target = e.detail && e.detail.target ? e.detail.target : null;
  if (!target) return;
  // Only re-init when the analytics body itself was swapped.
  if (
    target.id === "analytics-content" ||
    target.querySelector("#analytics-content")
  ) {
    initJumpBar(target);
  }
});
