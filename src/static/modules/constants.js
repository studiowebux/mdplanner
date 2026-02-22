// Semantic class mappings — uses CSS classes from components.css
export const PRIORITY_CLASSES = {
  1: { badge: "badge-priority-1" },
  2: { badge: "badge-priority-2" },
  3: { badge: "badge-priority-3" },
  4: { badge: "badge-priority-4" },
  5: { badge: "badge-priority-5" },
};

export const STATUS_CLASSES = {
  active: "task-status-active",
  "on-track": "task-status-on-track",
  "at-risk": "task-status-at-risk",
  late: "task-status-late",
  "on-hold": "task-status-on-hold",
  completed: "task-status-completed",
};

export const TAG_CLASSES = "badge badge-tag";

export const DEADLINE_CLASSES = {
  overdue: "deadline-overdue",
  today: "deadline-today",
  soon: "deadline-soon",
};

export const PROJECT_STATUS_CLASSES = {
  planning: "badge-status-planning",
  active: "badge-status-active",
  "on-hold": "badge-status-on-hold",
  completed: "badge-status-completed",
};

export const PROJECT_STATUS_LABELS = {
  planning: "Planning",
  active: "Active",
  "on-hold": "On Hold",
  completed: "Completed",
};

// Priority hex colors for inline styles (timeline, charts)
export const PRIORITY_HEX_COLORS = {
  1: { bg: "#111827", border: "#030712" },
  2: { bg: "#374151", border: "#1f2937" },
  3: { bg: "#6b7280", border: "#4b5563" },
  4: { bg: "#9ca3af", border: "#6b7280" },
  5: { bg: "#d1d5db", border: "#9ca3af" },
  default: { bg: "#9ca3af", border: "#6b7280" },
  overdue: { bg: "#ef4444", border: "#dc2626" },
};

export function getTaskBarColors(priority, isOverdue) {
  if (isOverdue) return PRIORITY_HEX_COLORS.overdue;
  return PRIORITY_HEX_COLORS[priority] || PRIORITY_HEX_COLORS.default;
}
