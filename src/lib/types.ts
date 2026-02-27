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
  order?: number;
  attachments?: string[];
  project?: string;
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
    timeline?: {
      id: string;
      title: string;
      status: "success" | "failed" | "pending";
      date?: string;
      content: NoteParagraph[];
    }[];
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
  status?: string;
  statusComment?: string;
  category?: string;
  client?: string;
  revenue?: number;
  expenses?: number;
  features?: string[];
}

export interface Milestone {
  id: string;
  name: string;
  target?: string;
  status: "open" | "completed";
  description?: string;
  project?: string;
}

export interface Idea {
  id: string;
  title: string;
  status: "new" | "considering" | "planned" | "approved" | "rejected";
  category?: string;
  priority?: "high" | "medium" | "low";
  startDate?: string;
  endDate?: string;
  resources?: string;
  subtasks?: string[];
  created: string;
  description?: string;
  links?: string[]; // Zettelkasten-style linked idea IDs
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

export interface SwotAnalysis {
  id: string;
  title: string;
  date: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface RiskAnalysis {
  id: string;
  title: string;
  date: string;
  highImpactHighProb: string[];
  highImpactLowProb: string[];
  lowImpactHighProb: string[];
  lowImpactLowProb: string[];
}

export interface LeanCanvas {
  id: string;
  title: string;
  date: string;
  problem: string[];
  solution: string[];
  uniqueValueProp: string[];
  unfairAdvantage: string[];
  customerSegments: string[];
  existingAlternatives: string[];
  keyMetrics: string[];
  highLevelConcept: string[];
  channels: string[];
  earlyAdopters: string[];
  costStructure: string[];
  revenueStreams: string[];
}

export interface BusinessModelCanvas {
  id: string;
  title: string;
  date: string;
  keyPartners: string[];
  keyActivities: string[];
  keyResources: string[];
  valueProposition: string[];
  customerRelationships: string[];
  channels: string[];
  customerSegments: string[];
  costStructure: string[];
  revenueStreams: string[];
}

export interface ProjectValueBoard {
  id: string;
  title: string;
  date: string;
  customerSegments: string[];
  problem: string[];
  solution: string[];
  benefit: string[];
}

export interface Brief {
  id: string;
  title: string;
  date: string;
  summary: string[];
  mission: string[];
  responsible: string[];
  accountable: string[];
  consulted: string[];
  informed: string[];
  highLevelBudget: string[];
  highLevelTimeline: string[];
  culture: string[];
  changeCapacity: string[];
  guidingPrinciples: string[];
}

export interface TeamMemberRef {
  id: string;
  personId: string;
  hoursPerDay?: number;
  workingDays?: string[];
}

export interface WeeklyAllocation {
  id: string;
  memberId: string;
  weekStart: string;
  allocatedHours: number;
  targetType: "project" | "task" | "milestone";
  targetId?: string;
  notes?: string;
}

export interface CapacityPlan {
  id: string;
  title: string;
  date: string;
  budgetHours?: number;
  teamMembers: TeamMemberRef[];
  allocations: WeeklyAllocation[];
}

// Strategic Levels Builder
export const STRATEGIC_LEVEL_ORDER = [
  "vision",
  "mission",
  "goals",
  "objectives",
  "strategies",
  "tactics",
] as const;
export type StrategicLevelType = typeof STRATEGIC_LEVEL_ORDER[number];

export interface StrategicLevel {
  id: string;
  title: string;
  description?: string;
  level: StrategicLevelType;
  parentId?: string;
  order: number;
  linkedTasks?: string[];
  linkedMilestones?: string[];
}

export interface StrategicLevelsBuilder {
  id: string;
  title: string;
  date: string;
  levels: StrategicLevel[];
}

// Customer Billing and Quoting

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  created: string;
}

export interface BillingRate {
  id: string;
  name: string;
  hourlyRate: number;
  assignee?: string;
  isDefault?: boolean;
}

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Quote {
  id: string;
  number: string; // Q-2026-001
  customerId: string;
  title: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  validUntil?: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  notes?: string;
  created: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taskId?: string;
  timeEntryIds?: string[];
}

export interface Invoice {
  id: string;
  number: string; // INV-2026-001
  customerId: string;
  quoteId?: string;
  title: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  paidAmount: number;
  notes?: string;
  created: string;
  sentAt?: string;
  paidAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method?: "bank" | "card" | "cash" | "other";
  reference?: string;
  notes?: string;
}

// CRM Types

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  created: string;
}

