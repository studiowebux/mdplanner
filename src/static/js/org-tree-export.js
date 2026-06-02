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
    cat0: "#e57200", // orange
    cat1: "#4c8c2b", // green
    cat2: "#0085ad", // blue
    cat3: "#003865", // navy
    cat4: "#642f6c", // purple
    cat5: "#ac145a", // pink
    cat6: "#f2a900", // yellow-dark
    cat7: "#44693d", // green-dark
  };

  function getExportStyles() {
    return [
      ".orgchart-export-root {",
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
      "  min-width: 11.25rem;",
      "  max-width: 15rem;",
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
      ".person-card__badge--human { background: " + C.successBg + "; color: " +
      C.successText + "; }",
      ".person-card__badge--ai { background: " + C.bgSecondary + "; color: " +
      C.textPrimary + "; }",
      ".person-card__badge--hybrid { background: " + C.warningBg + "; color: " +
      C.warningText + "; }",
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
   * Inject real <div> connector elements into .orgchart-children so they
   * render in SVG foreignObject and print contexts where CSS pseudo-elements
   * are unreliable. Returns the modified HTML string.
   */
  function injectConnectors(html) {
    var temp = document.createElement("div");
    temp.innerHTML = html;
    temp.querySelectorAll(".orgchart-children").forEach(function (el) {
      var wrappers = el.querySelectorAll(":scope > .orgchart-node-wrapper");

      // Vertical line from parent card down to horizontal bar
      var vDown = document.createElement("div");
      vDown.className = "connector-v-down";
      el.insertBefore(vDown, el.firstChild);

      // Horizontal bar across siblings — skip for single child
      if (wrappers.length > 1) {
        var hBar = document.createElement("div");
        hBar.className = "connector-h";
        el.insertBefore(hBar, el.firstChild);
      }

      // Vertical line from horizontal bar down to each child wrapper
      wrappers.forEach(function (w) {
        var vUp = document.createElement("div");
        vUp.className = "connector-v-up";
        w.insertBefore(vUp, w.firstChild);
      });
    });
    return temp.innerHTML;
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

    // Measure in the LIVE layout — offsetLeft/offsetTop are layout-tree values
    // unaffected by the viewport's CSS transform. We set position:relative on
    // vp so it becomes the offsetParent reference for all child nodes.
    vp.style.position = "relative";
    void vp.offsetHeight;

    var nodes = vp.querySelectorAll(".orgchart-node");
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (node) {
      var el = node;
      var x = 0, y = 0;
      while (el && el !== vp) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + node.offsetWidth > maxX) maxX = x + node.offsetWidth;
      if (y + node.offsetHeight > maxY) maxY = y + node.offsetHeight;
    });

    var html = tree.outerHTML;
    // Read the live container width before restoring — foreignObject will use
    // this exact width so the tree lays out identically to the live page.
    var containerW = container.clientWidth;
    var containerH = Math.ceil(maxY + 60);
    vp.style.position = "";

    if (maxX <= minX) return null;

    return {
      html: html,
      minX: minX,
      minY: minY,
      nodeSpanW: Math.ceil(maxX - minX),
      nodeSpanH: Math.ceil(maxY - minY),
      containerW: containerW,
      containerH: containerH,
    };
  }

  function exportSVG() {
    var data = captureTree();
    if (!data) return;

    var pad = 200;
    // shift: push content right so the leftmost node lands at x=pad in SVG space.
    // margin-left on the inner div moves it in normal flow (unlike position:relative
    // which only affects visual rendering but not foreignObject clipping bounds).
    // foreignObject width covers shift + full content width + right padding so
    // neither left nor right nodes are clipped.
    var shift = Math.max(0, pad - data.minX);
    var foW = data.containerW;
    var foFW = shift + data.minX + data.nodeSpanW + pad;
    var foH = data.minY + data.nodeSpanH + pad;
    var cropX = data.minX + shift - pad;
    var cropY = data.minY - pad;
    var svgW = data.nodeSpanW + pad * 2;
    var svgH = data.nodeSpanH + pad * 2;
    var styles = getExportStyles();
    var connectedHtml = injectConnectors(data.html);
    var svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg"',
      '     viewBox="' + cropX + " " + cropY + " " + svgW + " " + svgH + '"',
      '     width="' + svgW + '" height="' + svgH + '">',
      "  <style>",
      styles,
      "  </style>",
      '  <rect x="' + cropX + '" y="' + cropY + '" width="' + svgW +
      '" height="' + svgH + '" fill="white"/>',
      '  <foreignObject x="0" y="0" width="' + foFW + '" height="' + foH + '">',
      '    <div xmlns="http://www.w3.org/1999/xhtml" style="margin-left:' +
      shift + "px;width:" + foW + 'px;">',
      '      <div class="orgchart-export-root">',
      connectedHtml,
      "      </div>",
      "    </div>",
      "  </foreignObject>",
      "</svg>",
    ].join("\n");

    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.download = "orgchart-" + new Date().toISOString().split("T")[0] +
      ".svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    var data = captureTree();
    if (!data) return;

    var styles = getExportStyles();

    // A4 landscape printable area at 96 dpi with 1 cm margins ≈ 1046 × 756 px.
    // Scale down if the tree is wider/taller than the printable area.
    var PAGE_W = 1046;
    var PAGE_H = 756;
    // Use the same 200px buffer as SVG export. The export CSS renders nodes at
    // hardcoded rem values that differ from live CSS variables, so nodeSpanW from
    // live measurements can underestimate the export layout width. The 400px total
    // buffer (200 each side) absorbs that discrepancy and lets the flex tree center
    // naturally within bodyW without any overflow or clipping.
    var padBuf = 200;
    var bodyW = data.nodeSpanW + padBuf * 2;
    var bodyH = data.nodeSpanH + padBuf * 2;
    var printScale = Math.min(1, PAGE_W / bodyW, PAGE_H / bodyH);
    var scalePercent = Math.round(printScale * 100);

    // @page size must match bodyW so the browser lays out at our width instead
    // of reflowing to A4 width (which causes left-side nodes to overflow and clip).
    // margin: 1cm keeps content off the physical printer edge so the top node isn't cut.
    var pageStyles = [
      "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
      "@page { size: " + bodyW + "px " + bodyH + "px; margin: 1cm; }",
      "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; margin: 0; padding: 0; width: " +
      bodyW + "px; }",
    ].join("\n");

    // Inject real connectors before serialising to HTML — avoids duplicate injection
    var connectedHtml = injectConnectors(data.html);

    var html = "<!DOCTYPE html><html><head><title>Org Chart</title>" +
      "<style>" + styles + "\n" + pageStyles + "</style>" +
      "</head><body>" +
      '<div class="orgchart-export-root">' +
      connectedHtml +
      "</div>" +
      "</body></html>";

    // Read the page nonce so the iframe's <style> passes CSP
    var nonceEl = document.querySelector("script[nonce]");
    var nonce = nonceEl ? nonceEl.nonce || nonceEl.getAttribute("nonce") : "";
    if (nonce) {
      html = html.replace("<style>", '<style nonce="' + nonce + '">');
    }

    // Hidden iframe sized to the natural content width so layout matches print width.
    var iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;left:-99999px;width:" + bodyW +
      "px;height:1px;border:none;";
    document.body.appendChild(iframe);

    var idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(html);
    idoc.close();

    // Wait for content to render, then print
    iframe.contentWindow.focus();
    setTimeout(function () {
      iframe.contentWindow.print();
      // Clean up after print dialog closes
      setTimeout(function () {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }

  // ── Delegated click handlers ────────────────────────────────────

  document.addEventListener("click", function (e) {
    if (
      e.target.id === "orgchartExportSVG" ||
      e.target.closest("#orgchartExportSVG")
    ) {
      exportSVG();
    }
    if (
      e.target.id === "orgchartExportPDF" ||
      e.target.closest("#orgchartExportPDF")
    ) {
      exportPDF();
    }
  });
})();
