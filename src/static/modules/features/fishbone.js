// Fishbone (Ishikawa) Diagram Module
// Card grid view with inline SVG fishbone rendering.

import { FishboneAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

// ---------------------------------------------------------------
// SVG fishbone renderer
// Shared between the card view and the sidenav view mode.
// ---------------------------------------------------------------

export function buildFishboneSVG(diagram) {
  const W = 900;
  const H = 400;
  const spineY = H / 2;
  const spineStartX = 80;
  const spineEndX = 710;
  const effectX = 710;
  const effectY = spineY - 50;
  const effectW = 180;
  const effectH = 100;

  const causes = diagram.causes || [];
  const N = causes.length;

  const BONE_LEN = 120;
  const COS45 = Math.SQRT1_2; // 1/√2 ≈ 0.707
  const boneDX = BONE_LEN * COS45;
  const boneDY = BONE_LEN * COS45;
  const SUB_LEN = 50;

  const elems = [];

  // Spine
  elems.push(
    `<line x1="${spineStartX}" y1="${spineY}" x2="${spineEndX}" y2="${spineY}" class="fb-spine"/>`,
  );

  // Arrow at spine end
  elems.push(
    `<polygon points="${spineEndX},${spineY} ${spineEndX - 12},${spineY - 7} ${spineEndX - 12},${spineY + 7}" class="fb-spine-arrow"/>`,
  );

  // Effect box
  elems.push(
    `<rect x="${effectX}" y="${effectY}" width="${effectW}" height="${effectH}" rx="4" class="fb-effect-box"/>`,
  );

  // Title text (split to 2 lines if needed)
  const title = diagram.title || "Problem";
  const MAX_CHARS = 16;
  if (title.length <= MAX_CHARS) {
    elems.push(
      `<text x="${effectX + effectW / 2}" y="${effectY + effectH / 2 + 5}" class="fb-effect-text" text-anchor="middle" dominant-baseline="middle">${escapeHtml(title)}</text>`,
    );
  } else {
    const mid = Math.floor(title.length / 2);
    const splitAt = title.lastIndexOf(" ", mid) > 0
      ? title.lastIndexOf(" ", mid)
      : mid;
    const line1 = title.slice(0, splitAt);
    const line2 = title.slice(splitAt + 1);
    elems.push(
      `<text x="${effectX + effectW / 2}" y="${effectY + effectH / 2 - 8}" class="fb-effect-text" text-anchor="middle">${escapeHtml(line1)}</text>`,
    );
    elems.push(
      `<text x="${effectX + effectW / 2}" y="${effectY + effectH / 2 + 10}" class="fb-effect-text" text-anchor="middle">${escapeHtml(line2)}</text>`,
    );
  }

  if (N === 0) {
    elems.push(
      `<text x="${(spineStartX + spineEndX) / 2}" y="${spineY - 20}" class="fb-empty-hint" text-anchor="middle">Add causes to see the diagram</text>`,
    );
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="fb-svg" role="img" aria-label="${escapeHtml(title)}">${elems.join("")}</svg>`;
  }

  // Category bones
  const spineLen = spineEndX - spineStartX;
  for (let i = 0; i < N; i++) {
    const cause = causes[i];
    const t = (i + 1) / (N + 1);
    const spineX = spineStartX + t * spineLen;
    const isAbove = i % 2 === 0;
    const headX = spineX - boneDX;
    const headY = isAbove ? spineY - boneDY : spineY + boneDY;

    // Bone line from head to spine attachment
    elems.push(
      `<line x1="${headX.toFixed(1)}" y1="${headY.toFixed(1)}" x2="${spineX.toFixed(1)}" y2="${spineY}" class="fb-bone"/>`,
    );

    // Category label
    const catLabelY = isAbove ? headY - 8 : headY + 18;
    elems.push(
      `<text x="${headX.toFixed(1)}" y="${catLabelY.toFixed(1)}" class="fb-cat-label" text-anchor="middle">${escapeHtml(cause.category)}</text>`,
    );

    // Sub-causes as horizontal lines from points along the bone
    const subs = cause.subcauses || [];
    const M = subs.length;
    for (let j = 0; j < M; j++) {
      const u = (j + 1) / (M + 1);
      const px = headX + u * (spineX - headX);
      const py = isAbove
        ? headY + u * (spineY - headY)
        : headY + u * (spineY - headY); // same formula works for both

      // Horizontal sub-cause line pointing left
      elems.push(
        `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px - SUB_LEN).toFixed(1)}" y2="${py.toFixed(1)}" class="fb-sub-line"/>`,
      );

      // Sub-cause label
      const lblY = isAbove ? py - 3 : py + 12;
      const labelText = subs[j].length > 20
        ? subs[j].slice(0, 18) + "…"
        : subs[j];
      elems.push(
        `<text x="${(px - SUB_LEN - 4).toFixed(1)}" y="${lblY.toFixed(1)}" class="fb-sub-label" text-anchor="end">${escapeHtml(labelText)}</text>`,
      );
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" class="fb-svg" role="img" aria-label="${escapeHtml(title)}">${elems.join("")}</svg>`;
}

// ---------------------------------------------------------------
// Module
// ---------------------------------------------------------------

export class FishboneModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.fishbones = await FishboneAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading fishbone diagrams:", error);
    }
  }

  renderView() {
    const container = document.getElementById("fishboneContainer");
    const emptyState = document.getElementById("emptyFishboneState");
    if (!container) return;

    const diagrams = this.taskManager.fishbones || [];

    if (diagrams.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = diagrams.map((d) => this._renderCard(d)).join("");
  }

  _renderCard(diagram) {
    const desc = diagram.description
      ? `<p class="fishbone-card-desc">${escapeHtml(diagram.description)}</p>`
      : "";

    return `
      <div class="fishbone-card" onclick="taskManager.fishboneSidenavModule.openView('${diagram.id}')">
        <div class="fishbone-card-header">
          <span class="fishbone-card-title">${escapeHtml(diagram.title)}</span>
          <span class="fishbone-card-count">${diagram.causes.length} causes</span>
        </div>
        ${desc}
        <div class="fishbone-card-svg">${buildFishboneSVG(diagram)}</div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById("addFishboneBtn")?.addEventListener(
      "click",
      () => this.taskManager.fishboneSidenavModule.openNew(),
    );
  }
}
