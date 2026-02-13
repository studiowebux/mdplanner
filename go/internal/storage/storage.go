package storage

import (
	"context"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// Storage defines the interface for data persistence.
// Implementations: MarkdownStorage (current), future SqliteStorage
type Storage interface {
	// Project operations
	ScanProjects(ctx context.Context) ([]domain.ProjectMeta, error)
	SwitchProject(ctx context.Context, filename string) error
	CreateProject(ctx context.Context, name string) (string, error)
	GetActiveProject(ctx context.Context) (string, error)

	// Project info/config
	ReadProjectInfo(ctx context.Context) (*domain.ProjectInfo, error)
	ReadProjectConfig(ctx context.Context) (*domain.ProjectConfig, error)
	SaveProjectConfig(ctx context.Context, config domain.ProjectConfig) error
	GetSections(ctx context.Context) ([]string, error)

	// Tasks
	ReadTasks(ctx context.Context) ([]domain.Task, error)
	WriteTasks(ctx context.Context, tasks []domain.Task) error
	GetTask(ctx context.Context, id string) (*domain.Task, error)
	CreateTask(ctx context.Context, task domain.Task) (string, error)
	UpdateTask(ctx context.Context, id string, task domain.Task) error
	DeleteTask(ctx context.Context, id string) error
	MoveTask(ctx context.Context, id string, section string) error

	// Notes
	ReadNotes(ctx context.Context) ([]domain.Note, error)
	CreateNote(ctx context.Context, note domain.Note) (string, error)
	UpdateNote(ctx context.Context, id string, note domain.Note) error
	DeleteNote(ctx context.Context, id string) error

	// Goals
	ReadGoals(ctx context.Context) ([]domain.Goal, error)
	CreateGoal(ctx context.Context, goal domain.Goal) (string, error)
	UpdateGoal(ctx context.Context, id string, goal domain.Goal) error
	DeleteGoal(ctx context.Context, id string) error

	// Milestones
	ReadMilestones(ctx context.Context) ([]domain.Milestone, error)
	CreateMilestone(ctx context.Context, milestone domain.Milestone) (string, error)
	UpdateMilestone(ctx context.Context, id string, milestone domain.Milestone) error
	DeleteMilestone(ctx context.Context, id string) error

	// Ideas (with backlinks)
	ReadIdeas(ctx context.Context) ([]domain.Idea, error)
	ReadIdeasWithBacklinks(ctx context.Context) ([]domain.IdeaWithBacklinks, error)
	CreateIdea(ctx context.Context, idea domain.Idea) (string, error)
	UpdateIdea(ctx context.Context, id string, idea domain.Idea) error
	DeleteIdea(ctx context.Context, id string) error

	// Retrospectives
	ReadRetrospectives(ctx context.Context) ([]domain.Retrospective, error)
	CreateRetrospective(ctx context.Context, retro domain.Retrospective) (string, error)
	UpdateRetrospective(ctx context.Context, id string, retro domain.Retrospective) error
	DeleteRetrospective(ctx context.Context, id string) error

	// Canvas (Sticky Notes)
	ReadStickyNotes(ctx context.Context) ([]domain.StickyNote, error)
	CreateStickyNote(ctx context.Context, note domain.StickyNote) (string, error)
	UpdateStickyNote(ctx context.Context, id string, note domain.StickyNote) error
	DeleteStickyNote(ctx context.Context, id string) error

	// Mindmaps
	ReadMindmaps(ctx context.Context) ([]domain.Mindmap, error)
	CreateMindmap(ctx context.Context, mindmap domain.Mindmap) (string, error)
	UpdateMindmap(ctx context.Context, id string, mindmap domain.Mindmap) error
	DeleteMindmap(ctx context.Context, id string) error

	// C4 Architecture
	ReadC4Components(ctx context.Context) ([]domain.C4Component, error)
	SaveC4Components(ctx context.Context, components []domain.C4Component) error

	// Analysis Boards
	ReadSwotAnalyses(ctx context.Context) ([]domain.SwotAnalysis, error)
	CreateSwotAnalysis(ctx context.Context, swot domain.SwotAnalysis) (string, error)
	UpdateSwotAnalysis(ctx context.Context, id string, swot domain.SwotAnalysis) error
	DeleteSwotAnalysis(ctx context.Context, id string) error

	ReadRiskAnalyses(ctx context.Context) ([]domain.RiskAnalysis, error)
	CreateRiskAnalysis(ctx context.Context, risk domain.RiskAnalysis) (string, error)
	UpdateRiskAnalysis(ctx context.Context, id string, risk domain.RiskAnalysis) error
	DeleteRiskAnalysis(ctx context.Context, id string) error

	ReadLeanCanvases(ctx context.Context) ([]domain.LeanCanvas, error)
	CreateLeanCanvas(ctx context.Context, canvas domain.LeanCanvas) (string, error)
	UpdateLeanCanvas(ctx context.Context, id string, canvas domain.LeanCanvas) error
	DeleteLeanCanvas(ctx context.Context, id string) error

	ReadBusinessModelCanvases(ctx context.Context) ([]domain.BusinessModelCanvas, error)
	CreateBusinessModelCanvas(ctx context.Context, canvas domain.BusinessModelCanvas) (string, error)
	UpdateBusinessModelCanvas(ctx context.Context, id string, canvas domain.BusinessModelCanvas) error
	DeleteBusinessModelCanvas(ctx context.Context, id string) error

	ReadProjectValueBoards(ctx context.Context) ([]domain.ProjectValueBoard, error)
	CreateProjectValueBoard(ctx context.Context, board domain.ProjectValueBoard) (string, error)
	UpdateProjectValueBoard(ctx context.Context, id string, board domain.ProjectValueBoard) error
	DeleteProjectValueBoard(ctx context.Context, id string) error

	ReadBriefs(ctx context.Context) ([]domain.Brief, error)
	CreateBrief(ctx context.Context, brief domain.Brief) (string, error)
	UpdateBrief(ctx context.Context, id string, brief domain.Brief) error
	DeleteBrief(ctx context.Context, id string) error

	// Capacity Planning
	ReadCapacityPlans(ctx context.Context) ([]domain.CapacityPlan, error)
	CreateCapacityPlan(ctx context.Context, plan domain.CapacityPlan) (string, error)
	UpdateCapacityPlan(ctx context.Context, id string, plan domain.CapacityPlan) error
	DeleteCapacityPlan(ctx context.Context, id string) error
	AddTeamMember(ctx context.Context, planID string, member domain.TeamMember) (string, error)
	UpdateTeamMember(ctx context.Context, planID, memberID string, member domain.TeamMember) error
	DeleteTeamMember(ctx context.Context, planID, memberID string) error
	AddAllocation(ctx context.Context, planID string, alloc domain.WeeklyAllocation) (string, error)
	UpdateAllocation(ctx context.Context, planID, allocID string, alloc domain.WeeklyAllocation) error
	DeleteAllocation(ctx context.Context, planID, allocID string) error

	// Strategic Levels
	ReadStrategicBuilders(ctx context.Context) ([]domain.StrategicLevelsBuilder, error)
	CreateStrategicBuilder(ctx context.Context, builder domain.StrategicLevelsBuilder) (string, error)
	UpdateStrategicBuilder(ctx context.Context, id string, builder domain.StrategicLevelsBuilder) error
	DeleteStrategicBuilder(ctx context.Context, id string) error
	AddStrategicLevel(ctx context.Context, builderID string, level domain.StrategicLevel) (string, error)
	UpdateStrategicLevel(ctx context.Context, builderID, levelID string, level domain.StrategicLevel) error
	DeleteStrategicLevel(ctx context.Context, builderID, levelID string) error

	// Billing - Customers
	ReadCustomers(ctx context.Context) ([]domain.Customer, error)
	CreateCustomer(ctx context.Context, customer domain.Customer) (string, error)
	UpdateCustomer(ctx context.Context, id string, customer domain.Customer) error
	DeleteCustomer(ctx context.Context, id string) error

	// Billing - Rates
	ReadBillingRates(ctx context.Context) ([]domain.BillingRate, error)
	CreateBillingRate(ctx context.Context, rate domain.BillingRate) (string, error)
	UpdateBillingRate(ctx context.Context, id string, rate domain.BillingRate) error
	DeleteBillingRate(ctx context.Context, id string) error

	// Billing - Quotes
	ReadQuotes(ctx context.Context) ([]domain.Quote, error)
	CreateQuote(ctx context.Context, quote domain.Quote) (string, error)
	UpdateQuote(ctx context.Context, id string, quote domain.Quote) error
	DeleteQuote(ctx context.Context, id string) error
	GetNextQuoteNumber(ctx context.Context) (string, error)

	// Billing - Invoices
	ReadInvoices(ctx context.Context) ([]domain.Invoice, error)
	CreateInvoice(ctx context.Context, invoice domain.Invoice) (string, error)
	UpdateInvoice(ctx context.Context, id string, invoice domain.Invoice) error
	DeleteInvoice(ctx context.Context, id string) error
	GetNextInvoiceNumber(ctx context.Context) (string, error)

	// Billing - Payments
	ReadPayments(ctx context.Context) ([]domain.Payment, error)
	CreatePayment(ctx context.Context, payment domain.Payment) (string, error)

	// Time Tracking
	ReadTimeEntries(ctx context.Context) (map[string][]domain.TimeEntry, error)
	GetTimeEntriesForTask(ctx context.Context, taskID string) ([]domain.TimeEntry, error)
	AddTimeEntry(ctx context.Context, taskID string, entry domain.TimeEntry) (string, error)
	DeleteTimeEntry(ctx context.Context, taskID, entryID string) error
}
