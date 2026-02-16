// Static class mappings for Tailwind JIT compatibility
export const PRIORITY_CLASSES = {
  1: {
    badge:
      "bg-red-600 text-white border border-red-700 dark:bg-red-500 dark:border-red-400",
  },
  2: {
    badge:
      "bg-orange-500 text-white border border-orange-600 dark:bg-orange-400 dark:text-orange-900 dark:border-orange-300",
  },
  3: {
    badge:
      "bg-yellow-400 text-yellow-900 border border-yellow-500 dark:bg-yellow-300 dark:text-yellow-900 dark:border-yellow-400",
  },
  4: {
    badge:
      "bg-blue-500 text-white border border-blue-600 dark:bg-blue-400 dark:text-blue-900 dark:border-blue-300",
  },
  5: {
    badge:
      "bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500",
  },
};

export const STATUS_CLASSES = {
  active:
    "border-l-4 border-l-gray-400 bg-gray-50 text-gray-700 dark:border-l-gray-500 dark:bg-gray-800 dark:text-gray-300",
  "on-track":
    "border-l-4 border-l-emerald-600 bg-emerald-50/50 text-gray-800 dark:border-l-emerald-400 dark:bg-emerald-900/20 dark:text-gray-200",
  "at-risk":
    "border-l-4 border-l-amber-500 bg-amber-50/50 text-gray-700 dark:border-l-amber-400 dark:bg-amber-900/20 dark:text-gray-300",
  late:
    "border-l-4 border-l-red-600 bg-red-50/50 text-gray-900 dark:border-l-red-400 dark:bg-red-900/20 dark:text-gray-100",
  "on-hold":
    "border-l-4 border-l-gray-300 bg-gray-50 text-gray-500 dark:border-l-gray-600 dark:bg-gray-800 dark:text-gray-400",
  completed:
    "border-l-4 border-l-gray-400 bg-gray-100 text-gray-600 dark:border-l-gray-500 dark:bg-gray-700 dark:text-gray-300",
};

export const TAG_CLASSES = "badge badge-tag";

export const DEADLINE_CLASSES = {
  overdue:
    "border-l-4 border-l-red-600 border border-red-200 bg-red-50/50 dark:border-l-red-400 dark:border-red-800 dark:bg-red-900/20",
  today:
    "border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50/50 dark:border-l-amber-400 dark:border-amber-700 dark:bg-amber-900/20",
  soon:
    "border-l-4 border-l-gray-400 border border-gray-200 bg-gray-50 dark:border-l-gray-500 dark:border-gray-600 dark:bg-gray-800",
};

export const SECTION_COLORS = [
  "gray-900",
  "gray-700",
  "gray-600",
  "gray-500",
  "gray-400",
  "gray-800",
  "gray-300",
  "gray-200",
];

// Portfolio View - Project status badge classes
export const PROJECT_STATUS_CLASSES = {
  planning:
    "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
  active:
    "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  "on-hold":
    "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
  completed:
    "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
};

// Portfolio View - Project status labels
export const PROJECT_STATUS_LABELS = {
  planning: "Planning",
  active: "Active",
  "on-hold": "On Hold",
  completed: "Completed",
};

// Priority hex colors for inline styles (timeline, charts)
export const PRIORITY_HEX_COLORS = {
  1: { bg: "#111827", border: "#030712" }, // gray-900
  2: { bg: "#374151", border: "#1f2937" }, // gray-700
  3: { bg: "#6b7280", border: "#4b5563" }, // gray-500
  4: { bg: "#9ca3af", border: "#6b7280" }, // gray-400
  5: { bg: "#d1d5db", border: "#9ca3af" }, // gray-300
  default: { bg: "#9ca3af", border: "#6b7280" },
  overdue: { bg: "#ef4444", border: "#dc2626" }, // red-500
};

export function getTaskBarColors(priority, isOverdue) {
  if (isOverdue) return PRIORITY_HEX_COLORS.overdue;
  return PRIORITY_HEX_COLORS[priority] || PRIORITY_HEX_COLORS.default;
}
