package markdown

import (
	"os"
	"strings"
)

// Section markers used in markdown files
const (
	MarkerConfigurations      = "<!-- Configurations -->"
	MarkerNotes               = "<!-- Notes -->"
	MarkerGoals               = "<!-- Goals -->"
	MarkerMilestones          = "<!-- Milestones -->"
	MarkerIdeas               = "<!-- Ideas -->"
	MarkerRetrospectives      = "<!-- Retrospectives -->"
	MarkerCanvas              = "<!-- Canvas -->"
	MarkerMindmap             = "<!-- Mindmap -->"
	MarkerC4Architecture      = "<!-- C4 Architecture -->"
	MarkerSwotAnalysis        = "<!-- SWOT Analysis -->"
	MarkerRiskAnalysis        = "<!-- Risk Analysis -->"
	MarkerLeanCanvas          = "<!-- Lean Canvas -->"
	MarkerBusinessModelCanvas = "<!-- Business Model Canvas -->"
	MarkerProjectValueBoard   = "<!-- Project Value Board -->"
	MarkerBrief               = "<!-- Brief -->"
	MarkerCapacityPlanning    = "<!-- Capacity Planning -->"
	MarkerStrategicLevels     = "<!-- Strategic Levels -->"
	MarkerCustomers           = "<!-- Customers -->"
	MarkerBillingRates        = "<!-- Billing Rates -->"
	MarkerQuotes              = "<!-- Quotes -->"
	MarkerInvoices            = "<!-- Invoices -->"
	MarkerPayments            = "<!-- Payments -->"
	MarkerTimeTracking        = "<!-- Time Tracking -->"
	MarkerBoard               = "<!-- Board -->"
)

// SectionOrder defines the order of sections in the markdown file
var SectionOrder = []string{
	MarkerConfigurations,
	MarkerNotes,
	MarkerGoals,
	MarkerMilestones,
	MarkerIdeas,
	MarkerRetrospectives,
	MarkerCanvas,
	MarkerMindmap,
	MarkerC4Architecture,
	MarkerSwotAnalysis,
	MarkerRiskAnalysis,
	MarkerLeanCanvas,
	MarkerBusinessModelCanvas,
	MarkerProjectValueBoard,
	MarkerBrief,
	MarkerCapacityPlanning,
	MarkerStrategicLevels,
	MarkerCustomers,
	MarkerBillingRates,
	MarkerQuotes,
	MarkerInvoices,
	MarkerPayments,
	MarkerTimeTracking,
	MarkerBoard,
}

// Reader handles reading and parsing markdown files
type Reader struct{}

// NewReader creates a new markdown reader
func NewReader() *Reader {
	return &Reader{}
}

// ReadFile reads a markdown file and returns its lines
func (r *Reader) ReadFile(filePath string) ([]string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	return strings.Split(string(content), "\n"), nil
}

// FindSectionBounds finds the start and end line indices for a section
// Returns startIdx (line after marker), endIdx (line before next section or EOF)
func (r *Reader) FindSectionBounds(lines []string, marker string) (startIdx, endIdx int, found bool) {
	startIdx = -1
	endIdx = len(lines)

	// Also check for header version (e.g., "# Notes" for "<!-- Notes -->")
	headerName := strings.TrimSuffix(strings.TrimPrefix(marker, "<!-- "), " -->")
	header := "# " + headerName

	markerLineIdx := -1 // Track where we found the marker

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Found start marker
		if startIdx == -1 {
			if trimmed == marker || trimmed == header {
				markerLineIdx = i
				startIdx = i + 1
				found = true
				continue
			}
		} else {
			// Skip the matching header if it immediately follows the comment marker
			// e.g., <!-- Board --> followed by # Board on next non-empty line
			if trimmed == header && i <= markerLineIdx+2 {
				startIdx = i + 1 // Move start past the header
				continue
			}

			// Look for next section marker or header
			if strings.HasPrefix(trimmed, "<!-- ") && strings.HasSuffix(trimmed, " -->") {
				// Check if it's a known section marker
				for _, m := range SectionOrder {
					if trimmed == m {
						endIdx = i
						return
					}
				}
			}
			// Check for top-level header that starts a new section
			if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "## ") {
				for _, m := range SectionOrder {
					h := "# " + strings.TrimSuffix(strings.TrimPrefix(m, "<!-- "), " -->")
					if trimmed == h {
						endIdx = i
						return
					}
				}
			}
		}
	}

	return
}

// ExtractSection extracts lines for a specific section
func (r *Reader) ExtractSection(lines []string, marker string) []string {
	start, end, found := r.FindSectionBounds(lines, marker)
	if !found {
		return nil
	}
	if start >= end {
		return nil
	}
	return lines[start:end]
}

// GetProjectNameAndDescription extracts the project name and description from the start of the file
func (r *Reader) GetProjectNameAndDescription(lines []string) (name, description string) {
	var descLines []string
	foundName := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip empty lines at the start
		if !foundName && trimmed == "" {
			continue
		}

		// First # header is the project name
		if !foundName && strings.HasPrefix(trimmed, "# ") {
			name = strings.TrimPrefix(trimmed, "# ")
			foundName = true
			continue
		}

		// Stop at first section marker or second # header
		if strings.HasPrefix(trimmed, "<!-- ") || (foundName && strings.HasPrefix(trimmed, "# ")) {
			break
		}

		if foundName && trimmed != "" {
			descLines = append(descLines, trimmed)
		}
	}

	description = strings.Join(descLines, "\n")
	return
}
