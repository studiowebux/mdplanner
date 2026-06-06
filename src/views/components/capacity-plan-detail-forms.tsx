// Member + allocation sidenav forms, extracted from capacity-plan-detail.tsx
// to keep the main view lean. Re-exported from there so routes.tsx imports are
// unchanged. All htmx element ids + attributes are copied verbatim.

import type { FC } from "hono/jsx";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { WEEKDAYS } from "../../constants/mod.ts";
import type { TargetOption } from "../capacity-plan-detail.tsx";

const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const MemberForm: FC<{
  planId: string;
  personOptions: { value: string; label: string }[];
  actorName?: string;
  actorId?: string;
}> = ({ planId, personOptions: _personOptions, actorName, actorId }) => (
  <Sidenav id="capacity-plan-member-form" title="Add Team Member" open>
    <form
      class="form"
      hx-post={`/capacity-plans/${planId}/members`}
      hx-swap="none"
    >
      <div class="form__body">
        <div class="form__field">
          <label class="form__label" for="member-person-search">Person</label>
          <div class="form__autocomplete">
            <input
              type="text"
              id="member-person-search"
              class="form__input"
              placeholder="Search people..."
              autocomplete="off"
              name="q"
              data-autocomplete-target="member-personId"
              hx-get="/autocomplete/people"
              hx-trigger="input changed delay:150ms, focus"
              hx-target="#member-person-results"
              hx-include="this"
              hx-swap="innerHTML"
              value={actorName ?? ""}
            />
            <input
              type="hidden"
              id="member-personId"
              name="personId"
              value={actorId ?? ""}
            />
            <ul class="form__autocomplete-list" id="member-person-results" />
          </div>
        </div>
        <div class="form__field">
          <label class="form__label" for="member-hoursPerDay">
            Hours / day
          </label>
          <input
            id="member-hoursPerDay"
            name="hoursPerDay"
            type="number"
            min="1"
            max="24"
            value="8"
            class="form__input"
          />
        </div>
        <div class="form__field">
          <label class="form__label">Working days</label>
          <div class="form__day-chips" id="member-day-chips">
            {WEEKDAYS.map((day) => (
              <label key={day} class="form__day-chip">
                <input
                  type="checkbox"
                  value={day}
                  checked={DEFAULT_WORKING_DAYS.includes(day)}
                  data-day-chip="member-workingDays"
                />
                {day}
              </label>
            ))}
          </div>
          <input
            type="hidden"
            name="workingDays"
            id="member-workingDays"
            value={DEFAULT_WORKING_DAYS.join(",")}
          />
        </div>
      </div>
      <div class="form__footer">
        <button type="submit" class="btn btn--primary">Add Member</button>
        <button type="button" class="btn" data-sidenav-close>Cancel</button>
      </div>
    </form>
  </Sidenav>
);

export const AllocationForm: FC<{
  planId: string;
  memberOptions: { value: string; label: string }[];
  targetOptions: TargetOption[];
  allocId?: string;
  values?: {
    personId?: string;
    personName?: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
    percentage?: string;
    hoursPerWeek?: string;
    notes?: string;
  };
}> = (
  {
    planId,
    memberOptions: _memberOptions,
    targetOptions: _targetOptions,
    allocId,
    values,
  },
) => {
  const isEdit = !!allocId;
  const action = isEdit
    ? `/capacity-plans/${planId}/allocations/${allocId}`
    : `/capacity-plans/${planId}/allocations`;

  return (
    <Sidenav
      id="capacity-plan-allocation-form"
      title={isEdit ? "Edit Allocation" : "Add Allocation"}
      open
    >
      <form class="form" hx-post={action} hx-swap="none">
        <div class="form__body">
          <div class="form__field">
            <label class="form__label" for="alloc-person-search">Person</label>
            <div class="form__autocomplete">
              <input
                type="text"
                id="alloc-person-search"
                class="form__input"
                placeholder="Search team members..."
                autocomplete="off"
                name="q"
                data-autocomplete-target="alloc-personId"
                hx-get="/autocomplete/people"
                hx-trigger="input changed delay:150ms, focus"
                hx-target="#alloc-person-results"
                hx-include="this"
                hx-swap="innerHTML"
                value={values?.personName ?? ""}
              />
              <input
                type="hidden"
                id="alloc-personId"
                name="personId"
                value={values?.personId ?? ""}
              />
              <ul class="form__autocomplete-list" id="alloc-person-results" />
            </div>
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-target-search">
              Target (milestone or project)
            </label>
            <div class="form__autocomplete">
              <input
                type="text"
                id="alloc-target-search"
                class="form__input"
                placeholder="Search milestones & projects..."
                autocomplete="off"
                name="q"
                data-autocomplete-target="alloc-targetId"
                data-autofill-ids={JSON.stringify({
                  targettype: "alloc-targetType",
                })}
                hx-get="/autocomplete/capacity-targets"
                hx-trigger="input changed delay:150ms, focus"
                hx-target="#alloc-target-results"
                hx-include="this"
                hx-swap="innerHTML"
                value={values?.targetName ?? ""}
              />
              <input
                type="hidden"
                id="alloc-targetId"
                name="targetId"
                value={values?.targetId ?? ""}
              />
              <input
                type="hidden"
                id="alloc-targetType"
                name="targetType"
                value={values?.targetType ?? "milestone"}
              />
              <ul class="form__autocomplete-list" id="alloc-target-results" />
            </div>
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-percentage">
              Percentage (%)
            </label>
            <input
              id="alloc-percentage"
              name="percentage"
              type="number"
              min="0"
              max="200"
              step="5"
              class="form__input"
              placeholder="e.g. 80"
              value={values?.percentage ?? ""}
            />
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-hoursPerWeek">
              — or — Hours / week
            </label>
            <input
              id="alloc-hoursPerWeek"
              name="hoursPerWeek"
              type="number"
              min="0"
              step="1"
              class="form__input"
              placeholder="e.g. 20"
              value={values?.hoursPerWeek ?? ""}
            />
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-notes">Notes</label>
            <input
              id="alloc-notes"
              name="notes"
              type="text"
              class="form__input"
              placeholder="Optional"
              value={values?.notes ?? ""}
            />
          </div>
        </div>
        <div class="form__footer">
          <button type="submit" class="btn btn--primary">
            {isEdit ? "Save" : "Add Allocation"}
          </button>
          <button type="button" class="btn" data-sidenav-close>Cancel</button>
        </div>
      </form>
    </Sidenav>
  );
};
