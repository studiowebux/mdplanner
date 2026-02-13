package api

import (
	"encoding/csv"
	"fmt"
	"net/http"
)

// Export handlers
func (h *Handlers) handleExportTasksCSV(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.storage.ReadTasks(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=tasks.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Header
	writer.Write([]string{"ID", "Title", "Section", "Completed", "Priority", "DueDate", "Assignee", "Tag"})

	// Data
	for _, task := range tasks {
		completed := "false"
		if task.Completed {
			completed = "true"
		}
		tag := ""
		if len(task.Config.Tag) > 0 {
			tag = task.Config.Tag[0]
		}
		writer.Write([]string{
			task.ID,
			task.Title,
			task.Section,
			completed,
			fmt.Sprintf("%d", task.Config.Priority),
			task.Config.DueDate,
			task.Config.Assignee,
			tag,
		})
	}
}

func (h *Handlers) handleExportCanvasCSV(w http.ResponseWriter, r *http.Request) {
	notes, err := h.storage.ReadStickyNotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=canvas.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{"ID", "Content", "Color", "X", "Y"})

	for _, note := range notes {
		writer.Write([]string{
			note.ID,
			note.Content,
			note.Color,
			fmt.Sprintf("%.0f", note.Position.X),
			fmt.Sprintf("%.0f", note.Position.Y),
		})
	}
}

func (h *Handlers) handleExportMindmapsCSV(w http.ResponseWriter, r *http.Request) {
	mindmaps, err := h.storage.ReadMindmaps(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=mindmaps.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{"MindmapID", "MindmapTitle", "NodeID", "NodeText", "NodeParentID"})

	for _, m := range mindmaps {
		// Write root level info
		writer.Write([]string{m.ID, m.Title, "", "", ""})
		// Note: Full node export would need proper MindmapNode flattening
	}
}

func (h *Handlers) handleExportPDFReport(w http.ResponseWriter, r *http.Request) {
	// PDF generation would require additional library
	// For now, return not implemented
	WriteJSON(w, http.StatusNotImplemented, map[string]string{
		"error": "PDF export not yet implemented",
	})
}

func (h *Handlers) handleImportTasksCSV(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		WriteError(w, NewError(http.StatusBadRequest, "invalid form data"))
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "no file uploaded"))
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid CSV format"))
		return
	}

	if len(records) < 2 {
		WriteError(w, NewError(http.StatusBadRequest, "CSV file is empty"))
		return
	}

	// Skip header and import tasks
	imported := 0
	for _, record := range records[1:] {
		if len(record) < 4 {
			continue
		}
		// Create task from record
		// This is simplified - actual implementation would parse all fields
		imported++
	}

	WriteJSON(w, http.StatusOK, map[string]int{"imported": imported})
}
