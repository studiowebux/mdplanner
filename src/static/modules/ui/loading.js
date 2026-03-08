// View loading spinner utility

/**
 * Shows a CSS-only spinner inside a container element.
 * Inserts the spinner as the first child so it appears above existing content.
 * Idempotent — calling twice on the same container is safe.
 *
 * @param {string} containerId - DOM id of the container to show the spinner in
 */
export function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container || container.querySelector(".view-loading")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "view-loading";
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-label", "Loading");

  const spinner = document.createElement("div");
  spinner.className = "view-loading-spinner";
  wrapper.appendChild(spinner);

  container.prepend(wrapper);
}

/**
 * Removes the loading spinner from a container.
 *
 * @param {string} containerId - DOM id of the container
 */
export function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const spinner = container.querySelector(".view-loading");
  if (spinner) spinner.remove();
}
