// Analytics command center — cross-domain metrics, customer-centric filters, quick-add per section.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";

import type { ViewProps } from "../types/app.ts";
import type {
  AnalyticsData,
  AnalyticsFilters,
} from "../types/analytics.types.ts";

// ── filter option shapes ──────────────────────────────────────────────────────

type FilterOption = { id: string; label: string };

export type AnalyticsViewProps = ViewProps & {
  data: AnalyticsData;
  customers: FilterOption[];
  projects: FilterOption[];
  people: FilterOption[];
  hiddenSections: string[];
};

// ── section registry ──────────────────────────────────────────────────────────

export const ALL_SECTIONS: { key: string; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "goals", label: "Goals" },
  { key: "milestones", label: "Milestones" },
  { key: "timeEntries", label: "Time Tracking" },
  { key: "capacity", label: "Capacity Plans" },
  { key: "invoices", label: "Invoices" },
  { key: "quotes", label: "Quotes" },
  { key: "meetings", label: "Meetings" },
  { key: "customers", label: "Customers" },
  { key: "notes", label: "Notes" },
  { key: "investors", label: "Investors" },
  { key: "finances", label: "Finances" },
  { key: "deals", label: "Deals" },
  { key: "habits", label: "Habits" },
  { key: "journal", label: "Journal" },
  { key: "reflections", label: "Reflections" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function filterHref(
  base: AnalyticsFilters,
  patch: Partial<AnalyticsFilters>,
): string {
  const merged = { ...base, ...patch };
  const p = new URLSearchParams();
  if (merged.customer) p.set("customer", merged.customer);
  if (merged.project) p.set("project", merged.project);
  if (merged.person) p.set("person", merged.person);
  if (merged.from) p.set("from", merged.from);
  if (merged.to) p.set("to", merged.to);
  const qs = p.toString();
  return `/analytics${qs ? `?${qs}` : ""}`;
}

function pct(n: number | null): string {
  return n != null ? `${n}%` : "—";
}

// ── sub-components ─────────────────────────────────────────────────────────────

const CustomizePanel: FC<{ hiddenSections: string[] }> = (
  { hiddenSections },
) => (
  <details class="analytics__customize">
    <summary class="analytics__customize-toggle btn btn--sm btn--ghost">
      Customize
    </summary>
    <div class="analytics__customize-panel">
      <form
        hx-post="/analytics/customize"
        hx-target="#analytics-content"
        hx-swap="outerHTML"
      >
        <fieldset class="analytics__customize-fieldset">
          <legend class="analytics__customize-legend">Visible sections</legend>
          <div class="analytics__customize-checks">
            {ALL_SECTIONS.map(({ key, label }) => (
              <label key={key} class="analytics__customize-check">
                <input
                  type="checkbox"
                  name="sections"
                  value={key}
                  checked={!hiddenSections.includes(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div class="analytics__customize-actions">
          <button type="submit" class="btn btn--sm btn--primary">Apply</button>
        </div>
      </form>
    </div>
  </details>
);

const SectionHeader: FC<{
  title: string;
  sectionKey: string;
  addLabel: string;
  addRoute: string;
}> = ({ title, sectionKey, addLabel, addRoute }) => (
  <div class="analytics__section-header">
    <h2 class="analytics__section-title">{title}</h2>
    <button
      type="button"
      class="btn btn--sm btn--ghost"
      hx-get={addRoute}
      hx-target="#analytics-sidenav-container"
      hx-swap="innerHTML"
      data-sidenav-open={`analytics-add-${sectionKey}`}
    >
      + {addLabel}
    </button>
  </div>
);

const StatCard: FC<{ label: string; value: string | number }> = (
  { label, value },
) => (
  <div class="analytics__stat-card">
    <span class="analytics__stat-value">{value}</span>
    <span class="analytics__stat-label">{label}</span>
  </div>
);

const ByTable: FC<{ rows: [string, number | string][]; unit?: string }> = (
  { rows, unit = "" },
) => (
  <table class="data-table analytics__by-table">
    <tbody>
      {rows.map(([label, val]) => (
        <tr key={label} class="data-table__row">
          <td class="data-table__td analytics__by-label">{label}</td>
          <td class="data-table__td analytics__by-value">{val}{unit}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const MilestoneBar: FC<
  { name: string; done: number; total: number; progress: number }
> = (
  { name, done, total, progress },
) => (
  <div class="analytics__milestone-row">
    <div class="analytics__milestone-meta">
      <span class="analytics__milestone-name">{name}</span>
      <span class="analytics__milestone-count">{done}/{total}</span>
    </div>
    <div class="progress-bar">
      <div
        class="progress-bar__fill"
        data-pct={progress}
        style={`width:${progress}%`}
      />
    </div>
  </div>
);

// ── filter bar ────────────────────────────────────────────────────────────────

const FilterBar: FC<{
  filters: AnalyticsFilters;
  customers: FilterOption[];
  projects: FilterOption[];
  people: FilterOption[];
}> = ({ filters, customers, projects, people }) => (
  <form
    id="analytics-filters"
    class="analytics__filter-bar"
    hx-get="/analytics"
    hx-push-url="true"
    hx-target="#analytics-content"
    hx-swap="outerHTML"
    hx-trigger="change from:select, change from:input[type=date]"
  >
    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-customer">Customer</label>
      <select id="af-customer" name="customer" class="analytics__filter-select">
        <option value="">All customers</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id} selected={filters.customer === c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-project">Project</label>
      <select id="af-project" name="project" class="analytics__filter-select">
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id} selected={filters.project === p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-person">Person</label>
      <select id="af-person" name="person" class="analytics__filter-select">
        <option value="">All people</option>
        {people.map((p) => (
          <option key={p.id} value={p.id} selected={filters.person === p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-from">From</label>
      <input
        id="af-from"
        type="date"
        name="from"
        value={filters.from ?? ""}
        class="analytics__filter-input"
      />
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-to">To</label>
      <input
        id="af-to"
        type="date"
        name="to"
        value={filters.to ?? ""}
        class="analytics__filter-input"
      />
    </div>

    {(filters.customer || filters.project || filters.person || filters.from ||
      filters.to) && (
      <a
        href="/analytics"
        class="btn btn--sm btn--ghost analytics__filter-clear"
      >
        Clear filters
      </a>
    )}
  </form>
);

// ── inner content (partial for htmx, full for SSR) ───────────────────────────

type BodyProps = Omit<AnalyticsViewProps, keyof ViewProps>;

export const AnalyticsBody: FC<BodyProps> = (props) => {
  const { data, customers, projects, people, hiddenSections } = props;
  const { filters } = data;
  const visible = (key: string) => !hiddenSections.includes(key);

  return (
    <main class="analytics" id="analytics-content">
      <div class="analytics__header">
        <h1 class="analytics__title">Analytics</h1>
        <span class="analytics__generated">
          As of {new Date(data.generatedAt).toLocaleString()}
        </span>
        <CustomizePanel hiddenSections={hiddenSections} />
      </div>

      <FilterBar
        filters={filters}
        customers={customers}
        projects={projects}
        people={people}
      />

      {/* Tasks */}
      {visible("tasks") && (
        <section class="analytics__section">
          <SectionHeader
            title="Tasks"
            sectionKey="tasks"
            addLabel="Add Task"
            addRoute="/tasks/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.tasks.total} />
            {Object.entries(data.tasks.bySection).map(([sec, count]) => (
              <StatCard key={sec} label={sec} value={count} />
            ))}
          </div>
          <div class="analytics__row">
            {Object.keys(data.tasks.byProject).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Project</summary>
                <ByTable
                  rows={Object.entries(data.tasks.byProject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, v])}
                />
              </details>
            )}
            {Object.keys(data.tasks.byPriority).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">
                  By Priority
                </summary>
                <ByTable
                  rows={Object.entries(data.tasks.byPriority)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([k, v]) => [`Priority ${k}`, v])}
                />
              </details>
            )}
          </div>
        </section>
      )}

      {/* Goals */}
      {visible("goals") && (
        <section class="analytics__section">
          <SectionHeader
            title="Goals"
            sectionKey="goals"
            addLabel="Add Goal"
            addRoute="/goals/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.goals.total} />
          </div>
          <div class="analytics__row">
            {Object.keys(data.goals.byStatus).length > 0 && (
              <div class="analytics__col">
                <h3 class="analytics__col-title">By Status</h3>
                <ByTable
                  rows={Object.entries(data.goals.byStatus).map((
                    [k, v],
                  ) => [capitalize(k), v])}
                />
              </div>
            )}
            {Object.keys(data.goals.byType).length > 0 && (
              <div class="analytics__col">
                <h3 class="analytics__col-title">By Type</h3>
                <ByTable
                  rows={Object.entries(data.goals.byType).map((
                    [k, v],
                  ) => [capitalize(k), v])}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Milestones */}
      {visible("milestones") && (
        <section class="analytics__section">
          <SectionHeader
            title="Milestones"
            sectionKey="milestones"
            addLabel="Add Milestone"
            addRoute="/milestones/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.milestones.total} />
          </div>
          <details class="analytics__details" open>
            <summary class="analytics__details-summary">
              {data.milestones.total}{" "}
              milestone{data.milestones.total !== 1 ? "s" : ""}
            </summary>
            <div class="analytics__milestones">
              {data.milestones.milestones.map((m) => (
                <MilestoneBar
                  key={m.id}
                  name={m.name}
                  done={m.doneCount}
                  total={m.taskCount}
                  progress={m.progress}
                />
              ))}
            </div>
          </details>
        </section>
      )}

      {/* Time Entries */}
      {visible("timeEntries") && (
        <section class="analytics__section">
          <SectionHeader
            title="Time Tracking"
            sectionKey="timeEntries"
            addLabel="Log Time"
            addRoute="/tasks/new"
          />
          <div class="analytics__stat-grid">
            <StatCard
              label="Total Hours"
              value={`${data.timeEntries.totalHours}h`}
            />
            <StatCard label="Entries" value={data.timeEntries.entryCount} />
          </div>
          <div class="analytics__row">
            {Object.keys(data.timeEntries.byPerson).length > 0 && (
              <div class="analytics__col">
                <h3 class="analytics__col-title">By Person</h3>
                <ByTable
                  rows={Object.entries(data.timeEntries.byPerson)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, `${v}h`])}
                />
              </div>
            )}
            {Object.keys(data.timeEntries.byProject).length > 0 && (
              <div class="analytics__col">
                <h3 class="analytics__col-title">By Project</h3>
                <ByTable
                  rows={Object.entries(data.timeEntries.byProject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, `${v}h`])}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Capacity */}
      {visible("capacity") && (
        <section class="analytics__section">
          <SectionHeader
            title="Capacity Plans"
            sectionKey="capacity"
            addLabel="Add Plan"
            addRoute="/capacity-plans/new"
          />
          {data.capacity.plans.length === 0
            ? <p class="analytics__empty">No capacity plans yet.</p>
            : (
              <table class="data-table analytics__capacity-table">
                <thead>
                  <tr class="data-table__head-row">
                    <th class="data-table__th">Plan</th>
                    <th class="data-table__th">Budget (h)</th>
                    <th class="data-table__th">Allocated (h)</th>
                    <th class="data-table__th">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {data.capacity.plans.map((p) => (
                    <tr key={p.id} class="data-table__row">
                      <td class="data-table__td">
                        <a href={`/capacity-plans/${p.id}`}>{p.name}</a>
                      </td>
                      <td class="data-table__td">{p.budgetHours ?? "—"}</td>
                      <td class="data-table__td">{p.allocatedHours}h</td>
                      <td class="data-table__td analytics__utilization">
                        <div class="analytics__util-row">
                          <span>{pct(p.utilizationPct)}</span>
                          {p.utilizationPct != null && (
                            <div class="progress-bar analytics__util-bar">
                              <div
                                class="progress-bar__fill"
                                data-pct={p.utilizationPct}
                                style={`width:${
                                  Math.min(p.utilizationPct, 100)
                                }%`}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>
      )}

      {/* Invoices */}
      {visible("invoices") && (
        <section class="analytics__section">
          <SectionHeader
            title="Invoices"
            sectionKey="invoices"
            addLabel="Add Invoice"
            addRoute="/invoices/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.invoices.total} />
            <StatCard
              label="Revenue"
              value={formatCurrency(data.invoices.totalAmount)}
            />
          </div>
          {Object.keys(data.invoices.byStatus).length > 0 && (
            <ByTable
              rows={Object.entries(data.invoices.byStatus).map(([s, count]) => [
                capitalize(s),
                `${count} (${
                  formatCurrency(data.invoices.amountByStatus[s] ?? 0)
                })`,
              ])}
            />
          )}
        </section>
      )}

      {/* Quotes */}
      {visible("quotes") && (
        <section class="analytics__section">
          <SectionHeader
            title="Quotes"
            sectionKey="quotes"
            addLabel="Add Quote"
            addRoute="/quotes/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.quotes.total} />
            <StatCard
              label="Pipeline"
              value={formatCurrency(data.quotes.totalAmount)}
            />
          </div>
          {Object.keys(data.quotes.byStatus).length > 0 && (
            <ByTable
              rows={Object.entries(data.quotes.byStatus).map(([s, count]) => [
                capitalize(s),
                `${count} (${
                  formatCurrency(data.quotes.amountByStatus[s] ?? 0)
                })`,
              ])}
            />
          )}
        </section>
      )}

      {/* Meetings */}
      {visible("meetings") && (
        <section class="analytics__section">
          <SectionHeader
            title="Meetings"
            sectionKey="meetings"
            addLabel="Add Meeting"
            addRoute="/meetings/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.meetings.total} />
          </div>
          {Object.keys(data.meetings.byProject).length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">By Project</summary>
              <ByTable rows={Object.entries(data.meetings.byProject)} />
            </details>
          )}
        </section>
      )}

      {/* Customers */}
      {visible("customers") && (
        <section class="analytics__section">
          <SectionHeader
            title="Customers"
            sectionKey="customers"
            addLabel="Add Customer"
            addRoute="/customers/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.customers.total} />
          </div>
        </section>
      )}

      {/* Notes */}
      {visible("notes") && (
        <section class="analytics__section">
          <SectionHeader
            title="Notes"
            sectionKey="notes"
            addLabel="Add Note"
            addRoute="/notes/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.notes.total} />
          </div>
          <div class="analytics__row">
            {Object.keys(data.notes.byType).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Type</summary>
                <ByTable
                  rows={Object.entries(data.notes.byType).map((
                    [k, v],
                  ) => [capitalize(k), v])}
                />
              </details>
            )}
            {Object.keys(data.notes.byProject).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Project</summary>
                <ByTable
                  rows={Object.entries(data.notes.byProject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, v])}
                />
              </details>
            )}
          </div>
        </section>
      )}

      {/* Investors */}
      {visible("investors") && (
        <section class="analytics__section">
          <SectionHeader
            title="Investors"
            sectionKey="investors"
            addLabel="Add Investor"
            addRoute="/investors/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.investors.total} />
            <StatCard
              label="Target Amount"
              value={formatCurrency(data.investors.totalTargetAmount)}
            />
          </div>
          {Object.keys(data.investors.byStatus).length > 0 && (
            <div class="analytics__col">
              <h3 class="analytics__col-title">By Status</h3>
              <ByTable
                rows={Object.entries(data.investors.byStatus).map(([k, v]) => [
                  capitalize(k),
                  v,
                ])}
              />
            </div>
          )}
        </section>
      )}

      {/* Finances */}
      {visible("finances") && (
        <section class="analytics__section">
          <SectionHeader
            title="Finances"
            sectionKey="finances"
            addLabel="Add Entry"
            addRoute="/finances/new"
          />
          <div class="analytics__stat-grid">
            <StatCard
              label="Income"
              value={formatCurrency(data.finances.totalIncome)}
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(data.finances.totalExpenses)}
            />
            <StatCard
              label="Balance"
              value={formatCurrency(data.finances.balance)}
            />
          </div>
        </section>
      )}

      {/* Deals */}
      {visible("deals") && (
        <section class="analytics__section">
          <SectionHeader
            title="Deals"
            sectionKey="deals"
            addLabel="Add Deal"
            addRoute="/deals/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.deals.total} />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(data.deals.totalValue)}
            />
          </div>
          {Object.keys(data.deals.byStage).length > 0 && (
            <div class="analytics__col">
              <h3 class="analytics__col-title">By Stage</h3>
              <ByTable
                rows={Object.entries(data.deals.byStage).map(([k, v]) => [
                  capitalize(k),
                  v,
                ])}
              />
            </div>
          )}
        </section>
      )}

      {/* Habits */}
      {visible("habits") && (
        <section class="analytics__section">
          <SectionHeader
            title="Habits"
            sectionKey="habits"
            addLabel="Add Habit"
            addRoute="/habits/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.habits.total} />
            <StatCard
              label="Completion (this month)"
              value={data.habits.completionRateThisMonth != null
                ? `${data.habits.completionRateThisMonth}%`
                : "—"}
            />
          </div>
        </section>
      )}

      {/* Journal */}
      {visible("journal") && (
        <section class="analytics__section">
          <SectionHeader
            title="Journal"
            sectionKey="journal"
            addLabel="Add Entry"
            addRoute="/journal/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total Entries" value={data.journal.total} />
            <StatCard label="This Month" value={data.journal.thisMonth} />
            <StatCard label="This Week" value={data.journal.thisWeek} />
            <StatCard
              label="Current Streak"
              value={`${data.journal.streak}d`}
            />
          </div>
        </section>
      )}

      {/* Reflections */}
      {visible("reflections") && (
        <section class="analytics__section">
          <SectionHeader
            title="Reflections"
            sectionKey="reflections"
            addLabel="Add Reflection"
            addRoute="/reflections/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.reflections.total} />
            <StatCard label="This Month" value={data.reflections.thisMonth} />
          </div>
        </section>
      )}
    </main>
  );
};

// ── full page view ────────────────────────────────────────────────────────────

export const AnalyticsView: FC<AnalyticsViewProps> = (props) => {
  const { data, customers, projects, people, hiddenSections, ...vp } = props;
  return (
    <MainLayout
      title="Analytics"
      {...vp}
      activePath="/analytics"
      styles={["/css/views/analytics.css"]}
    >
      <div id="analytics-sidenav-container" />
      <AnalyticsBody
        data={data}
        customers={customers}
        projects={projects}
        people={people}
        hiddenSections={hiddenSections}
      />
    </MainLayout>
  );
};
