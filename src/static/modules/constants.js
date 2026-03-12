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
  discovery: "badge-status-discovery",
  scoping: "badge-status-scoping",
  planning: "badge-status-planning",
  active: "badge-status-active",
  "on-hold": "badge-status-on-hold",
  completed: "badge-status-completed",
  production: "badge-status-production",
  maintenance: "badge-status-maintenance",
  cancelled: "badge-status-cancelled",
};

export const PROJECT_STATUS_LABELS = {
  discovery: "Discovery",
  scoping: "Scoping",
  planning: "Planning",
  active: "Active",
  "on-hold": "On Hold",
  completed: "Completed",
  production: "Production",
  maintenance: "Maintenance",
  cancelled: "Cancelled",
};

// Priority hex colors for inline styles (timeline, charts)
// Each entry has dark/light variants. text is computed from bg luminance.
export const PRIORITY_HEX_COLORS = {
  1: {
    dark:  { bg: "#111827", border: "#030712", text: "#ffffff" },
    light: { bg: "#1e3a8a", border: "#1e40af", text: "#ffffff" },
  },
  2: {
    dark:  { bg: "#374151", border: "#1f2937", text: "#ffffff" },
    light: { bg: "#1d4ed8", border: "#2563eb", text: "#ffffff" },
  },
  3: {
    dark:  { bg: "#6b7280", border: "#4b5563", text: "#ffffff" },
    light: { bg: "#3b82f6", border: "#1d4ed8", text: "#ffffff" },
  },
  4: {
    dark:  { bg: "#9ca3af", border: "#6b7280", text: "#1f2937" },
    light: { bg: "#93c5fd", border: "#60a5fa", text: "#1e3a8a" },
  },
  5: {
    dark:  { bg: "#d1d5db", border: "#9ca3af", text: "#1f2937" },
    light: { bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a8a" },
  },
  default: {
    dark:  { bg: "#9ca3af", border: "#6b7280", text: "#1f2937" },
    light: { bg: "#93c5fd", border: "#60a5fa", text: "#1e3a8a" },
  },
  overdue: {
    dark:  { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
    light: { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  },
};

export function getTaskBarColors(priority, isOverdue) {
  const mode = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
  if (isOverdue) return PRIORITY_HEX_COLORS.overdue[mode];
  return (PRIORITY_HEX_COLORS[priority] || PRIORITY_HEX_COLORS.default)[mode];
}
