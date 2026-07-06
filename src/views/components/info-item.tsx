// Shared info item — label + value pair for detail view overview rows.
// Replaces per-domain InfoItem components and __info-item CSS classes.

import type { Child } from "hono/jsx";

type InfoItemProps = {
  label: string;
  children: Child;
};

export function InfoItem({ label, children }: InfoItemProps) {
  return (
    <div class="detail-info-item">
      <span class="detail-info-label">{label}</span>
      <span class="detail-info-value">{children}</span>
    </div>
  );
}
