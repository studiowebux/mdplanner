/**
 * Directory-based Markdown Parser.
 * Composes individual section parsers to provide the same interface
 * as the single-file MarkdownParser.
 */
import { type ProjectData, ProjectDirectoryParser } from "./project.ts";
import { NotesDirectoryParser } from "./notes.ts";
import { GoalsDirectoryParser } from "./goals.ts";
import { TasksDirectoryParser } from "./tasks.ts";
import { CanvasDirectoryParser } from "./canvas.ts";
import { MindmapsDirectoryParser } from "./mindmaps.ts";
import { C4DirectoryParser } from "./c4.ts";
import { MilestonesDirectoryParser } from "./milestones.ts";
import { IdeasDirectoryParser } from "./ideas.ts";
import { RetrospectivesDirectoryParser } from "./retrospectives.ts";
import { SwotDirectoryParser } from "./swot.ts";
import { RiskDirectoryParser } from "./risk.ts";
import { LeanCanvasDirectoryParser } from "./lean-canvas.ts";
import { BusinessModelDirectoryParser } from "./business-model.ts";
import { ProjectValueDirectoryParser } from "./project-value.ts";
import { BriefDirectoryParser } from "./brief.ts";
import { CapacityDirectoryParser } from "./capacity.ts";
import { StrategicLevelsDirectoryParser } from "./strategic-levels.ts";
import { BillingDirectoryParser } from "./billing.ts";
import { CRMDirectoryParser } from "./crm.ts";
import {
  PortfolioDirectoryParser,
  type PortfolioItem,
  type PortfolioKPI,
  type PortfolioSummary,
} from "./portfolio.ts";
// OrgChart types re-exported from people parser (orgchart delegates to people)
import type {
  PeopleSummary as OrgChartSummary,
  PersonWithChildren as OrgChartMemberWithChildren,
} from "./people.ts";
import { MoscowDirectoryParser } from "./moscow.ts";
import { EisenhowerDirectoryParser } from "./eisenhower.ts";
import { SafeDirectoryParser } from "./safe.ts";
import { InvestorDirectoryParser } from "./investors.ts";
import { KpiDirectoryParser } from "./kpis.ts";
import {
  PeopleDirectoryParser,
  type PeopleSummary,
  type PersonWithChildren,
} from "./people.ts";
import { MeetingsDirectoryParser } from "./meetings.ts";
import { OnboardingDirectoryParser } from "./onboarding.ts";
import { OnboardingTemplateDirectoryParser } from "./onboarding-template.ts";
import { FinancesDirectoryParser } from "./finances.ts";
import { JournalDirectoryParser } from "./journal.ts";
import { DnsDomainParser } from "./dns.ts";
import { HabitsDirectoryParser } from "./habits.ts";
import type {
  BillingRate,
  Brief,
  BusinessModelCanvas,
  C4Component,
  CapacityPlan,
  Company,
  Contact,
  Customer,
  Deal,
  DnsDomain,
  EisenhowerMatrix,
  FinancialPeriod,
  Goal,
  Habit,
  Idea,
  Interaction,
  InvestorEntry,
  Invoice,
  JournalEntry,
  KPISnapshot,
  LeanCanvas,
  Meeting,
  Milestone,
  Mindmap,
  MoscowAnalysis,
  Note,
  Onboarding,
  OnboardingTemplate,
  Payment,
  Person,
  ProjectConfig,
  ProjectInfo,
  ProjectValueBoard,
  Quote,
  Retrospective,
  RiskAnalysis,
  SAFEAgreement,
  StickyNote,
  StrategicLevel,
  StrategicLevelsBuilder,
  SwotAnalysis,
  Task,
  TaskConfig,
  TeamMemberRef,
  TimeEntry,
  WeeklyAllocation,
} from "../../types.ts";

export class DirectoryMarkdownParser {
  public projectDir: string;

