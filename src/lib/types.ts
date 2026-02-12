export interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  person?: string;
  description?: string;
}

export interface TaskConfig {
  tag?: string[];
  due_date?: string;
  assignee?: string;
  priority?: number;
  effort?: number;
  blocked_by?: string[];
  milestone?: string;
  planned_start?: string;
  planned_end?: string;
  time_entries?: TimeEntry[];
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  section: string;
  config: TaskConfig;
  description?: string[];
  children?: Task[];
  parentId?: string;
}

export interface NoteParagraph {
  id: string;
  type: "text" | "code";
  content: string;
  language?: string; // For code blocks
  order: number;
  metadata?: {
    collapsed?: boolean;
    readonly?: boolean;
    tags?: string[];
  };
}

export interface CustomSection {
  id: string;
  type: "tabs" | "timeline" | "split-view";
  title: string;
  order: number;
  config: {
    tabs?: { id: string; title: string; content: NoteParagraph[] }[];
    timeline?: { id: string; title: string; status: "success" | "failed" | "pending"; date?: string; content: NoteParagraph[] }[];
    splitView?: { columns: NoteParagraph[][] };
  };
}

export interface Note {
  id: string;
  title: string;
  content: string; // Keep for backward compatibility
  paragraphs?: NoteParagraph[];
  customSections?: CustomSection[];
  createdAt: string;
  updatedAt: string;
  revision: number;
  mode?: "simple" | "enhanced"; // Simple uses content, enhanced uses paragraphs
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: "enterprise" | "project";
  kpi: string;
  startDate: string;
  endDate: string;
  status: "planning" | "on-track" | "at-risk" | "late" | "success" | "failed";
}

export interface StickyNote {
  id: string;
  content: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface MindmapNode {
  id: string;
  text: string;
  level: number;
  children: MindmapNode[];
  parent?: string;
}

export interface Mindmap {
  id: string;
  title: string;
  nodes: MindmapNode[];
}

export interface C4Component {
  id: string;
  name: string;
  level: "context" | "container" | "component" | "code";
  type: string;
  technology?: string;
  description: string;
  position: { x: number; y: number };
  connections?: { target: string; label: string }[];
  children?: string[];
  parent?: string;
}

export interface ProjectInfo {
  name: string;
  description: string[];
  notes: Note[];
  goals: Goal[];
  stickyNotes: StickyNote[];
  mindmaps: Mindmap[];
  c4Components?: C4Component[];
}

export interface ProjectLink {
  title: string;
  url: string;
}

export interface ProjectConfig {
  startDate?: string;
  workingDaysPerWeek?: number;
  workingDays?: string[]; // e.g., ["Mon", "Tue", "Wed", "Thu", "Fri"]
  assignees?: string[];
  tags?: string[];
  lastUpdated?: string;
  links?: ProjectLink[];
}

export interface Milestone {
  id: string;
  name: string;
  target?: string;
  status: "open" | "completed";
  description?: string;
}

export interface Idea {
  id: string;
  title: string;
  status: "new" | "considering" | "planned" | "rejected";
  category?: string;
  created: string;
  description?: string;
}

export interface Retrospective {
  id: string;
  title: string;
  date: string;
  status: "open" | "closed";
  continue: string[];
  stop: string[];
  start: string[];
}