export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary: boolean;
  notes?: string;
  created: string;
}

export interface Deal {
  id: string;
  companyId: string;
  contactId?: string;
  title: string;
  value: number;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  probability: number;
  expectedCloseDate?: string;
  notes?: string;
  created: string;
  closedAt?: string;
}

export interface Interaction {
  id: string;
  companyId: string;
  contactId?: string;
  dealId?: string;
  type: "email" | "call" | "meeting" | "note";
  summary: string;
  date: string;
  duration?: number;
  nextFollowUp?: string;
  notes?: string;
}

// People Registry Types

export interface Person {
  id: string;
  name: string;
  title?: string;
  role?: string;
  departments?: string[];
  reportsTo?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  hoursPerDay?: number;
  workingDays?: string[];
  notes?: string;
}

// MoSCoW Analysis Types

export interface MoscowAnalysis {
  id: string;
  title: string;
  date: string;
  must: string[];
  should: string[];
  could: string[];
  wont: string[];
}

// Eisenhower Matrix Types

export interface EisenhowerMatrix {
  id: string;
  title: string;
  date: string;
  urgentImportant: string[];
  notUrgentImportant: string[];
  urgentNotImportant: string[];
  notUrgentNotImportant: string[];
}

// Fundraising Types

export interface SAFEAgreement {
  id: string;
  investor: string;
  amount: number;
  valuation_cap: number;
  discount: number;
  type: "pre-money" | "post-money" | "mfn";
  date: string;
  status: "draft" | "signed" | "converted";
  notes: string;
}

export interface InvestorEntry {
  id: string;
  name: string;
  type: "vc" | "angel" | "family_office" | "corporate" | "accelerator";
  stage: "lead" | "associate" | "partner" | "passed";
  status: "not_started" | "in_progress" | "term_sheet" | "passed" | "invested";
  amount_target: number;
  contact: string;
  intro_date: string;
  last_contact: string;
  notes: string;
}

export interface KPISnapshot {
  id: string;
  period: string;
  mrr: number;
  arr: number;
  churn_rate: number;
  ltv: number;
  cac: number;
  growth_rate: number;
  active_users: number;
  nrr: number;
  gross_margin: number;
  notes: string;
}

// Employee Onboarding

export interface OnboardingStepDefinition {
  title: string;
  category: "equipment" | "accounts" | "docs" | "training" | "intro" | "other";
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description?: string;
  steps: OnboardingStepDefinition[];
  created: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  category: "equipment" | "accounts" | "docs" | "training" | "intro" | "other";
  status: "not_started" | "in_progress" | "complete";
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface Onboarding {
  id: string;
  employeeName: string;
  role: string;
  startDate: string; // YYYY-MM-DD
  personId?: string; // reference to people registry
  steps: OnboardingStep[];
  notes?: string; // markdown body
  created: string; // ISO timestamp
}

// Finances

export interface FinancePeriodItem {
  category: string;
  amount: number;
}

export interface FinancialPeriod {
  id: string;
  period: string; // "YYYY-MM"
  cash_on_hand: number; // end-of-period cash balance
  revenue: FinancePeriodItem[];
  expenses: FinancePeriodItem[];
  notes?: string; // markdown body
  created: string; // ISO timestamp
}

// Meeting Notes and Actions Tracker

export interface MeetingAction {
  id: string;
  description: string;
  owner?: string;
  due?: string; // YYYY-MM-DD
  status: "open" | "done";
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  attendees?: string[];
  agenda?: string;
  notes?: string; // markdown body
  actions: MeetingAction[];
  created: string; // ISO timestamp
}

// Journal

export type JournalMood = "great" | "good" | "neutral" | "bad" | "terrible";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title?: string; // optional; view shows date when absent
  mood?: JournalMood;
  tags?: string[];
  body: string; // markdown prose stored as file body
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
}

// Org Chart Types

export interface OrgChartMember {
  id: string;
  name: string;
  title: string;
  departments: string[];
  reportsTo?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  notes?: string;
}
