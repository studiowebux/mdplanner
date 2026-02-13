package domain

// SwotAnalysis represents a SWOT analysis matrix
type SwotAnalysis struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Date          string   `json:"date"`
	Strengths     []string `json:"strengths,omitempty"`
	Weaknesses    []string `json:"weaknesses,omitempty"`
	Opportunities []string `json:"opportunities,omitempty"`
	Threats       []string `json:"threats,omitempty"`
}

// RiskAnalysis represents a risk analysis matrix (Impact x Probability)
type RiskAnalysis struct {
	ID                 string   `json:"id"`
	Title              string   `json:"title"`
	Date               string   `json:"date"`
	HighImpactHighProb []string `json:"highImpactHighProb,omitempty"`
	HighImpactLowProb  []string `json:"highImpactLowProb,omitempty"`
	LowImpactHighProb  []string `json:"lowImpactHighProb,omitempty"`
	LowImpactLowProb   []string `json:"lowImpactLowProb,omitempty"`
}

// LeanCanvas represents a Lean Canvas (12 sections)
type LeanCanvas struct {
	ID                   string   `json:"id"`
	Title                string   `json:"title"`
	Date                 string   `json:"date"`
	Problem              []string `json:"problem,omitempty"`
	Solution             []string `json:"solution,omitempty"`
	UniqueValueProp      []string `json:"uniqueValueProp,omitempty"`
	UnfairAdvantage      []string `json:"unfairAdvantage,omitempty"`
	CustomerSegments     []string `json:"customerSegments,omitempty"`
	ExistingAlternatives []string `json:"existingAlternatives,omitempty"`
	KeyMetrics           []string `json:"keyMetrics,omitempty"`
	HighLevelConcept     []string `json:"highLevelConcept,omitempty"`
	Channels             []string `json:"channels,omitempty"`
	EarlyAdopters        []string `json:"earlyAdopters,omitempty"`
	CostStructure        []string `json:"costStructure,omitempty"`
	RevenueStreams       []string `json:"revenueStreams,omitempty"`
}

// BusinessModelCanvas represents a Business Model Canvas (9 sections)
type BusinessModelCanvas struct {
	ID                    string   `json:"id"`
	Title                 string   `json:"title"`
	Date                  string   `json:"date"`
	KeyPartners           []string `json:"keyPartners,omitempty"`
	KeyActivities         []string `json:"keyActivities,omitempty"`
	KeyResources          []string `json:"keyResources,omitempty"`
	ValueProposition      []string `json:"valueProposition,omitempty"`
	CustomerRelationships []string `json:"customerRelationships,omitempty"`
	Channels              []string `json:"channels,omitempty"`
	CustomerSegments      []string `json:"customerSegments,omitempty"`
	CostStructure         []string `json:"costStructure,omitempty"`
	RevenueStreams        []string `json:"revenueStreams,omitempty"`
}

// ProjectValueBoard represents a Project Value Board (4 sections)
type ProjectValueBoard struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	Date             string   `json:"date"`
	CustomerSegments []string `json:"customerSegments,omitempty"`
	Problem          []string `json:"problem,omitempty"`
	Solution         []string `json:"solution,omitempty"`
	Benefit          []string `json:"benefit,omitempty"`
}

// Brief represents a project brief (11 RACI sections)
type Brief struct {
	ID                string   `json:"id"`
	Title             string   `json:"title"`
	Date              string   `json:"date"`
	Summary           []string `json:"summary,omitempty"`
	Mission           []string `json:"mission,omitempty"`
	Responsible       []string `json:"responsible,omitempty"`
	Accountable       []string `json:"accountable,omitempty"`
	Consulted         []string `json:"consulted,omitempty"`
	Informed          []string `json:"informed,omitempty"`
	HighLevelBudget   []string `json:"highLevelBudget,omitempty"`
	HighLevelTimeline []string `json:"highLevelTimeline,omitempty"`
	Culture           []string `json:"culture,omitempty"`
	ChangeCapacity    []string `json:"changeCapacity,omitempty"`
	GuidingPrinciples []string `json:"guidingPrinciples,omitempty"`
}
