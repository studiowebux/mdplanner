// Org chart export — SVG download and print-to-PDF.
// Reads the live DOM tree, temporarily removes layout constraints to
// measure natural size, captures outerHTML, then restores.
// Standalone file: no dependency on org-tree.js internals.

(function () {
  "use strict";

  // Light theme colors from variables.css — hardcoded because CSS vars
  // don't resolve in standalone SVG or print windows.
  var C = {
    bgPrimary: "#ffffff",
    bgSecondary: "#f5f5f5",
    bgTertiary: "#ebebeb",
    textPrimary: "#000000",
    textSecondary: "#2c2c2c",
    textMuted: "#6b6b6b",
    textInverse: "#ffffff",
    border: "#e0e0e0",
    accent: "#ffab00",
    success: "#04b34f",
    successBg: "#e8f5e9",
    successText: "#2e7d32",
    warning: "#ff9900",
    warningBg: "#fff3e0",
    warningText: "#000000",
    // Category palette (dept colors)
    cat0: "#e57200",  // orange
    cat1: "#4c8c2b",  // green
    cat2: "#0085ad",  // blue
    cat3: "#003865",  // navy
    cat4: "#642f6c",  // purple
    cat5: "#ac145a",  // pink
    cat6: "#f2a900",  // yellow-dark
    cat7: "#44693d",  // green-dark
  };

  function getExportStyles() {
    return [
      ".orgchart-export-root {",
      "  padding: 20px;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      "}",
      ".orgchart-tree {",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "  padding: 2rem;",
      "  gap: 3rem;",
      "}",
      ".orgchart-tree > .orgchart-node-wrapper {",
      "  padding-top: 1.5rem;",
      "  border-top: 1px dashed " + C.border + ";",
      "}",
      ".orgchart-tree > .orgchart-node-wrapper:first-child {",
      "  padding-top: 0;",
      "  border-top: none;",
      "}",
      ".orgchart-node-wrapper {",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "}",
      ".orgchart-node {",
      "  background-color: " + C.bgPrimary + ";",
      "  border: 1px solid " + C.border + ";",
      "  border-radius: 0.5rem;",
      "  padding: 0.75rem 1rem;",
      "  min-width: 180px;",
      "  max-width: 220px;",
      "}",
      ".orgchart-node-header {",
      "  padding-left: 0.5rem;",
      "  position: relative;",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 0.25rem;",
      "}",
      ".orgchart-node-identity {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 0.5rem;",
      "}",
      ".orgchart-node-name {",
      "  font-weight: 600;",
      "  font-size: 0.875rem;",
      "  color: " + C.textPrimary + ";",
      "}",
      ".orgchart-node-name a {",
      "  color: " + C.textPrimary + ";",
      "  text-decoration: none;",
      "}",
      ".orgchart-node-title {",
      "  font-size: 0.75rem;",
      "  color: " + C.textMuted + ";",
      "}",
      ".orgchart-node-dept {",
      "  font-size: 0.625rem;",
      "  color: " + C.textMuted + ";",
      "  text-transform: uppercase;",
      "  letter-spacing: 0.05em;",
      "}",
      ".person-card__avatar {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  width: 2rem;",
      "  height: 2rem;",
      "  border-radius: 50%;",
      "  font-size: 0.75rem;",
      "  font-weight: 600;",
      "  color: " + C.textInverse + ";",
      "  flex-shrink: 0;",
      "}",
      ".person-card__avatar--human { background: " + C.success + "; }",
      ".person-card__avatar--ai { background: " + C.accent + "; }",
      ".person-card__avatar--hybrid { background: " + C.warning + "; }",
      ".person-card__badge {",
      "  font-size: 0.625rem;",
      "  font-weight: 500;",
      "  padding: 0.125rem 0.5rem;",
      "  border-radius: 9999px;",
      "  white-space: nowrap;",
      "}",
      ".person-card__badge--human { background: " + C.successBg + "; color: " + C.successText + "; }",
      ".person-card__badge--ai { background: " + C.bgSecondary + "; color: " + C.textPrimary + "; }",
      ".person-card__badge--hybrid { background: " + C.warningBg + "; color: " + C.warningText + "; }",
      ".orgchart-children {",
      "  display: flex;",
      "  gap: 1.5rem;",
      "  padding-top: 2rem;",
      "  position: relative;",
      "}",
      ".orgchart-children::before {",
      "  content: '';",
      "  position: absolute;",
      "  top: 0;",
      "  left: 50%;",
      "  width: 1px;",
      "  height: 1rem;",
      "  background-color: " + C.border + ";",
      "}",
      ".orgchart-children::after {",
      "  content: '';",
      "  position: absolute;",
      "  top: 1rem;",
      "  left: 0;",
      "  right: 0;",
      "  height: 1px;",
      "  background-color: " + C.border + ";",
      "}",
      ".orgchart-children > .orgchart-node-wrapper {",
      "  position: relative;",
      "}",
      ".orgchart-children > .orgchart-node-wrapper::before {",
      "  content: '';",
      "  position: absolute;",
      "  top: -1rem;",
      "  left: 50%;",
      "  width: 1px;",
      "  height: 1rem;",
      "  background-color: " + C.border + ";",
      "}",
      "/* Real connector elements for print reliability */",
      ".connector-v-down {",
      "  position: absolute;",
      "  top: 0;",
      "  left: 50%;",
      "  width: 1px;",
      "  height: 1rem;",
      "  background-color: " + C.border + ";",
      "}",
      ".connector-h {",
      "  position: absolute;",
      "  top: 1rem;",
      "  left: 0;",
      "  right: 0;",
      "  height: 1px;",
      "  background-color: " + C.border + ";",
      "}",
      ".connector-v-up {",
      "  position: absolute;",
      "  top: -1rem;",
      "  left: 50%;",
      "  width: 1px;",
      "  height: 1rem;",
      "  background-color: " + C.border + ";",
      "}",
      "/* Hide pseudo-element connectors — real elements replace them */",
      ".orgchart-children::before,",
      ".orgchart-children::after,",
      ".orgchart-children > .orgchart-node-wrapper::before { display: none; }",
      ".orgchart-drag-handle { display: none; }",
      ".orgchart-unlink-zone { display: none !important; }",
      "[class*='orgchart-dept-'] {",
      "  border-left: 3px solid " + C.textMuted + ";",
      "}",
      ".orgchart-dept-0 { border-left-color: " + C.cat0 + "; }",
      ".orgchart-dept-1 { border-left-color: " + C.cat1 + "; }",
      ".orgchart-dept-2 { border-left-color: " + C.cat2 + "; }",
      ".orgchart-dept-3 { border-left-color: " + C.cat3 + "; }",
      ".orgchart-dept-4 { border-left-color: " + C.cat4 + "; }",
      ".orgchart-dept-5 { border-left-color: " + C.cat5 + "; }",
      ".orgchart-dept-6 { border-left-color: " + C.cat6 + "; }",
      ".orgchart-dept-7 { border-left-color: " + C.cat7 + "; }",
      ".orgchart-dept-none { border-left-color: " + C.textMuted + "; }",
    ].join("\n");
  }

  /**
   * Temporarily remove all layout constraints (overflow, fixed height,
   * zoom/pan transform, parent width), measure the tree's natural size,
   * capture its outerHTML, then restore everything.
   */
  function captureTree() {
    var container = document.getElementById("orgchartContainer");
    var vp = document.getElementById("orgchartViewport");
    if (!container || !vp) return null;
    var tree = vp.querySelector(".orgchart-tree");
    if (!tree || tree.children.length === 0) return null;

    // Save current state
    var savedTransform = vp.style.transform;
    var savedContainerCss = container.style.cssText;

    // Remove ALL constraints: position off-screen, unlimited width/height,
    // no overflow clipping, so the tree can expand to its natural size.
    vp.style.transform = "translate(0px, 0px) scale(1)";
    container.style.cssText =
      "position: fixed; left: -99999px; top: 0; " +
      "width: max-content; height: max-content; " +
      "overflow: visible; border: none;";
    void vp.offsetHeight;

    // Measure the true bounding box across all descendant nodes
    // (the tree element may not contain all children in its own box)
    var nodes = vp.querySelectorAll(".orgchart-node");
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.left < minX) minX = r.left;
      if (r.top < minY) minY = r.top;
      if (r.right > maxX) maxX = r.right;
      if (r.bottom > maxY) maxY = r.bottom;
    });

    var pad = 60;
    var result = {
      html: tree.outerHTML,
      width: Math.ceil(maxX - minX + pad * 2),
      height: Math.ceil(maxY - minY + pad * 2),
    };

    // Restore
    vp.style.transform = savedTransform;
    container.style.cssText = savedContainerCss;

    return result;
  }

  function exportSVG() {
    var data = captureTree();
    if (!data) return;

    var styles = getExportStyles();
    var svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + data.width + ' ' + data.height + '" width="' + data.width + '" height="' + data.height + '">',
      "  <style>",
      styles,
      "  </style>",
      '  <rect width="100%" height="100%" fill="white"/>',
      '  <foreignObject width="100%" height="100%">',
      '    <div xmlns="http://www.w3.org/1999/xhtml" class="orgchart-export-root">',
      data.html,
      "    </div>",
      "  </foreignObject>",
      "</svg>",
    ].join("\n");

    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.download = "orgchart-" + new Date().toISOString().split("T")[0] + ".svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    var data = captureTree();
    if (!data) return;

    var styles = getExportStyles();

    var pageStyles = [
      "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
      "@page { size: A4 landscape; margin: 1cm; }",
      "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; margin: 0; padding: 0; min-width: " + data.width + "px; }",
    ].join("\n");

    var html = "<!DOCTYPE html><html><head><title>Org Chart</title>" +
      "<style>" + styles + "\n" + pageStyles + "</style>" +
      "</head><body>" + data.html + "</body></html>";

    // Read the page nonce so the iframe's <style> passes CSP
    var nonceEl = document.querySelector("script[nonce]");
    var nonce = nonceEl ? nonceEl.nonce || nonceEl.getAttribute("nonce") : "";
    if (nonce) {
      html = html.replace("<style>", '<style nonce="' + nonce + '">');
    }

    // Hidden iframe — avoids popup blockers and document.write quirks
    var iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;left:-99999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);

    var idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(html);
    idoc.close();

    // Inject real connector elements to replace pseudo-elements (unreliable in print)
    var children = idoc.querySelectorAll(".orgchart-children");
    children.forEach(function (el) {
      // Vertical line from parent down (replaces ::before)
      var vLine = idoc.createElement("div");
      vLine.className = "connector-v-down";
      el.insertBefore(vLine, el.firstChild);

      // Horizontal line across siblings (replaces ::after) — skip if single child
      var wrappers = el.querySelectorAll(":scope > .orgchart-node-wrapper");
      if (wrappers.length > 1) {
        var hLine = idoc.createElement("div");
        hLine.className = "connector-h";
        el.insertBefore(hLine, el.firstChild);
      }

      // Vertical line from horizontal bar down to each child (replaces wrapper::before)
      wrappers.forEach(function (w) {
        var vUp = idoc.createElement("div");
        vUp.className = "connector-v-up";
        w.insertBefore(vUp, w.firstChild);
      });
    });

    // Wait for content to render, then print
    iframe.contentWindow.focus();
    setTimeout(function () {
      iframe.contentWindow.print();
      // Clean up after print dialog closes
      setTimeout(function () { document.body.removeChild(iframe); }, 1000);
    }, 250);
  }

  // ── Delegated click handlers ────────────────────────────────────

  document.addEventListener("click", function (e) {
    if (e.target.id === "orgchartExportSVG" || e.target.closest("#orgchartExportSVG")) {
      exportSVG();
    }
    if (e.target.id === "orgchartExportPDF" || e.target.closest("#orgchartExportPDF")) {
      exportPDF();
    }
  });
})();