  protected projectParser: ProjectDirectoryParser;
  protected notesParser: NotesDirectoryParser;
  protected goalsParser: GoalsDirectoryParser;
  protected tasksParser: TasksDirectoryParser;
  protected canvasParser: CanvasDirectoryParser;
  protected mindmapsParser: MindmapsDirectoryParser;
  protected c4Parser: C4DirectoryParser;
  protected milestonesParser: MilestonesDirectoryParser;
  protected ideasParser: IdeasDirectoryParser;
  protected retrospectivesParser: RetrospectivesDirectoryParser;
  protected swotParser: SwotDirectoryParser;
  protected riskParser: RiskDirectoryParser;
  protected leanCanvasParser: LeanCanvasDirectoryParser;
  protected businessModelParser: BusinessModelDirectoryParser;
  protected projectValueParser: ProjectValueDirectoryParser;
  protected briefParser: BriefDirectoryParser;
  protected capacityParser: CapacityDirectoryParser;
  protected strategicLevelsParser: StrategicLevelsDirectoryParser;
  protected billingParser: BillingDirectoryParser;
  protected crmParser: CRMDirectoryParser;
  protected portfolioParser: PortfolioDirectoryParser;
  protected moscowParser: MoscowDirectoryParser;
  protected eisenhowerParser: EisenhowerDirectoryParser;
  protected safeParser: SafeDirectoryParser;
  protected investorParser: InvestorDirectoryParser;
  protected kpiParser: KpiDirectoryParser;
  protected peopleParser: PeopleDirectoryParser;
  protected meetingsParser: MeetingsDirectoryParser;
  protected onboardingParser: OnboardingDirectoryParser;
  protected onboardingTemplateParser: OnboardingTemplateDirectoryParser;
  protected financesParser: FinancesDirectoryParser;
  protected journalParser: JournalDirectoryParser;
  protected dnsParser: DnsDomainParser;
  protected habitsParser: HabitsDirectoryParser;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.projectParser = new ProjectDirectoryParser(projectDir);
    this.notesParser = new NotesDirectoryParser(projectDir);
    this.goalsParser = new GoalsDirectoryParser(projectDir);
    this.tasksParser = new TasksDirectoryParser(projectDir);
    this.canvasParser = new CanvasDirectoryParser(projectDir);
    this.mindmapsParser = new MindmapsDirectoryParser(projectDir);
    this.c4Parser = new C4DirectoryParser(projectDir);
    this.milestonesParser = new MilestonesDirectoryParser(projectDir);
    this.ideasParser = new IdeasDirectoryParser(projectDir);
    this.retrospectivesParser = new RetrospectivesDirectoryParser(projectDir);
    this.swotParser = new SwotDirectoryParser(projectDir);
    this.riskParser = new RiskDirectoryParser(projectDir);
    this.leanCanvasParser = new LeanCanvasDirectoryParser(projectDir);
    this.businessModelParser = new BusinessModelDirectoryParser(projectDir);
    this.projectValueParser = new ProjectValueDirectoryParser(projectDir);
    this.briefParser = new BriefDirectoryParser(projectDir);
    this.capacityParser = new CapacityDirectoryParser(projectDir);
    this.strategicLevelsParser = new StrategicLevelsDirectoryParser(projectDir);
    this.billingParser = new BillingDirectoryParser(projectDir);
    this.crmParser = new CRMDirectoryParser(projectDir);
    this.portfolioParser = new PortfolioDirectoryParser(projectDir);
    this.moscowParser = new MoscowDirectoryParser(projectDir);
    this.eisenhowerParser = new EisenhowerDirectoryParser(projectDir);
    this.safeParser = new SafeDirectoryParser(projectDir);
    this.investorParser = new InvestorDirectoryParser(projectDir);
    this.kpiParser = new KpiDirectoryParser(projectDir);
    this.peopleParser = new PeopleDirectoryParser(projectDir);
    this.meetingsParser = new MeetingsDirectoryParser(projectDir);
    this.onboardingParser = new OnboardingDirectoryParser(projectDir);
    this.onboardingTemplateParser = new OnboardingTemplateDirectoryParser(
      projectDir,
    );
    this.financesParser = new FinancesDirectoryParser(projectDir);
    this.journalParser = new JournalDirectoryParser(projectDir);
    this.dnsParser = new DnsDomainParser(projectDir);
    this.habitsParser = new HabitsDirectoryParser(projectDir);
  }

  // ============================================================
  // Project Info & Config
  // ============================================================

  async readProjectInfo(): Promise<ProjectInfo> {
    const projectData = await this.projectParser.read();
    const notes = await this.notesParser.readAll();
    const goals = await this.goalsParser.readAll();
    const stickyNotes = await this.canvasParser.readAll();
    const mindmaps = await this.mindmapsParser.readAll();
    const c4Components = await this.c4Parser.readAll();

    return {
      name: projectData.name,
      description: projectData.description,
      notes,
      goals,
      stickyNotes,
      mindmaps,
      c4Components,
    };
  }

  async readProjectConfig(): Promise<ProjectConfig> {
    const projectData = await this.projectParser.read();
    return projectData.config;
  }

  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    await this.projectParser.updateConfig(config);
  }

  /**
   * Bump lastUpdated in project.md without changing any other config fields.
   * Call after any user-visible mutation (task, note, goal, etc.).
   */
  async touchLastUpdated(): Promise<void> {
    await this.projectParser.updateConfig({});
  }

  async saveProjectName(name: string): Promise<void> {
    await this.projectParser.updateName(name);
  }

  async saveProjectDescription(description: string[]): Promise<void> {
    await this.projectParser.updateDescription(description);
  }

  async setIntegrationSecret(
    integrationId: string,
    key: string,
    value: string,
  ): Promise<void> {
    return this.projectParser.setIntegrationSecret(integrationId, key, value);
  }

  async getIntegrationSecret(
    integrationId: string,
    key: string,
  ): Promise<string | null> {
    return this.projectParser.getIntegrationSecret(integrationId, key);
  }

  async deleteIntegrationSecrets(integrationId: string): Promise<void> {
    return this.projectParser.deleteIntegrationSecrets(integrationId);
  }

  // ============================================================
  // Tasks
  // ============================================================

  async readTasks(): Promise<Task[]> {
    return this.tasksParser.readAll();
  }

  async readTasksBySection(section: string): Promise<Task[]> {
    return this.tasksParser.readBySection(section);
  }

  async addTask(task: Omit<Task, "id">): Promise<string> {
    const newTask = await this.tasksParser.add(task);
    return newTask.id;
  }

  async updateTask(
    id: string,
    updates: Partial<Omit<Task, "id">>,
  ): Promise<boolean> {
    const result = await this.tasksParser.update(id, updates);
    return result !== null;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasksParser.delete(id);
  }

  async moveTask(id: string, newSection: string): Promise<boolean> {
    return this.tasksParser.moveToSection(id, newSection);
  }

  async reorderTask(
    id: string,
    section: string,
    position: number,
  ): Promise<boolean> {
    return this.tasksParser.reorder(id, section, position);
  }

  async toggleTask(id: string): Promise<Task | null> {
    const task = await this.tasksParser.read(id);
    if (!task) return null;
    return this.tasksParser.update(id, { completed: !task.completed });
  }

  async addAttachmentsToTask(
    id: string,
    paths: string[],
  ): Promise<boolean> {
    const task = await this.tasksParser.read(id);
    if (!task) return false;
    const existing = task.config.attachments ?? [];
    const merged = [...new Set([...existing, ...paths])];
    const updated = {
      ...task,
      config: { ...task.config, attachments: merged },
    };
    await this.tasksParser.write(updated);
    return true;
  }

  // ============================================================
  // Notes
  // ============================================================

  async readNotes(): Promise<Note[]> {
    return this.notesParser.readAll();
  }

  async addNote(
    note: Omit<Note, "id" | "createdAt" | "updatedAt" | "revision">,
  ): Promise<string> {
    const newNote = await this.notesParser.add({
      title: note.title,
      content: note.content || "",
      mode: note.mode || "simple",
    });
    return newNote.id;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<boolean> {
    const result = await this.notesParser.update(id, updates);
    return result !== null;
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.notesParser.delete(id);
  }

  // ============================================================
  // Goals
  // ============================================================

  async readGoals(): Promise<Goal[]> {
    return this.goalsParser.readAll();
  }

  async addGoal(goal: Omit<Goal, "id">): Promise<string> {
    const newGoal = await this.goalsParser.add(goal);
    return newGoal.id;
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<boolean> {
    const result = await this.goalsParser.update(id, updates);
    return result !== null;
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.goalsParser.delete(id);
  }

  // ============================================================
  // Sections (Board columns)
  // ============================================================

  async readSections(): Promise<string[]> {
    return this.tasksParser.listSections();
  }

  async addSection(name: string): Promise<void> {
    await this.tasksParser.ensureDir(name);
  }

  // ============================================================
  // Sticky Notes (Canvas)
  // ============================================================

  async readStickyNotes(): Promise<StickyNote[]> {
    return this.canvasParser.readAll();
  }

  async addStickyNote(stickyNote: Omit<StickyNote, "id">): Promise<string> {
    const newNote = await this.canvasParser.add(
      stickyNote.content,
      stickyNote.color,
      stickyNote.position,
      stickyNote.size,
    );
    return newNote.id;
  }

  async updateStickyNote(
    id: string,
    updates: Partial<StickyNote>,
  ): Promise<boolean> {
    const result = await this.canvasParser.update(id, updates);
    return result !== null;
  }

  async deleteStickyNote(id: string): Promise<boolean> {
    return this.canvasParser.delete(id);
  }

  async updateStickyNotePosition(
    id: string,
    position: { x: number; y: number },
  ): Promise<StickyNote | null> {
    return this.canvasParser.updatePosition(id, position);
  }

  // ============================================================
  // Mindmaps
  // ============================================================

  async readMindmaps(): Promise<Mindmap[]> {
    return this.mindmapsParser.readAll();
  }

  async addMindmap(mindmap: Omit<Mindmap, "id">): Promise<string> {
    // Get root node text from nodes array if provided
    const rootText = mindmap.nodes?.[0]?.text;
    const newMindmap = await this.mindmapsParser.add(mindmap.title, rootText);
    return newMindmap.id;
  }

  async updateMindmap(
    id: string,
    updates: Partial<Mindmap>,
  ): Promise<boolean> {
    const result = await this.mindmapsParser.update(id, updates);
    return result !== null;
  }

  async deleteMindmap(id: string): Promise<boolean> {
    return this.mindmapsParser.delete(id);
  }

  async addMindmapNode(
    mindmapId: string,
    text: string,
    parentId?: string,
  ): Promise<Mindmap | null> {
    return this.mindmapsParser.addNode(mindmapId, text, parentId);
  }

  async updateMindmapNode(
    mindmapId: string,
    nodeId: string,
    text: string,
  ): Promise<Mindmap | null> {
    return this.mindmapsParser.updateNode(mindmapId, nodeId, text);
  }

  async deleteMindmapNode(
    mindmapId: string,
    nodeId: string,
  ): Promise<Mindmap | null> {
    return this.mindmapsParser.deleteNode(mindmapId, nodeId);
  }

  // ============================================================
  // C4 Architecture
  // ============================================================

  async readC4Components(): Promise<C4Component[]> {
    return this.c4Parser.readAll();
  }

  async addC4Component(
    component: Omit<C4Component, "id">,
  ): Promise<C4Component> {
    return this.c4Parser.add(component);
  }

  async updateC4Component(
    id: string,
    updates: Partial<C4Component>,
  ): Promise<C4Component | null> {
    return this.c4Parser.update(id, updates);
  }

  async deleteC4Component(id: string): Promise<boolean> {
    return this.c4Parser.delete(id);
  }

  async updateC4Position(
    id: string,
    position: { x: number; y: number },
  ): Promise<C4Component | null> {
    return this.c4Parser.updatePosition(id, position);
  }

  async addC4Connection(
    sourceId: string,
    targetId: string,
    label: string,
  ): Promise<C4Component | null> {
    return this.c4Parser.addConnection(sourceId, targetId, label);
  }

  async removeC4Connection(
    sourceId: string,
    targetId: string,
  ): Promise<C4Component | null> {
    return this.c4Parser.removeConnection(sourceId, targetId);
  }

  async getC4ByLevel(level: C4Component["level"]): Promise<C4Component[]> {
    return this.c4Parser.getByLevel(level);
  }

  // ============================================================
  // Milestones
  // ============================================================

  async readMilestones(): Promise<Milestone[]> {
    return this.milestonesParser.readAll();
  }

  async addMilestone(milestone: Omit<Milestone, "id">): Promise<Milestone> {
    return this.milestonesParser.add(milestone);
  }

  async updateMilestone(
    id: string,
    updates: Partial<Milestone>,
  ): Promise<Milestone | null> {
    return this.milestonesParser.update(id, updates);
  }

  async deleteMilestone(id: string): Promise<boolean> {
    return this.milestonesParser.delete(id);
  }

  // ============================================================
  // Meetings
  // ============================================================

  async readMeetings(): Promise<Meeting[]> {
    const meetings = await this.meetingsParser.readAll();
    return meetings.sort((a, b) => b.date.localeCompare(a.date));
  }

  async addMeeting(
    meeting: Omit<Meeting, "id" | "created">,
  ): Promise<Meeting> {
    return this.meetingsParser.add(meeting);
  }

  async updateMeeting(
    id: string,
    updates: Partial<Meeting>,
  ): Promise<Meeting | null> {
    return this.meetingsParser.update(id, updates);
  }

  async deleteMeeting(id: string): Promise<boolean> {
    return this.meetingsParser.delete(id);
  }

  // ============================================================
  // Onboarding
  // ============================================================

  async readOnboardingRecords(): Promise<Onboarding[]> {
    const records = await this.onboardingParser.readAll();
    return records.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async addOnboardingRecord(
    record: Omit<Onboarding, "id" | "created">,
  ): Promise<Onboarding> {
    return this.onboardingParser.add(record);
  }

  async updateOnboardingRecord(
    id: string,
    updates: Partial<Onboarding>,
  ): Promise<Onboarding | null> {
    return this.onboardingParser.update(id, updates);
  }

  async deleteOnboardingRecord(id: string): Promise<boolean> {
    return this.onboardingParser.delete(id);
  }

  // ============================================================
  // Onboarding Templates
  // ============================================================

  async readOnboardingTemplates(): Promise<OnboardingTemplate[]> {
    const templates = await this.onboardingTemplateParser.readAll();
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async addOnboardingTemplate(
    template: Omit<OnboardingTemplate, "id" | "created">,
  ): Promise<OnboardingTemplate> {
    return this.onboardingTemplateParser.add(template);
  }

  async updateOnboardingTemplate(
    id: string,
    updates: Partial<OnboardingTemplate>,
  ): Promise<OnboardingTemplate | null> {
    return this.onboardingTemplateParser.update(id, updates);
  }

  async deleteOnboardingTemplate(id: string): Promise<boolean> {
    return this.onboardingTemplateParser.delete(id);
  }

  // ============================================================
  // Ideas
  // ============================================================

  async readIdeas(): Promise<Idea[]> {
    return this.ideasParser.readAll();
  }

  async addIdea(idea: Omit<Idea, "id" | "created">): Promise<Idea> {
    return this.ideasParser.add(idea);
  }

  async updateIdea(id: string, updates: Partial<Idea>): Promise<Idea | null> {
    return this.ideasParser.update(id, updates);
  }

  async deleteIdea(id: string): Promise<boolean> {
    return this.ideasParser.delete(id);
  }

  async linkIdeas(ideaId1: string, ideaId2: string): Promise<boolean> {
    return this.ideasParser.linkIdeas(ideaId1, ideaId2);
  }

  async unlinkIdeas(ideaId1: string, ideaId2: string): Promise<boolean> {
    return this.ideasParser.unlinkIdeas(ideaId1, ideaId2);
  }

  async readIdeasWithBacklinks(): Promise<(Idea & { backlinks: string[] })[]> {
    const ideas = await this.ideasParser.readAll();
    // Build backlinks map from `links` field
    const backlinks = new Map<string, string[]>();
    for (const idea of ideas) {
      if (idea.links?.length) {
        for (const linkedId of idea.links) {
          if (!backlinks.has(linkedId)) {
            backlinks.set(linkedId, []);
          }
          backlinks.get(linkedId)!.push(idea.id);
        }
      }
    }
    return ideas.map((idea) => ({
      ...idea,
      backlinks: backlinks.get(idea.id) || [],
    }));
  }

  // ============================================================
  // Retrospectives
  // ============================================================

  async readRetrospectives(): Promise<Retrospective[]> {
    return this.retrospectivesParser.readAll();
  }

  async addRetrospective(
    retro: Omit<Retrospective, "id">,
  ): Promise<Retrospective> {
    return this.retrospectivesParser.add(retro);
  }

  async updateRetrospective(
    id: string,
    updates: Partial<Retrospective>,
  ): Promise<Retrospective | null> {
    return this.retrospectivesParser.update(id, updates);
  }

  async deleteRetrospective(id: string): Promise<boolean> {
    return this.retrospectivesParser.delete(id);
  }

  async addRetrospectiveItem(
    id: string,
    section: "continue" | "stop" | "start",
    item: string,
  ): Promise<Retrospective | null> {
    return this.retrospectivesParser.addItem(id, section, item);
  }

  // ============================================================
  // SWOT Analysis
  // ============================================================

  async readSwotAnalyses(): Promise<SwotAnalysis[]> {
    return this.swotParser.readAll();
  }

  async addSwotAnalysis(swot: Omit<SwotAnalysis, "id">): Promise<SwotAnalysis> {
    return this.swotParser.add(swot);
  }

  async updateSwotAnalysis(
    id: string,
    updates: Partial<SwotAnalysis>,
  ): Promise<SwotAnalysis | null> {
    return this.swotParser.update(id, updates);
  }

  async deleteSwotAnalysis(id: string): Promise<boolean> {
    return this.swotParser.delete(id);
  }

  async addSwotItem(
    id: string,
    section: "strengths" | "weaknesses" | "opportunities" | "threats",
    item: string,
  ): Promise<SwotAnalysis | null> {
    return this.swotParser.addItem(id, section, item);
  }

  // ============================================================
  // MoSCoW Analysis
  // ============================================================

  async readMoscowAnalyses(): Promise<MoscowAnalysis[]> {
    return this.moscowParser.readAll();
  }

  async addMoscowAnalysis(
    analysis: Omit<MoscowAnalysis, "id">,
  ): Promise<MoscowAnalysis> {
    return this.moscowParser.add(analysis);
  }

  async updateMoscowAnalysis(
    id: string,
    updates: Partial<MoscowAnalysis>,
  ): Promise<MoscowAnalysis | null> {
    return this.moscowParser.update(id, updates);
  }

  async deleteMoscowAnalysis(id: string): Promise<boolean> {
    return this.moscowParser.delete(id);
  }

  // ============================================================
  // Eisenhower Matrix
  // ============================================================

  async readEisenhowerMatrices(): Promise<EisenhowerMatrix[]> {
    return this.eisenhowerParser.readAll();
  }

  async addEisenhowerMatrix(
    matrix: Omit<EisenhowerMatrix, "id">,
  ): Promise<EisenhowerMatrix> {
    return this.eisenhowerParser.add(matrix);
  }

  async updateEisenhowerMatrix(
    id: string,
    updates: Partial<EisenhowerMatrix>,
  ): Promise<EisenhowerMatrix | null> {
    return this.eisenhowerParser.update(id, updates);
  }

  async deleteEisenhowerMatrix(id: string): Promise<boolean> {
    return this.eisenhowerParser.delete(id);
  }

  // ============================================================
  // SAFE Agreements
  // ============================================================

  async readSafeAgreements(): Promise<SAFEAgreement[]> {
    return this.safeParser.readAll();
  }

  async addSafeAgreement(
    agreement: Omit<SAFEAgreement, "id">,
  ): Promise<SAFEAgreement> {
    return this.safeParser.add(agreement);
  }

  async updateSafeAgreement(
    id: string,
    updates: Partial<SAFEAgreement>,
  ): Promise<SAFEAgreement | null> {
    return this.safeParser.update(id, updates);
  }

  async deleteSafeAgreement(id: string): Promise<boolean> {
    return this.safeParser.delete(id);
  }

  // ============================================================
  // Investor Pipeline
  // ============================================================

  async readInvestors(): Promise<InvestorEntry[]> {
    return this.investorParser.readAll();
  }

  async addInvestor(
    investor: Omit<InvestorEntry, "id">,
  ): Promise<InvestorEntry> {
    return this.investorParser.add(investor);
  }

  async updateInvestor(
    id: string,
    updates: Partial<InvestorEntry>,
  ): Promise<InvestorEntry | null> {
    return this.investorParser.update(id, updates);
  }

  async deleteInvestor(id: string): Promise<boolean> {
    return this.investorParser.delete(id);
  }

  // ============================================================
  // KPI Snapshots
  // ============================================================

  async readKpiSnapshots(): Promise<KPISnapshot[]> {
    return this.kpiParser.readAll();
  }

  async addKpiSnapshot(
    snapshot: Omit<KPISnapshot, "id">,
  ): Promise<KPISnapshot> {
    return this.kpiParser.add(snapshot);
  }

  async updateKpiSnapshot(
    id: string,
    updates: Partial<KPISnapshot>,
  ): Promise<KPISnapshot | null> {
    return this.kpiParser.update(id, updates);
  }

  async deleteKpiSnapshot(id: string): Promise<boolean> {
    return this.kpiParser.delete(id);
  }

  // ============================================================
  // Risk Analysis
  // ============================================================

  async readRiskAnalyses(): Promise<RiskAnalysis[]> {
    return this.riskParser.readAll();
  }

  async addRiskAnalysis(risk: Omit<RiskAnalysis, "id">): Promise<RiskAnalysis> {
    return this.riskParser.add(risk);
  }

  async updateRiskAnalysis(
    id: string,
    updates: Partial<RiskAnalysis>,
  ): Promise<RiskAnalysis | null> {
    return this.riskParser.update(id, updates);
  }

  async deleteRiskAnalysis(id: string): Promise<boolean> {
    return this.riskParser.delete(id);
  }

  async addRiskItem(
    id: string,
    quadrant:
      | "highImpactHighProb"
      | "highImpactLowProb"
      | "lowImpactHighProb"
      | "lowImpactLowProb",
    item: string,
  ): Promise<RiskAnalysis | null> {
    return this.riskParser.addItem(id, quadrant, item);
  }

  // ============================================================
  // Lean Canvas
  // ============================================================

  async readLeanCanvases(): Promise<LeanCanvas[]> {
    return this.leanCanvasParser.readAll();
  }

  async addLeanCanvas(canvas: Omit<LeanCanvas, "id">): Promise<LeanCanvas> {
    return this.leanCanvasParser.add(canvas);
  }

  async updateLeanCanvas(
    id: string,
    updates: Partial<LeanCanvas>,
  ): Promise<LeanCanvas | null> {
    return this.leanCanvasParser.update(id, updates);
  }

  async deleteLeanCanvas(id: string): Promise<boolean> {
    return this.leanCanvasParser.delete(id);
  }

  // ============================================================
  // Business Model Canvas
  // ============================================================

  async readBusinessModelCanvases(): Promise<BusinessModelCanvas[]> {
    return this.businessModelParser.readAll();
  }

  async addBusinessModelCanvas(
    canvas: Omit<BusinessModelCanvas, "id">,
  ): Promise<BusinessModelCanvas> {
    return this.businessModelParser.add(canvas);
  }

  async updateBusinessModelCanvas(
    id: string,
    updates: Partial<BusinessModelCanvas>,
  ): Promise<BusinessModelCanvas | null> {
    return this.businessModelParser.update(id, updates);
  }

  async deleteBusinessModelCanvas(id: string): Promise<boolean> {
    return this.businessModelParser.delete(id);
  }

  // ============================================================
  // Project Value Board
  // ============================================================

  async readProjectValueBoards(): Promise<ProjectValueBoard[]> {
    return this.projectValueParser.readAll();
  }

  async addProjectValueBoard(
    board: Omit<ProjectValueBoard, "id">,
  ): Promise<ProjectValueBoard> {
    return this.projectValueParser.add(board);
  }

  async updateProjectValueBoard(
    id: string,
    updates: Partial<ProjectValueBoard>,
  ): Promise<ProjectValueBoard | null> {
    return this.projectValueParser.update(id, updates);
  }

  async deleteProjectValueBoard(id: string): Promise<boolean> {
    return this.projectValueParser.delete(id);
  }

  // ============================================================
  // Brief
  // ============================================================

  async readBriefs(): Promise<Brief[]> {
    return this.briefParser.readAll();
  }

  async addBrief(brief: Omit<Brief, "id">): Promise<Brief> {
    return this.briefParser.add(brief);
  }

  async updateBrief(
    id: string,
    updates: Partial<Brief>,
  ): Promise<Brief | null> {
    return this.briefParser.update(id, updates);
  }

  async deleteBrief(id: string): Promise<boolean> {
    return this.briefParser.delete(id);
  }

  // ============================================================
  // Capacity Planning
  // ============================================================

  async readCapacityPlans(): Promise<CapacityPlan[]> {
    return this.capacityParser.readAll();
  }

  async addCapacityPlan(plan: Omit<CapacityPlan, "id">): Promise<CapacityPlan> {
    return this.capacityParser.add(plan);
  }

  async updateCapacityPlan(
    id: string,
    updates: Partial<CapacityPlan>,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.update(id, updates);
  }

  async deleteCapacityPlan(id: string): Promise<boolean> {
    return this.capacityParser.delete(id);
  }

  async addTeamMember(
    planId: string,
    member: Omit<TeamMemberRef, "id">,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.addTeamMember(planId, member);
  }

  async updateTeamMember(
    planId: string,
    memberId: string,
    updates: Partial<TeamMemberRef>,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.updateTeamMember(planId, memberId, updates);
  }

  async removeTeamMember(
    planId: string,
    memberId: string,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.removeTeamMember(planId, memberId);
  }

  async addAllocation(
    planId: string,
    allocation: Omit<WeeklyAllocation, "id">,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.addAllocation(planId, allocation);
  }

  async updateAllocation(
    planId: string,
    allocationId: string,
    updates: Partial<WeeklyAllocation>,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.updateAllocation(planId, allocationId, updates);
  }

  async removeAllocation(
    planId: string,
    allocationId: string,
  ): Promise<CapacityPlan | null> {
    return this.capacityParser.removeAllocation(planId, allocationId);
  }

  // ============================================================
  // Strategic Levels
  // ============================================================

  async readStrategicLevelsBuilders(): Promise<StrategicLevelsBuilder[]> {
    return this.strategicLevelsParser.readAll();
  }

  async addStrategicLevelsBuilder(
    builder: Omit<StrategicLevelsBuilder, "id">,
  ): Promise<StrategicLevelsBuilder> {
    return this.strategicLevelsParser.add(builder);
  }

  async updateStrategicLevelsBuilder(
    id: string,
    updates: Partial<StrategicLevelsBuilder>,
  ): Promise<StrategicLevelsBuilder | null> {
    return this.strategicLevelsParser.update(id, updates);
  }

  async deleteStrategicLevelsBuilder(id: string): Promise<boolean> {
    return this.strategicLevelsParser.delete(id);
  }

  async addStrategicLevel(
    builderId: string,
    level: Omit<StrategicLevel, "id" | "order">,
  ): Promise<StrategicLevelsBuilder | null> {
    return this.strategicLevelsParser.addLevel(builderId, level);
  }

  async updateStrategicLevel(
    builderId: string,
    levelId: string,
    updates: Partial<StrategicLevel>,
  ): Promise<StrategicLevelsBuilder | null> {
    return this.strategicLevelsParser.updateLevel(builderId, levelId, updates);
  }

  async removeStrategicLevel(
    builderId: string,
    levelId: string,
  ): Promise<StrategicLevelsBuilder | null> {
    return this.strategicLevelsParser.removeLevel(builderId, levelId);
  }

  // ============================================================
  // Billing - Customers
  // ============================================================

  async readCustomers(): Promise<Customer[]> {
    return this.billingParser.readAllCustomers();
  }

  async addCustomer(
    customer: Omit<Customer, "id" | "created">,
  ): Promise<Customer> {
    return this.billingParser.addCustomer(customer);
  }

  async updateCustomer(
    id: string,
    updates: Partial<Customer>,
  ): Promise<Customer | null> {
    return this.billingParser.updateCustomer(id, updates);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.billingParser.deleteCustomer(id);
  }

  // ============================================================
  // Billing - Rates
  // ============================================================

  async readBillingRates(): Promise<BillingRate[]> {
    return this.billingParser.readAllRates();
  }

  async addBillingRate(rate: Omit<BillingRate, "id">): Promise<BillingRate> {
    return this.billingParser.addRate(rate);
  }

  async updateBillingRate(
    id: string,
    updates: Partial<BillingRate>,
  ): Promise<BillingRate | null> {
    return this.billingParser.updateRate(id, updates);
  }

  async deleteBillingRate(id: string): Promise<boolean> {
    return this.billingParser.deleteRate(id);
  }

  // ============================================================
  // Billing - Quotes
  // ============================================================

  async readQuotes(): Promise<Quote[]> {
    return this.billingParser.readAllQuotes();
  }

  async addQuote(quote: Omit<Quote, "id" | "created">): Promise<Quote> {
    return this.billingParser.addQuote(quote);
  }

  async updateQuote(
    id: string,
    updates: Partial<Quote>,
  ): Promise<Quote | null> {
    return this.billingParser.updateQuote(id, updates);
  }

  async deleteQuote(id: string): Promise<boolean> {
    return this.billingParser.deleteQuote(id);
  }

  // ============================================================
  // Billing - Invoices
  // ============================================================

  async readInvoices(): Promise<Invoice[]> {
    return this.billingParser.readAllInvoices();
  }

  async addInvoice(invoice: Omit<Invoice, "id" | "created">): Promise<Invoice> {
    return this.billingParser.addInvoice(invoice);
  }

  async updateInvoice(
    id: string,
    updates: Partial<Invoice>,
  ): Promise<Invoice | null> {
    return this.billingParser.updateInvoice(id, updates);
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return this.billingParser.deleteInvoice(id);
  }

  // ============================================================
  // Time Tracking
  // ============================================================

  async readTimeEntries(): Promise<Map<string, TimeEntry[]>> {
    const tasks = await this.tasksParser.readAll();
    const timeEntries = new Map<string, TimeEntry[]>();

    for (const task of tasks) {
      if (task.config.time_entries?.length) {
        timeEntries.set(task.id, task.config.time_entries);
      }
    }

    return timeEntries;
  }

  async saveTimeEntries(timeEntries: Map<string, TimeEntry[]>): Promise<void> {
    for (const [taskId, entries] of timeEntries) {
      await this.tasksParser.update(taskId, {
        config: { time_entries: entries },
      });
    }
  }

  async addTimeEntry(
    taskId: string,
    entry: Omit<TimeEntry, "id">,
  ): Promise<string> {
    const task = await this.tasksParser.read(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const newEntry: TimeEntry = {
      ...entry,
      id: `te_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    const timeEntries = task.config.time_entries || [];
    timeEntries.push(newEntry);

    await this.tasksParser.update(taskId, {
      config: { ...task.config, time_entries: timeEntries },
    });

    return newEntry.id;
  }

  async deleteTimeEntry(taskId: string, entryId: string): Promise<boolean> {
    const task = await this.tasksParser.read(taskId);
    if (!task) return false;

    const timeEntries = task.config.time_entries || [];
    const filtered = timeEntries.filter((e) => e.id !== entryId);

    if (filtered.length === timeEntries.length) return false;

    await this.tasksParser.update(taskId, {
      config: { ...task.config, time_entries: filtered },
    });

    return true;
  }

  async getTimeEntriesForTask(taskId: string): Promise<TimeEntry[]> {
    const task = await this.tasksParser.read(taskId);
    return task?.config.time_entries || [];
  }

  // ============================================================
  // Payments (Billing)
  // ============================================================

  async readPayments(): Promise<Payment[]> {
    return this.billingParser.readAllPayments();
  }

  async savePayments(payments: Payment[]): Promise<void> {
    await this.billingParser.saveAllPayments(payments);
  }

  // ============================================================
  // CRM - Companies
  // ============================================================

  async readCompanies(): Promise<Company[]> {
    return this.crmParser.readAllCompanies();
  }

  async addCompany(company: Omit<Company, "id" | "created">): Promise<Company> {
    return this.crmParser.addCompany(company);
  }

  async updateCompany(
    id: string,
    updates: Partial<Company>,
  ): Promise<Company | null> {
    return this.crmParser.updateCompany(id, updates);
  }

  async deleteCompany(id: string): Promise<boolean> {
    return this.crmParser.deleteCompany(id);
  }

  // ============================================================
  // CRM - Contacts
  // ============================================================

  async readContacts(): Promise<Contact[]> {
    return this.crmParser.readAllContacts();
  }

  async addContact(contact: Omit<Contact, "id" | "created">): Promise<Contact> {
    return this.crmParser.addContact(contact);
  }

  async updateContact(
    id: string,
    updates: Partial<Contact>,
  ): Promise<Contact | null> {
    return this.crmParser.updateContact(id, updates);
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.crmParser.deleteContact(id);
  }

  async getContactsByCompany(companyId: string): Promise<Contact[]> {
    return this.crmParser.getContactsByCompany(companyId);
  }

  // ============================================================
  // CRM - Deals
  // ============================================================

  async readDeals(): Promise<Deal[]> {
    return this.crmParser.readAllDeals();
  }

  async addDeal(deal: Omit<Deal, "id" | "created">): Promise<Deal> {
    return this.crmParser.addDeal(deal);
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    return this.crmParser.updateDeal(id, updates);
  }

  async deleteDeal(id: string): Promise<boolean> {
    return this.crmParser.deleteDeal(id);
  }

  async getDealsByCompany(companyId: string): Promise<Deal[]> {
    return this.crmParser.getDealsByCompany(companyId);
  }

  async getDealsByStage(stage: Deal["stage"]): Promise<Deal[]> {
    return this.crmParser.getDealsByStage(stage);
  }

  // ============================================================
  // CRM - Interactions
  // ============================================================

  async readInteractions(): Promise<Interaction[]> {
    return this.crmParser.readAllInteractions();
  }

  async addInteraction(
    interaction: Omit<Interaction, "id">,
  ): Promise<Interaction> {
    return this.crmParser.addInteraction(interaction);
  }

  async updateInteraction(
    id: string,
    updates: Partial<Interaction>,
  ): Promise<Interaction | null> {
    return this.crmParser.updateInteraction(id, updates);
  }

  async deleteInteraction(id: string): Promise<boolean> {
    return this.crmParser.deleteInteraction(id);
  }

  async getInteractionsByCompany(companyId: string): Promise<Interaction[]> {
    return this.crmParser.getInteractionsByCompany(companyId);
  }

  async getInteractionsByDeal(dealId: string): Promise<Interaction[]> {
    return this.crmParser.getInteractionsByDeal(dealId);
  }

  async getUpcomingFollowUps(): Promise<Interaction[]> {
    return this.crmParser.getUpcomingFollowUps();
  }

  // ============================================================
  // Bulk Save Methods (API Compatibility)
  // ============================================================

  async saveProjectInfo(projectInfo: ProjectInfo): Promise<void> {
    // Save project name/description
    if (projectInfo.name) {
      await this.saveProjectName(projectInfo.name);
    }
    // Notes, goals, sticky notes, mindmaps, c4 are saved individually
    // This method exists for compatibility but individual CRUD is preferred
  }

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    await this.milestonesParser.saveAll(milestones);
  }

  async saveIdeas(ideas: Idea[]): Promise<void> {
    await this.ideasParser.saveAll(ideas);
  }

  async saveRetrospectives(retrospectives: Retrospective[]): Promise<void> {
    await this.retrospectivesParser.saveAll(retrospectives);
  }

  async saveSwotAnalyses(swotAnalyses: SwotAnalysis[]): Promise<void> {
    await this.swotParser.saveAll(swotAnalyses);
  }

  async saveRiskAnalyses(riskAnalyses: RiskAnalysis[]): Promise<void> {
    await this.riskParser.saveAll(riskAnalyses);
  }

  async saveLeanCanvases(leanCanvases: LeanCanvas[]): Promise<void> {
    await this.leanCanvasParser.saveAll(leanCanvases);
  }

  async saveBusinessModelCanvases(
    canvases: BusinessModelCanvas[],
  ): Promise<void> {
    await this.businessModelParser.saveAll(canvases);
  }

  async saveProjectValueBoards(boards: ProjectValueBoard[]): Promise<void> {
    await this.projectValueParser.saveAll(boards);
  }

  async saveBriefs(briefs: Brief[]): Promise<void> {
    await this.briefParser.saveAll(briefs);
  }

  async saveCapacityPlans(plans: CapacityPlan[]): Promise<void> {
    await this.capacityParser.saveAll(plans);
  }

  async saveStrategicLevelsBuilders(
    builders: StrategicLevelsBuilder[],
  ): Promise<void> {
    await this.strategicLevelsParser.saveAll(builders);
  }

  async saveCustomers(customers: Customer[]): Promise<void> {
    await this.billingParser.saveAllCustomers(customers);
  }

  async saveBillingRates(rates: BillingRate[]): Promise<void> {
    await this.billingParser.saveAllRates(rates);
  }

  async saveQuotes(quotes: Quote[]): Promise<void> {
    await this.billingParser.saveAllQuotes(quotes);
  }

  async saveInvoices(invoices: Invoice[]): Promise<void> {
    await this.billingParser.saveAllInvoices(invoices);
  }

  async saveCompanies(companies: Company[]): Promise<void> {
    await this.crmParser.saveAllCompanies(companies);
  }

  async saveContacts(contacts: Contact[]): Promise<void> {
    await this.crmParser.saveAllContacts(contacts);
  }

  async saveDeals(deals: Deal[]): Promise<void> {
    await this.crmParser.saveAllDeals(deals);
  }

  async saveInteractions(interactions: Interaction[]): Promise<void> {
    await this.crmParser.saveAllInteractions(interactions);
  }

  // ============================================================
  // Special Methods (API Compatibility)
  // ============================================================

  getSectionsFromBoard(): string[] {
    return this.tasksParser.listSectionsSync();
  }

  async writeTasks(tasks: Task[], _customSections?: string[]): Promise<void> {
    await this.tasksParser.saveAll(tasks);
  }

  async getCRMSummary(): Promise<{
    totalCompanies: number;
    totalContacts: number;
    totalDeals: number;
    totalInteractions: number;
    pipelineValue: number;
    wonDeals: number;
  }> {
    return this.crmParser.getSummary();
  }

  async getNextQuoteNumber(): Promise<string> {
    return this.billingParser.getNextQuoteNumber();
  }

  async getNextInvoiceNumber(): Promise<string> {
    return this.billingParser.getNextInvoiceNumber();
  }

  // ============================================================
  // Portfolio
  // ============================================================

  async readPortfolioItems(): Promise<PortfolioItem[]> {
    return this.portfolioParser.readAll();
  }

  async readPortfolioItem(id: string): Promise<PortfolioItem | null> {
    return this.portfolioParser.read(id);
  }

  async createPortfolioItem(
    data: Omit<PortfolioItem, "id">,
  ): Promise<PortfolioItem> {
    return this.portfolioParser.create(data);
  }

  async updatePortfolioItem(
    id: string,
    updates: Partial<PortfolioItem>,
  ): Promise<PortfolioItem | null> {
    return this.portfolioParser.update(id, updates);
  }

  async deletePortfolioItem(id: string): Promise<boolean> {
    return this.portfolioParser.delete(id);
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    return this.portfolioParser.getSummary();
  }

  async hasPortfolio(): Promise<boolean> {
    return this.portfolioParser.exists();
  }

  // ============================================================
  // People Registry
  // ============================================================

  async readPeople(): Promise<Person[]> {
    return this.peopleParser.readAll();
  }

  async readPerson(id: string): Promise<Person | null> {
    return this.peopleParser.read(id);
  }

  async addPerson(person: Omit<Person, "id">): Promise<Person> {
    return this.peopleParser.add(person);
  }

  async updatePerson(
    id: string,
    updates: Partial<Person>,
  ): Promise<Person | null> {
    return this.peopleParser.update(id, updates);
  }

  async deletePerson(id: string): Promise<boolean> {
    return this.peopleParser.delete(id);
  }

  async getPeopleByDepartment(department: string): Promise<Person[]> {
    return this.peopleParser.getByDepartment(department);
  }

  async getPeopleDirectReports(personId: string): Promise<Person[]> {
    return this.peopleParser.getDirectReports(personId);
  }

  async getPeopleDepartments(): Promise<string[]> {
    return this.peopleParser.getDepartments();
  }

  async getPeopleTree(): Promise<PersonWithChildren[]> {
    return this.peopleParser.getTree();
  }

  async getPeopleSummary(): Promise<PeopleSummary> {
    return this.peopleParser.getSummary();
  }

  async hasPeople(): Promise<boolean> {
    const people = await this.peopleParser.readAll();
    return people.length > 0;
  }

  async savePeople(people: Person[]): Promise<void> {
    await this.peopleParser.saveAll(people);
  }

  // ============================================================
  // Org Chart (delegates to People parser)
  // ============================================================

  async readOrgChartMembers(): Promise<Person[]> {
    return this.peopleParser.readAll();
  }

  async readOrgChartMember(id: string): Promise<Person | null> {
    return this.peopleParser.read(id);
  }

  async addOrgChartMember(
    member: Omit<Person, "id">,
  ): Promise<Person> {
    return this.peopleParser.add(member);
  }

  async updateOrgChartMember(
    id: string,
    updates: Partial<Person>,
  ): Promise<Person | null> {
    return this.peopleParser.update(id, updates);
  }

  async deleteOrgChartMember(id: string): Promise<boolean> {
    return this.peopleParser.delete(id);
  }

  async getOrgChartByDepartment(department: string): Promise<Person[]> {
    return this.peopleParser.getByDepartment(department);
  }

  async getOrgChartDirectReports(memberId: string): Promise<Person[]> {
    return this.peopleParser.getDirectReports(memberId);
  }

  async getOrgChartDepartments(): Promise<string[]> {
    return this.peopleParser.getDepartments();
  }

  async getOrgChartTree(): Promise<OrgChartMemberWithChildren[]> {
    return this.peopleParser.getTree();
  }

  async getOrgChartSummary(): Promise<OrgChartSummary> {
    const summary = await this.peopleParser.getSummary();
    return summary;
  }

  async hasOrgChart(): Promise<boolean> {
    const members = await this.peopleParser.readAll();
    return members.length > 0;
  }

  async saveOrgChartMembers(members: Person[]): Promise<void> {
    await this.peopleParser.saveAll(members);
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Check if this is a directory-based project.
   * A directory project has a project.md file in the root.
   */
  static async isDirectoryProject(path: string): Promise<boolean> {
    try {
      const stat = await Deno.stat(path);
      if (!stat.isDirectory) return false;

      // Check for project.md
      await Deno.stat(`${path}/project.md`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a new directory-based project.
   */
  async initialize(name: string = "New Project"): Promise<void> {
    // Create project structure
    await Deno.mkdir(this.projectDir, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/notes`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/goals`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/canvas`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/mindmaps`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/c4`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/board/todo`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/board/in_progress`, {
      recursive: true,
    });
    await Deno.mkdir(`${this.projectDir}/board/done`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/milestones`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/ideas`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/retrospectives`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/swot`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/risk`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/leancanvas`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/businessmodel`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/projectvalue`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/brief`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/capacity`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/strategiclevels`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/billing/customers`, {
      recursive: true,
    });
    await Deno.mkdir(`${this.projectDir}/billing/rates`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/billing/quotes`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/billing/invoices`, {
      recursive: true,
    });
    await Deno.mkdir(`${this.projectDir}/crm/companies`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/crm/contacts`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/crm/deals`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/crm/interactions`, {
      recursive: true,
    });
    await Deno.mkdir(`${this.projectDir}/moscow`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/eisenhower`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/people`, { recursive: true });
    await Deno.mkdir(`${this.projectDir}/meetings`, { recursive: true });

    // Create project.md
    await this.projectParser.write({
      name,
      description: [],
      config: {
        workingDaysPerWeek: 5,
        workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      },
    });
  }

  // ============================================================
  // Finances
  // ============================================================

  async readFinancialPeriods(): Promise<FinancialPeriod[]> {
    const records = await this.financesParser.readAll();
    return records.sort((a, b) => b.period.localeCompare(a.period));
  }

  async addFinancialPeriod(
    record: Omit<FinancialPeriod, "id" | "created">,
  ): Promise<FinancialPeriod> {
    return this.financesParser.add(record);
  }

  async updateFinancialPeriod(
    id: string,
    updates: Partial<FinancialPeriod>,
  ): Promise<FinancialPeriod | null> {
    return this.financesParser.update(id, updates);
  }

  async deleteFinancialPeriod(id: string): Promise<boolean> {
    return this.financesParser.delete(id);
  }

  // ============================================================
  // Journal
  // ============================================================

  async readJournalEntries(): Promise<JournalEntry[]> {
    const entries = await this.journalParser.readAll();
    return entries.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.created.localeCompare(a.created);
    });
  }

  async addJournalEntry(
    entry: Omit<JournalEntry, "id" | "created" | "updated">,
  ): Promise<JournalEntry> {
    return this.journalParser.add(entry);
  }

  async updateJournalEntry(
    id: string,
    updates: Partial<JournalEntry>,
  ): Promise<JournalEntry | null> {
    return this.journalParser.update(id, updates);
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    return this.journalParser.delete(id);
  }

  // ============================================================
  // DNS Domains
  // ============================================================

  async readDnsDomains(): Promise<DnsDomain[]> {
    const domains = await this.dnsParser.readAll();
    return domains.sort((a, b) => a.domain.localeCompare(b.domain));
  }

  async addDnsDomain(
    domain: Omit<DnsDomain, "id" | "created" | "updated">,
  ): Promise<DnsDomain> {
    return this.dnsParser.add(domain);
  }

  async updateDnsDomain(
    id: string,
    updates: Partial<DnsDomain>,
  ): Promise<DnsDomain | null> {
    return this.dnsParser.update(id, updates);
  }

  async deleteDnsDomain(id: string): Promise<boolean> {
    return this.dnsParser.delete(id);
  }

  // ============================================================
  // Habits
  // ============================================================

  async readHabits(): Promise<Habit[]> {
    const habits = await this.habitsParser.readAll();
    return habits.sort((a, b) => a.name.localeCompare(b.name));
  }

  async addHabit(
    habit: Omit<
      Habit,
      "id" | "created" | "updated" | "streakCount" | "longestStreak"
    >,
  ): Promise<Habit> {
    return this.habitsParser.add(habit);
  }

  async updateHabit(
    id: string,
    updates: Partial<Habit>,
  ): Promise<Habit | null> {
    return this.habitsParser.update(id, updates);
  }

  async markHabitComplete(id: string, date?: string): Promise<Habit | null> {
    return this.habitsParser.markComplete(id, date);
  }

  async unmarkHabitComplete(
    id: string,
    date: string,
  ): Promise<Habit | null> {
    return this.habitsParser.unmarkComplete(id, date);
  }

  async deleteHabit(id: string): Promise<boolean> {
    return this.habitsParser.delete(id);
  }
}
