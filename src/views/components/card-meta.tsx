// Shared card metadata — dl/dt/dd wrapper for domain card components.
// Replaces per-card <dl class="domain-card__meta"> + conditional dt/dd pairs.

import type { Child } from "hono/jsx";

type CardMetaProps = { children: Child };

/** Wraps card metadata items in a semantic <dl>. */
export function CardMeta({ children }: CardMetaProps) {
  return <dl class="domain-card__meta">{children}</dl>;
}

type CardMetaItemProps = {
  label: string;
  children: Child;
};

/** Renders a single dt/dd pair inside a CardMeta. Returns null if children is falsy. */
export function CardMetaItem({ label, children }: CardMetaItemProps) {
  if (!children && children !== 0) return null;
  return (
    <>
      <dt class="domain-card__meta-label">{label}</dt>
      <dd class="domain-card__meta-value">{children}</dd>
    </>
  );
}
