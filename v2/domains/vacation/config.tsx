import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateVacationRequest,
  UpdateVacationRequest,
  VacationRequest,
} from "../../types/vacation.types.ts";
import { getVacationService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  VACATION_FORM_FIELDS,
  VACATION_STATUS_VARIANTS,
  VACATION_TABLE_COLUMNS,
  vacationToRow,
} from "./constants.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { badgeClass } from "../../components/ui/status-badge.tsx";

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
  emptyMessage: "No vacation requests yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "status", "type", "personId", "q", "sort", "order"],
  columns: VACATION_TABLE_COLUMNS,
  formFields: VACATION_FORM_FIELDS,

  assigneeField: "personId",
  assigneeIsId: true,

  filters: [
    { name: "status", label: "All statuses", options: [] },
    { name: "type", label: "All types", options: [] },
  ],

  toRow: vacationToRow,

  Card: ({ item }) => (
    <div class="vacation-card">
      <div class="vacation-card__header">
        <a href={`/people/${item.personId}`} class="vacation-card__person">
          {item.personId}
        </a>
        <span class={badgeClass(VACATION_STATUS_VARIANTS, item.status)}>
          {item.status}
        </span>
      </div>
      <div class="vacation-card__dates">
        {item.startDate} → {item.endDate}
      </div>
      <div class="vacation-card__type">{item.type}</div>
    </div>
  ),

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
};
