// Task timeline export — SVG download and print-to-PDF.
// Follows the org-tree-export.js pattern: capture DOM, inject
// self-contained styles, render to SVG foreignObject or print iframe.

(function () {
  "use strict";

  // Light theme colors — hardcoded because CSS vars don't resolve
  // in standalone SVG or print windows.
  var C = {
    bgPrimary: "#ffffff",
    bgSecondary: "#f5f5f5",
    bgTertiary: "#ebebeb",
    textPrimary: "#000000",
    textSecondary: "#2c2c2c",
    textMuted: "#6b6b6b",
    border: "#e0e0e0",
    borderStrong: "#c0c0c0",
    errorBg: "#ffebee",
    error: "#c62828",
    warningBg: "#fff3e0",
    warning: "#ff9900",
    infoBg: "#e3f2fd",
    info: "#1565c0",
  };

  function getExportStyles() {
    return [
      "body, .task-timeline-export { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: " + C.bgPrimary + "; }",
      ".task-timeline__chart-inner { padding-right: 2rem; }",
      ".task-timeline__row { display: flex; border-bottom: 1px solid " + C.border + "; }",
      ".task-timeline__row:last-child { border-bottom: none; }",
      ".task-timeline__row--header { font-weight: 600; font-size: 0.75rem; color: " + C.textMuted + "; }",
      ".task-timeline__row--completed { opacity: 0.5; }",
      ".task-timeline__row--completed .task-timeline__row-title { text-decoration: line-through; }",
      ".task-timeline__label { flex-shrink: 0; width: 20rem; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; border-right: 1px solid " + C.border + "; overflow: hidden; }",
      ".task-timeline__label--header { font-weight: 600; }",
      ".task-timeline__row-title { font-size: 0.875rem; font-weight: 500; color: " + C.textPrimary + "; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      ".task-timeline__track { flex: 1; position: relative; min-height: 2rem; }",
      ".task-timeline__month-marker { position: absolute; top: 0; bottom: 0; font-size: 0.625rem; color: " + C.textSecondary + "; white-space: nowrap; padding-left: 0.25rem; border-left: 1px solid " + C.border + "; }",
      ".task-timeline__month-marker--quarter { font-weight: 700; color: " + C.textPrimary + "; border-left: 2px solid " + C.borderStrong + "; }",
      ".task-timeline__grid-line { position: absolute; top: 0; bottom: 0; border-left: 1px solid " + C.border + "; pointer-events: none; }",
      ".task-timeline__grid-line--quarter { border-left: 2px solid " + C.borderStrong + "; }",
      ".task-timeline__bar { position: absolute; top: 50%; transform: translateY(-50%); border-radius: 0.25rem; display: flex; align-items: center; padding: 0.25rem 0.5rem; min-height: 1.5rem; z-index: 1; }",
      ".task-timeline__bar--p1 { background: " + C.errorBg + "; border-left: 2px solid " + C.error + "; }",
      ".task-timeline__bar--p2 { background: " + C.warningBg + "; border-left: 2px solid " + C.warning + "; }",
      ".task-timeline__bar--p3 { background: " + C.infoBg + "; border-left: 2px solid " + C.info + "; }",
      ".task-timeline__bar--p4 { background: " + C.bgTertiary + "; border-left: 2px solid " + C.borderStrong + "; }",
      ".task-timeline__bar--p5 { background: " + C.bgTertiary + "; border-left: 2px solid " + C.textMuted + "; }",
      ".task-timeline__bar--completed { opacity: 0.5; }",
      ".task-timeline__bar-dates { font-size: 0.625rem; color: " + C.textPrimary + "; white-space: nowrap; }",
      ".task-priority { font-size: 0.625rem; font-weight: 600; padding: 0.125rem 0.375rem; border-radius: 9999px; white-space: nowrap; flex-shrink: 0; }",
      ".task-priority--1 { background: " + C.errorBg + "; color: " + C.error + "; }",
      ".task-priority--2 { background: " + C.warningBg + "; color: " + C.warning + "; }",
      ".task-priority--3 { background: " + C.infoBg + "; color: " + C.info + "; }",
      ".task-priority--4 { background: " + C.bgTertiary + "; color: " + C.textSecondary + "; }",
      ".task-priority--5 { background: " + C.bgTertiary + "; color: " + C.textMuted + "; }",
      ".task-timeline__blocked { font-size: 0.625rem; font-weight: 600; padding: 0.125rem 0.375rem; border-radius: 9999px; background: " + C.errorBg + "; color: " + C.error + "; flex-shrink: 0; }",
      ".task-timeline__unscheduled-title { font-size: 1rem; font-weight: 700; margin: 1rem 0 0.5rem; }",
      ".task-timeline__unscheduled-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 1rem; font-size: 0.875rem; }",
      ".task-timeline__unscheduled-row a { color: " + C.textPrimary + "; text-decoration: none; }",
    ].join("\n");
  }

  function captureTimeline() {
    var chart = document.querySelector(".task-timeline");
    if (!chart) return null;

    // Temporarily expand the chart inner to full width for capture
    var inner = chart.querySelector(".task-timeline__chart-inner");
    var savedMinWidth = inner ? inner.style.minWidth : "";

    var html = chart.innerHTML;

    if (inner) inner.style.minWidth = savedMinWidth;

    // Measure
    var rect = chart.getBoundingClientRect();
    var innerEl = chart.querySelector(".task-timeline__chart-inner");
    var w = innerEl ? Math.max(rect.width, parseInt(innerEl.dataset.minWidth || "800")) + 40 : rect.width + 40;
    var h = rect.height + 40;

    return { html: html, width: Math.ceil(w), height: Math.ceil(h) };
  }

  function exportSVG() {
    var data = captureTimeline();
    if (!data) return;

    var styles = getExportStyles();
    var svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + data.width + " " + data.height + '" width="' + data.width + '" height="' + data.height + '">',
      "  <style>",
      styles,
      "  </style>",
      '  <rect width="100%" height="100%" fill="white"/>',
      '  <foreignObject width="100%" height="100%">',
      '    <div xmlns="http://www.w3.org/1999/xhtml" class="task-timeline-export">',
      data.html,
      "    </div>",
      "  </foreignObject>",
      "</svg>",
    ].join("\n");

    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.download = "timeline-" + new Date().toISOString().split("T")[0] + ".svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    var data = captureTimeline();
    if (!data) return;

    var styles = getExportStyles();
    var pageStyles = [
      "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
      "@page { size: A4 landscape; margin: 1cm; }",
      "body { margin: 0; padding: 1rem; min-width: " + data.width + "px; }",
    ].join("\n");

    var html = "<!DOCTYPE html><html><head><title>Task Timeline</title>" +
      "<style>" + styles + "\n" + pageStyles + "</style>" +
      "</head><body>" + data.html + "</body></html>";

    var nonceEl = document.querySelector("script[nonce]");
    var nonce = nonceEl ? nonceEl.nonce || nonceEl.getAttribute("nonce") : "";
    if (nonce) {
      html = html.replace("<style>", '<style nonce="' + nonce + '">');
    }

    var iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;left:-99999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);

    var idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(html);
    idoc.close();

    // Apply data-attr positions in the print iframe
    idoc.querySelectorAll("[data-left]").forEach(function (el) {
      el.style.setProperty("left", el.dataset.left);
    });
    idoc.querySelectorAll("[data-width]").forEach(function (el) {
      el.style.setProperty("width", el.dataset.width);
    });
    var printInner = idoc.querySelector(".task-timeline__chart-inner");
    if (printInner && printInner.dataset.minWidth) {
      printInner.style.setProperty("min-width", printInner.dataset.minWidth + "px");
    }

    iframe.contentWindow.focus();
    setTimeout(function () {
      iframe.contentWindow.print();
      setTimeout(function () { document.body.removeChild(iframe); }, 1000);
    }, 250);
  }

  document.addEventListener("click", function (e) {
    if (e.target.id === "timelineExportSVG" || e.target.closest("#timelineExportSVG")) {
      exportSVG();
    }
    if (e.target.id === "timelineExportPDF" || e.target.closest("#timelineExportPDF")) {
      exportPDF();
    }
  });
})();
