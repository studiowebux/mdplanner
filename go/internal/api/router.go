package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/studiowebux/mdplanner/internal/storage"
)

// Router creates and configures the HTTP router
func Router(staticHandler http.Handler, store storage.Storage) http.Handler {
	r := chi.NewRouter()

	// Apply middleware
	r.Use(CORS)
	r.Use(Logger)
	r.Use(Recoverer)

	// Create handlers with storage dependency
	h := NewHandlers(store)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Version
		r.Get("/version", handleVersion)

		// Projects
		r.Get("/projects", h.handleGetProjects)
		r.Get("/projects/active", h.handleGetActiveProject)
		r.Post("/projects/switch", h.handleSwitchProject)
		r.Post("/projects", h.handleCreateProject)

		// Project info/config
		r.Get("/project", h.handleGetProjectInfo)
		r.Get("/project/config", h.handleGetProjectConfig)
		r.Post("/project/config", h.handleSaveProjectConfig)
		r.Get("/project/sections", h.handleGetSections)
		r.Post("/project/rewrite", h.handleRewriteProject)

		// Tasks
		r.Get("/tasks", h.handleGetTasks)
		r.Post("/tasks", h.handleCreateTask)
		r.Get("/tasks/{id}", h.handleGetTask)
		r.Put("/tasks/{id}", h.handleUpdateTask)
		r.Delete("/tasks/{id}", h.handleDeleteTask)
		r.Patch("/tasks/{id}/move", h.handleMoveTask)

		// Notes
		r.Get("/notes", h.handleGetNotes)
		r.Post("/notes", h.handleCreateNote)
		r.Get("/notes/{id}", h.handleGetNote)
		r.Put("/notes/{id}", h.handleUpdateNote)
		r.Delete("/notes/{id}", h.handleDeleteNote)

		// Goals
		r.Get("/goals", h.handleGetGoals)
		r.Post("/goals", h.handleCreateGoal)
		r.Get("/goals/{id}", h.handleGetGoal)
		r.Put("/goals/{id}", h.handleUpdateGoal)
		r.Delete("/goals/{id}", h.handleDeleteGoal)

		// Milestones
		r.Get("/milestones", h.handleGetMilestones)
		r.Post("/milestones", h.handleCreateMilestone)
		r.Put("/milestones/{id}", h.handleUpdateMilestone)
		r.Delete("/milestones/{id}", h.handleDeleteMilestone)

		// Ideas
		r.Get("/ideas", h.handleGetIdeas)
		r.Post("/ideas", h.handleCreateIdea)
		r.Put("/ideas/{id}", h.handleUpdateIdea)
		r.Delete("/ideas/{id}", h.handleDeleteIdea)

		// Retrospectives
		r.Get("/retrospectives", h.handleGetRetrospectives)
		r.Post("/retrospectives", h.handleCreateRetrospective)
		r.Put("/retrospectives/{id}", h.handleUpdateRetrospective)
		r.Delete("/retrospectives/{id}", h.handleDeleteRetrospective)

		// SWOT
		r.Get("/swot", h.handleGetSwot)
		r.Post("/swot", h.handleCreateSwot)
		r.Put("/swot/{id}", h.handleUpdateSwot)
		r.Delete("/swot/{id}", h.handleDeleteSwot)

		// Risk Analysis
		r.Get("/risk-analysis", h.handleGetRiskAnalysis)
		r.Post("/risk-analysis", h.handleCreateRiskAnalysis)
		r.Put("/risk-analysis/{id}", h.handleUpdateRiskAnalysis)
		r.Delete("/risk-analysis/{id}", h.handleDeleteRiskAnalysis)

		// Lean Canvas
		r.Get("/lean-canvas", h.handleGetLeanCanvas)
		r.Post("/lean-canvas", h.handleCreateLeanCanvas)
		r.Put("/lean-canvas/{id}", h.handleUpdateLeanCanvas)
		r.Delete("/lean-canvas/{id}", h.handleDeleteLeanCanvas)

		// Business Model
		r.Get("/business-model", h.handleGetBusinessModel)
		r.Post("/business-model", h.handleCreateBusinessModel)
		r.Put("/business-model/{id}", h.handleUpdateBusinessModel)
		r.Delete("/business-model/{id}", h.handleDeleteBusinessModel)

		// Project Value Board
		r.Get("/project-value-board", h.handleGetProjectValueBoard)
		r.Post("/project-value-board", h.handleCreateProjectValueBoard)
		r.Put("/project-value-board/{id}", h.handleUpdateProjectValueBoard)
		r.Delete("/project-value-board/{id}", h.handleDeleteProjectValueBoard)

		// Brief
		r.Get("/brief", h.handleGetBrief)
		r.Post("/brief", h.handleCreateBrief)
		r.Put("/brief/{id}", h.handleUpdateBrief)
		r.Delete("/brief/{id}", h.handleDeleteBrief)

		// Canvas (Sticky Notes)
		r.Get("/canvas/sticky_notes", h.handleGetStickyNotes)
		r.Post("/canvas/sticky_notes", h.handleCreateStickyNote)
		r.Put("/canvas/sticky_notes/{id}", h.handleUpdateStickyNote)
		r.Delete("/canvas/sticky_notes/{id}", h.handleDeleteStickyNote)

		// Mindmaps
		r.Get("/mindmaps", h.handleGetMindmaps)
		r.Post("/mindmaps", h.handleCreateMindmap)
		r.Get("/mindmaps/{id}", h.handleGetMindmap)
		r.Put("/mindmaps/{id}", h.handleUpdateMindmap)
		r.Delete("/mindmaps/{id}", h.handleDeleteMindmap)

		// C4 Architecture
		r.Get("/c4", h.handleGetC4)
		r.Post("/c4", h.handleCreateC4)
		r.Put("/c4/{id}", h.handleUpdateC4)
		r.Delete("/c4/{id}", h.handleDeleteC4)

		// Time Tracking
		r.Get("/time-entries", h.handleGetTimeEntries)
		r.Get("/time-entries/{taskId}", h.handleGetTimeEntriesForTask)
		r.Post("/time-entries/{taskId}", h.handleAddTimeEntry)
		r.Delete("/time-entries/{taskId}/{entryId}", h.handleDeleteTimeEntry)

		// Capacity Planning
		r.Get("/capacity", h.handleGetCapacityPlans)
		r.Post("/capacity", h.handleCreateCapacityPlan)
		r.Get("/capacity/{id}", h.handleGetCapacityPlan)
		r.Put("/capacity/{id}", h.handleUpdateCapacityPlan)
		r.Delete("/capacity/{id}", h.handleDeleteCapacityPlan)
		r.Post("/capacity/{id}/members", h.handleAddTeamMember)
		r.Put("/capacity/{id}/members/{mid}", h.handleUpdateTeamMember)
		r.Delete("/capacity/{id}/members/{mid}", h.handleDeleteTeamMember)
		r.Post("/capacity/{id}/allocations", h.handleAddAllocation)
		r.Put("/capacity/{id}/allocations/{aid}", h.handleUpdateAllocation)
		r.Delete("/capacity/{id}/allocations/{aid}", h.handleDeleteAllocation)
		r.Get("/capacity/{id}/utilization", h.handleGetUtilization)
		r.Get("/capacity/{id}/suggest-assignments", h.handleSuggestAssignments)
		r.Post("/capacity/{id}/apply-assignments", h.handleApplyAssignments)

		// Strategic Levels
		r.Get("/strategic-levels", h.handleGetStrategicLevels)
		r.Post("/strategic-levels", h.handleCreateStrategicBuilder)
		r.Get("/strategic-levels/{id}", h.handleGetStrategicBuilder)
		r.Put("/strategic-levels/{id}", h.handleUpdateStrategicBuilder)
		r.Delete("/strategic-levels/{id}", h.handleDeleteStrategicBuilder)
		r.Post("/strategic-levels/{id}/levels", h.handleAddStrategicLevel)
		r.Put("/strategic-levels/{id}/levels/{lid}", h.handleUpdateStrategicLevel)
		r.Delete("/strategic-levels/{id}/levels/{lid}", h.handleDeleteStrategicLevel)

		// Billing - Customers
		r.Get("/customers", h.handleGetCustomers)
		r.Post("/customers", h.handleCreateCustomer)
		r.Get("/customers/{id}", h.handleGetCustomer)
		r.Put("/customers/{id}", h.handleUpdateCustomer)
		r.Delete("/customers/{id}", h.handleDeleteCustomer)

		// Billing - Rates
		r.Get("/billing-rates", h.handleGetBillingRates)
		r.Post("/billing-rates", h.handleCreateBillingRate)
		r.Put("/billing-rates/{id}", h.handleUpdateBillingRate)
		r.Delete("/billing-rates/{id}", h.handleDeleteBillingRate)

		// Billing - Quotes
		r.Get("/quotes", h.handleGetQuotes)
		r.Post("/quotes", h.handleCreateQuote)
		r.Get("/quotes/{id}", h.handleGetQuote)
		r.Put("/quotes/{id}", h.handleUpdateQuote)
		r.Delete("/quotes/{id}", h.handleDeleteQuote)
		r.Post("/quotes/{id}/send", h.handleSendQuote)
		r.Post("/quotes/{id}/accept", h.handleAcceptQuote)
		r.Post("/quotes/{id}/to-invoice", h.handleQuoteToInvoice)

		// Billing - Invoices
		r.Get("/invoices", h.handleGetInvoices)
		r.Post("/invoices", h.handleCreateInvoice)
		r.Get("/invoices/{id}", h.handleGetInvoice)
		r.Put("/invoices/{id}", h.handleUpdateInvoice)
		r.Delete("/invoices/{id}", h.handleDeleteInvoice)
		r.Post("/invoices/{id}/send", h.handleSendInvoice)
		r.Get("/invoices/{id}/payments", h.handleGetPayments)
		r.Post("/invoices/{id}/payments", h.handleCreatePayment)
		r.Post("/invoices/generate", h.handleGenerateInvoice)

		// Billing Summary
		r.Get("/billing/summary", h.handleBillingSummary)

		// Export
		r.Get("/export/csv/tasks", h.handleExportTasksCSV)
		r.Get("/export/csv/canvas", h.handleExportCanvasCSV)
		r.Get("/export/csv/mindmaps", h.handleExportMindmapsCSV)
		r.Get("/export/pdf/report", h.handleExportPDFReport)

		// Import
		r.Post("/import/csv/tasks", h.handleImportTasksCSV)
	})

	// Static files (catch-all)
	r.Handle("/*", staticHandler)

	return r
}

// Version info
const (
	Version    = "2.0.0"
	GithubRepo = "studiowebux/mdplanner"
)

func handleVersion(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"current":         Version,
		"latest":          nil,
		"updateAvailable": false,
		"repo":            GithubRepo,
	})
}
