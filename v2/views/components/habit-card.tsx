import type { FC } from "hono/jsx";
import type { Habit } from "../../types/habit.types.ts";
import { HABIT_FREQUENCY_LABELS } from "../../types/habit.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import {
  computeStreak,
  computeThisMonth,
  HABIT_FREQUENCY_VARIANTS,
  isDoneToday,
} from "../../domains/habit/constants.tsx";

type Props = { item: Habit; q?: string };

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export const HabitCard: FC<Props> = ({ item, q }) => {
  const streak = computeStreak(item.completedDates, item.frequency);
  const thisMonth = computeThisMonth(item.completedDates);
  const done = isDoneToday(item.completedDates);
  const daysThisMonth = daysInCurrentMonth();

  return (
    <DomainCard
      href={`/habits/${item.id}`}
      name={item.title}
      q={q}
      domain="habits"
      id={item.id}
      badge={
        <span class={badgeClass(HABIT_FREQUENCY_VARIANTS, item.frequency)}>
          {HABIT_FREQUENCY_LABELS[item.frequency]}
        </span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Streak">
          <span class="habit-streak">{streak}</span>
        </CardMetaItem>
        <CardMetaItem label="This month">
          {thisMonth} / {daysThisMonth}
        </CardMetaItem>
      </CardMeta>

      <button
        type="button"
        class={`btn btn--sm habit-log-btn${
          done ? " btn--success" : " btn--secondary"
        }`}
        {...(done
          ? {}
          : { "data-action": "log-today", "data-habit-id": item.id })}
        disabled={done}
      >
        {done ? "✓ Done today" : "Log today"}
      </button>
    </DomainCard>
  );
};
