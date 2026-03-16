import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { MilestoneCard } from "./components/milestone-card.tsx";
import { MilestoneForm } from "./components/milestone-form.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps } from "../types/app.ts";

type Props = ViewProps & { milestones: Milestone[] };

export const MilestonesView: FC<Props> = ({ milestones, nonce, activePath }) => (
  <MainLayout
    title="Milestones"
    nonce={nonce}
    activePath={activePath}
    styles={["/css/views/milestones.css"]}
    scripts={["/js/milestones-sse.js", "/js/milestones-form.js"]}
  >
    <main class="milestones-page">
      <header class="milestones-page__header">
        <h1 class="milestones-page__title">Milestones</h1>
        <span class="milestones-page__count">{milestones.length} total</span>
        <button
          class="btn btn--primary"
          type="button"
          data-sidenav-open="milestone-form"
          data-milestone-action="create"
        >
          New
        </button>
      </header>

      {milestones.length === 0
        ? <EmptyState message="No milestones yet. Create one to get started." />
        : (
          <div id="milestones-grid" class="milestones-grid">
            {milestones.map((m) => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        )}
    </main>
    <MilestoneForm />
  </MainLayout>
);
