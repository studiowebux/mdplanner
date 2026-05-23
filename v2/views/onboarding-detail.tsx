import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Onboarding } from "../types/onboarding.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import {
  STEP_CATEGORY_LABELS,
  STEP_STATUS_LABELS,
} from "../domains/onboarding/constants.tsx";

export const OnboardingDetailView: FC<
  ViewProps & { item: Onboarding; peopleById?: Map<string, string> }
> = (
  { item, peopleById, ...viewProps },
) => {
  const onboardeeName = item.personId
    ? (peopleById?.get(item.personId) ?? item.personId)
    : null;
  const done = item.steps.filter((s) => s.status === "complete").length;
  const pct = item.steps.length > 0
    ? Math.round((done / item.steps.length) * 100)
    : 0;

  // Group steps by category
  const byCategory = new Map<string, typeof item.steps>();
  for (const step of item.steps) {
    const cat = step.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(step);
  }

  return (
    <MainLayout
      title={item.employeeName}
      {...viewProps}
      styles={["/css/views/onboarding.css"]}
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/onboarding/" + item.id}
        trigger="sse:onboarding.updated"
        targetId="onboarding-detail-root"
      />
      <main id="onboarding-detail-root" class="detail-view onboarding-detail">
        <Breadcrumb
          items={[
            { label: "Onboarding", href: "/onboarding" },
            { label: item.employeeName },
          ]}
        />
        <BackButton href="/onboarding" label="Back to Onboarding" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header onboarding-detail__header">
          <div class="onboarding-detail__title-row">
            <h1 class="detail-title onboarding-detail__title">
              {item.employeeName}
            </h1>
            <p class="onboarding-detail__role">{item.role}</p>
          </div>
          <DetailActions
            entity="onboarding"
            id={item.id}
            title={item.employeeName}
            formContainerId="onboarding-form-container"
          />
        </header>

        {/* -- Meta row -------------------------------------------------- */}
        <div class="detail-section onboarding-detail__meta">
          {item.startDate && (
            <div class="onboarding-detail__meta-item">
              <span class="onboarding-detail__meta-label">Start date</span>
              <span class="onboarding-detail__meta-value">
                {item.startDate}
              </span>
            </div>
          )}
          {item.personId && (
            <div class="onboarding-detail__meta-item">
              <span class="onboarding-detail__meta-label">Onboardee</span>
              <span class="onboarding-detail__meta-value">
                <a href={`/people/${item.personId}`}>{onboardeeName}</a>
              </span>
            </div>
          )}
        </div>

        {/* -- Progress bar ---------------------------------------------- */}
        {item.steps.length > 0 && (
          <div class="detail-section onboarding-detail__progress-section">
            <div class="onboarding-detail__progress-header">
              <span class="section-heading">Progress</span>
              <span class="onboarding-detail__progress-label">
                {done}/{item.steps.length} steps complete
              </span>
            </div>
            <progress class="progress-bar" value={pct} max={100} />
          </div>
        )}

        {/* -- Notes ------------------------------------------------------ */}
        {item.notes && (
          <div class="detail-section onboarding-detail__notes">
            <h2 class="section-heading">Notes</h2>
            <p class="onboarding-detail__notes-text">{item.notes}</p>
          </div>
        )}

        {/* -- Steps ------------------------------------------------------ */}
        {item.steps.length > 0 && (
          <section class="detail-section onboarding-detail__steps">
            <h2 class="section-heading">
              Steps ({item.steps.length})
            </h2>
            <div class="onboarding-detail__step-groups">
              {[...byCategory.entries()].map(([cat, steps]) => (
                <div key={cat} class="onboarding-detail__step-group">
                  <h3 class="onboarding-detail__step-group-title">
                    {STEP_CATEGORY_LABELS[
                      cat as keyof typeof STEP_CATEGORY_LABELS
                    ] ?? cat}
                  </h3>
                  <ul class="onboarding-detail__step-list">
                    {steps.map((step) => {
                      const ownerName = step.owner
                        ? (peopleById?.get(step.owner) ?? step.owner)
                        : null;
                      return (
                        <li
                          key={step.id}
                          class={`onboarding-detail__step onboarding-detail__step--${step.status}`}
                        >
                          <input
                            type="checkbox"
                            class="onboarding-detail__step-checkbox"
                            checked={step.status === "complete"}
                            aria-label={`Mark "${step.title}" complete`}
                            hx-post={`/onboarding/${item.id}/steps/${step.id}/toggle`}
                            hx-target="#onboarding-detail-root"
                            hx-select="#onboarding-detail-root"
                            hx-swap="outerHTML"
                          />
                          <span
                            class={`onboarding-detail__step-status badge badge--sm badge--${
                              step.status === "complete"
                                ? "success"
                                : step.status === "in_progress"
                                ? "accent"
                                : "neutral"
                            }`}
                          >
                            {STEP_STATUS_LABELS[step.status]}
                          </span>
                          <div class="onboarding-detail__step-title-wrap">
                            <span
                              class="onboarding-detail__step-title"
                              contenteditable
                              data-inline-edit
                              data-inline-original={step.title}
                              data-inline-target={`step-title-value-${step.id}`}
                              data-inline-save-btn={`step-title-save-${step.id}`}
                            >
                              {step.title}
                            </span>
                            <input
                              type="hidden"
                              id={`step-title-value-${step.id}`}
                              name="title"
                              value={step.title}
                            />
                            <button
                              type="button"
                              id={`step-title-save-${step.id}`}
                              class="btn btn--primary btn--sm is-hidden"
                              hx-post={`/onboarding/${item.id}/steps/${step.id}/title`}
                              hx-include={`#step-title-value-${step.id}`}
                              hx-target="#onboarding-detail-root"
                              hx-select="#onboarding-detail-root"
                              hx-swap="outerHTML"
                            >
                              Save
                            </button>
                            {step.owner && (
                              <a
                                class="onboarding-detail__step-owner"
                                href={`/people/${step.owner}`}
                              >
                                {ownerName}
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {item.steps.length === 0 && (
          <div class="detail-section">
            <p class="onboarding-detail__empty">
              No steps defined. Add steps via the API or MCP tools.
            </p>
          </div>
        )}

        {/* -- Audit meta ------------------------------------------------ */}
        <AuditMeta
          createdAt={item.createdAt}
          updatedAt={item.updatedAt}
          createdBy={item.createdBy}
          updatedBy={item.updatedBy}
        />
      </main>

      <div id="onboarding-form-container" />
    </MainLayout>
  );
};
