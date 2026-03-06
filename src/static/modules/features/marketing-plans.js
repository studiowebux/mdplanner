// Marketing Plans Module
// Card grid view for marketing plan management.

import { MarketingPlansAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

export class MarketingPlansModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.marketingPlans = await MarketingPlansAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading marketing plans:", error);
    }
  }

  renderView() {
    const container = document.getElementById("marketingPlansContainer");
    const emptyState = document.getElementById("emptyMarketingPlansState");
    if (!container) return;

    const plans = this.taskManager.marketingPlans || [];

    if (plans.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = plans.map((p) => this._renderCard(p)).join("");
  }

  _renderCard(plan) {
    const desc = plan.description
      ? `<p class="mktplan-card-desc">${escapeHtml(plan.description)}</p>`
      : "";

    const channels = plan.channels || [];
    const campaigns = plan.campaigns || [];
    const audiences = plan.targetAudiences || [];

    const channelTags = channels.length > 0
      ? channels
        .map(
          (c) =>
            `<span class="mktplan-channel-tag">${escapeHtml(c.name)}</span>`,
        )
        .join("")
      : "";

    const budget =
      plan.budgetTotal !== undefined
        ? `${plan.budgetCurrency || "$"}${plan.budgetTotal.toLocaleString()}`
        : "";

    const dates =
      plan.startDate && plan.endDate
        ? `${plan.startDate} &rarr; ${plan.endDate}`
        : plan.startDate || plan.endDate || "";

    const metaParts = [
      budget ? `Budget: ${budget}` : "",
      `${channels.length} channels`,
      `${campaigns.length} campaigns`,
      `${audiences.length} audiences`,
      dates,
    ].filter(Boolean);

    return `
      <div class="mktplan-card" onclick="taskManager.marketingPlansSidenavModule.openView('${plan.id}')">
        <div class="mktplan-card-header">
          <span class="mktplan-card-name">${escapeHtml(plan.name)}</span>
          <span class="mktplan-status-badge">${escapeHtml(plan.status)}</span>
        </div>
        ${desc}
        <div class="mktplan-card-meta">${metaParts.join(" &middot; ")}</div>
        ${channelTags ? `<div class="mktplan-card-tags">${channelTags}</div>` : ""}
      </div>
    `;
  }

  bindEvents() {
    document.getElementById("addMarketingPlanBtn")?.addEventListener(
      "click",
      () => this.taskManager.marketingPlansSidenavModule.openNew(),
    );
  }
}
