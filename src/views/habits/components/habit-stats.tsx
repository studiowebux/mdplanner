// Habit detail stats row — streak, longest streak, this month, all time,
// last completed, frequency. Rendered on the detail page and OOB-swapped
// from the toggle/completion endpoints so stats stay fresh without a reload.

import type { FC } from "hono/jsx";
import type { Habit } from "../../../types/habit.types.ts";
import { HABIT_FREQUENCY_LABELS } from "../../../types/habit.types.ts";
import { InfoItem } from "../../components/info-item.tsx";
import {
  computeLongestStreak,
  computeStreak,
  computeThisMonth,
  doneDates,
  lastCompleted,
  periodDenominator,
} from "../../../domains/habit/constants.tsx";

export const HabitStats: FC<{ habit: Habit; oob?: boolean }> = (
  { habit, oob },
) => {
  const target = habit.targetPerPeriod ?? 1;
  const streak = computeStreak(habit.completedDates, habit.frequency, target);
  const longestStreak = computeLongestStreak(
    habit.completedDates,
    habit.frequency,
    target,
  );
  const thisMonth = computeThisMonth(habit.completedDates, target);
  const allTime = doneDates(habit.completedDates, target).size;
  const lastDone = lastCompleted(habit.completedDates);

  return (
    <div
      id="habit-stats"
      class="detail-section detail-info-row"
      {...(oob ? { "hx-swap-oob": "true" } : {})}
    >
      <InfoItem label="Streak">
        <span class="habit-streak">{streak}</span>
      </InfoItem>
      <InfoItem label="Longest streak">
        <span class="habit-streak">{longestStreak}</span>
      </InfoItem>
      <InfoItem label="This month">
        {thisMonth} / {periodDenominator(habit.frequency)}
      </InfoItem>
      <InfoItem label="All time">{String(allTime)}</InfoItem>
      <InfoItem label="Last completed">{lastDone}</InfoItem>
      <InfoItem label="Frequency">
        {HABIT_FREQUENCY_LABELS[habit.frequency]}
      </InfoItem>
    </div>
  );
};
