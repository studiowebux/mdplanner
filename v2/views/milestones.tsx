import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { MilestoneCard } from "./components/milestone-card.tsx";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps } from "../types/app.ts";

type Props = ViewProps & { milestones: Milestone[] };

export const MilestonesView: FC<Props> = ({ milestones, nonce }) => (
  <MainLayout
    title="Milestones"
    nonce={nonce}
    styles={["/css/views/milestones.css"]}
    scripts={["/js/milestones-sse.js"]}
  >
    <main class="milestones-page">
      <header class="milestones-page__header">
        <h1 class="milestones-page__title">Milestones</h1>
        <span class="milestones-page__count">{milestones.length} total</span>
      </header>

      {milestones.length === 0
        ? <p class="milestones-page__empty">No milestones yet.</p>
        : (
          <div id="milestones-grid" class="milestones-grid">
            {milestones.map((m) => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        )}
    </main>
  </MainLayout>
);
