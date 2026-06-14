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

type Props = { item: Habit; q?: string; oobSwap?: string };

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export const HabitCard: FC<Props> = ({ item, q, oobSwap }) => {
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
      oobSwap={oobSwap}
      badge={
        <span class={badgeClass(HABIT_FREQUENCY_VARIANTS, item.frequency)}>
          {HABIT_FREQUENCY_LABELS[item.frequency]}
        </span>
      }
    >
      <CardMeta>
        {item.description && (
          <CardMetaItem label="Notes">{item.description}</CardMetaItem>
        )}
        <CardMetaItem label="Streak">
          <span class="habit-streak">{streak}</span>
        </CardMetaItem>
        <CardMetaItem label="This month">
          {thisMonth} / {daysThisMonth}
        </CardMetaItem>
        <CardMetaItem label="Today">
          {done ? "✓" : "—"}
        </CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
