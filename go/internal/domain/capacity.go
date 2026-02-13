package domain

// TeamMember represents a team member in capacity planning
type TeamMember struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Role        string   `json:"role,omitempty"`
	HoursPerDay float64  `json:"hoursPerDay"`
	WorkingDays []string `json:"workingDays"` // ["Mon", "Tue", "Wed", "Thu", "Fri"]
}

// WeeklyAllocation represents hours allocated to a team member for a week
type WeeklyAllocation struct {
	ID             string  `json:"id"`
	MemberID       string  `json:"memberId"`
	WeekStart      string  `json:"weekStart"` // YYYY-MM-DD (Monday)
	AllocatedHours float64 `json:"allocatedHours"`
	TargetType     string  `json:"targetType"` // "project", "task", "milestone"
	TargetID       string  `json:"targetId,omitempty"`
	Notes          string  `json:"notes,omitempty"`
}

// CapacityPlan represents a capacity planning configuration
type CapacityPlan struct {
	ID          string             `json:"id"`
	Title       string             `json:"title"`
	Date        string             `json:"date"`
	BudgetHours float64            `json:"budgetHours"`
	TeamMembers []TeamMember       `json:"teamMembers,omitempty"`
	Allocations []WeeklyAllocation `json:"allocations,omitempty"`
}

// MemberUtilization represents computed utilization for a team member
type MemberUtilization struct {
	MemberID          string             `json:"memberId"`
	MemberName        string             `json:"memberName"`
	WeeklyCapacity    float64            `json:"weeklyCapacity"`
	AllocatedByWeek   map[string]float64 `json:"allocatedByWeek"`
	TotalAllocated    float64            `json:"totalAllocated"`
	ActualHours       float64            `json:"actualHours"`
	UtilizationPercent float64           `json:"utilizationPercent"`
}

// AssignmentSuggestion represents an auto-assignment suggestion
type AssignmentSuggestion struct {
	TaskID     string  `json:"taskId"`
	TaskTitle  string  `json:"taskTitle"`
	MemberID   string  `json:"memberId"`
	MemberName string  `json:"memberName"`
	Hours      float64 `json:"hours"`
	WeekStart  string  `json:"weekStart"`
}
