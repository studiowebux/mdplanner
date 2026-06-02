import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateVacationRequest,
  UpdateVacationRequest,
  VacationRequest,
  VacationRequestView,
} from "../../types/vacation.types.ts";
import {
  getPeopleService,
  getVacationService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  VACATION_FORM_FIELDS,
  VACATION_TABLE_COLUMNS,
  vacationToRow,
} from "./constants.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { VacationCard } from "../../views/components/vacation-card.tsx";

export const vacationConfig: DomainConfig<
  VacationRequest,
  CreateVacationRequest,
  UpdateVacationRequest
> = {
  name: "vacation",
  singular: "Vacation Request",
  plural: "Vacation Requests",
  path: "/vacation",
  ssePrefix: "vacation",
  styles: ["/css/views/vacation.css"],
  scripts: ["/js/vacation-calendar.js"],
  emptyMessage: "No vacation requests yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "status", "type", "personId", "q", "sort", "order"],
  columns: VACATION_TABLE_COLUMNS,
  formFields: VACATION_FORM_FIELDS,

  assigneeField: "personId",
  assigneeIsId: true,

  topSlot: async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const items = await getVacationService().list();
    const active = items.filter(
      (r) =>
        r.status !== "rejected" &&
        r.endDate >= monthStart &&
        r.startDate <= monthEnd,
    );
    let teamDays = 0;
    for (const r of active) {
      const start = new Date(
        Math.max(
          new Date(r.startDate).getTime(),
          new Date(monthStart).getTime(),
        ),
      );
      const end = new Date(
        Math.min(new Date(r.endDate).getTime(), new Date(monthEnd).getTime()),
      );
      teamDays += Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    }
    return (
      <p class="vacation-summary">
        <strong>{teamDays}</strong> team-day{teamDays !== 1 ? "s" : ""}{" "}
        off this month ({active.length} request{active.length !== 1 ? "s" : ""}
        {" "}
        pending or approved)
      </p>
    );
  },

  filters: [
    { name: "status", label: "All statuses", options: [] },
    { name: "type", label: "All types", options: [] },
  ],

  toRow: vacationToRow,

  Card: ({ item, q }) => <VacationCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(
      VACATION_FORM_FIELDS,
      body,
    ) as CreateVacationRequest;
    return {
      ...parsed,
      status: parsed.status ?? "pending",
    };
  },

  parseUpdate: (body) =>
    parseFormBody(VACATION_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateVacationRequest>,

  getService: () => getVacationService(),

  // Resolve personId → display name once per request and stamp `personName`
  // onto each item. This is the single async post-load hook that feeds the
  // table, card, and calendar render paths uniformly (toRow/Card are sync).
  customFilter: async (items) => {
    const people = await getPeopleService().list();
    const idToName = new Map(people.map((p) => [p.id, p.name]));
    return items.map((item): VacationRequestView => ({
      ...item,
      personName: idToName.get(item.personId),
    }));
  },

  extractFilterOptions: async () => {
    const items = await getVacationService().list();
    const statuses = [
      ...new Set(items.map((r) => r.status).filter(Boolean) as string[]),
    ].sort();
    const types = [
      ...new Set(items.map((r) => r.type).filter(Boolean) as string[]),
    ].sort();
    return { status: statuses, type: types };
  },

  searchPredicate: createSearchPredicate<VacationRequest>([
    { type: "string", get: (r) => r.personId },
    { type: "string", get: (r) => r.notes },
  ]),

  extraViewModes: [{ key: "calendar", label: "Calendar" }],

  customViewRenderer: async (view, _state, items) => {
    if (view !== "calendar") return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayNum = now.getDate();

    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

    const visible = items.filter(
      (r) =>
        r.status !== "rejected" &&
        r.endDate >= monthStart &&
        r.startDate <= monthEnd,
    );

    // Server-side overlap detection
    const conflictIds = new Set<string>();
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        if (
          visible[i].startDate <= visible[j].endDate &&
          visible[i].endDate >= visible[j].startDate
        ) {
          conflictIds.add(visible[i].id);
          conflictIds.add(visible[j].id);
        }
      }
    }

    const monthLabel = now.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div class="vacation-calendar">
        <div class="vacation-calendar__header">
          <span>{monthLabel}</span>
        </div>
        <div class="vacation-calendar__grid">
          <div
            class="vacation-calendar__days"
            data-days={daysInMonth}
          >
            {days.map((d) => (
              <div
                class={`vacation-calendar__day${
                  d === todayNum ? " vacation-calendar__day--today" : ""
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div class="vacation-calendar__rows">
            {visible.map((r) => {
              const start = new Date(
                Math.max(
                  new Date(r.startDate).getTime(),
                  new Date(monthStart).getTime(),
                ),
              );
              const end = new Date(
                Math.min(
                  new Date(r.endDate).getTime(),
                  new Date(monthEnd).getTime(),
                ),
              );
              const startDay = start.getDate();
              const endDay = end.getDate();
              const leftPct =
                (((startDay - 1) / daysInMonth) * 100).toFixed(2) + "%";
              const widthPct =
                (((endDay - startDay + 1) / daysInMonth) * 100).toFixed(2) +
                "%";
              const isConflict = conflictIds.has(r.id);
              const personLabel = (r as VacationRequestView).personName ??
                r.personId;
              const barClass = [
                "vacation-calendar__bar",
                `vacation-calendar__bar--${r.status}`,
                isConflict ? "vacation-calendar__bar--conflict" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div class="vacation-calendar__row">
                  <div
                    class={barClass}
                    data-left={leftPct}
                    data-width={widthPct}
                    title={`${personLabel} — ${r.startDate} to ${r.endDate}`}
                  >
                    {personLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div class="vacation-calendar__legend">
          <div class="vacation-calendar__legend-item">
            <span class="vacation-calendar__legend-swatch vacation-calendar__legend-swatch--approved" />
            <span>Approved</span>
          </div>
          <div class="vacation-calendar__legend-item">
            <span class="vacation-calendar__legend-swatch vacation-calendar__legend-swatch--pending" />
            <span>Pending</span>
          </div>
          <div class="vacation-calendar__legend-item">
            <span class="vacation-calendar__legend-swatch vacation-calendar__legend-swatch--conflict" />
            <span>Overlap</span>
          </div>
        </div>
      </div>
    );
  },
};
