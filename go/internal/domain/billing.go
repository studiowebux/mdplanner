package domain

// BillingAddress represents a customer's billing address
type BillingAddress struct {
	Street     string `json:"street,omitempty"`
	City       string `json:"city,omitempty"`
	State      string `json:"state,omitempty"`
	PostalCode string `json:"postalCode,omitempty"`
	Country    string `json:"country,omitempty"`
}

// Customer represents a billing customer
type Customer struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Email          string         `json:"email,omitempty"`
	Phone          string         `json:"phone,omitempty"`
	Company        string         `json:"company,omitempty"`
	BillingAddress BillingAddress `json:"billingAddress,omitempty"`
	Notes          string         `json:"notes,omitempty"`
	Created        string         `json:"created"`
}

// BillingRate represents an hourly billing rate
type BillingRate struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	HourlyRate float64 `json:"hourlyRate"`
	Assignee   string  `json:"assignee,omitempty"`
	IsDefault  bool    `json:"isDefault"`
}

// QuoteLineItem represents a line item in a quote
type QuoteLineItem struct {
	ID          string  `json:"id"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	Rate        float64 `json:"rate"`
	Amount      float64 `json:"amount"`
}

// Quote represents a quote/estimate
type Quote struct {
	ID         string          `json:"id"`
	Number     string          `json:"number"`
	CustomerID string          `json:"customerId"`
	Title      string          `json:"title"`
	Status     string          `json:"status"` // "draft", "sent", "accepted", "rejected"
	ValidUntil string          `json:"validUntil,omitempty"`
	LineItems  []QuoteLineItem `json:"lineItems,omitempty"`
	Subtotal   float64         `json:"subtotal"`
	TaxRate    float64         `json:"taxRate"`
	Tax        float64         `json:"tax"`
	Total      float64         `json:"total"`
	Notes      string          `json:"notes,omitempty"`
	Created    string          `json:"created"`
	SentAt     string          `json:"sentAt,omitempty"`
	AcceptedAt string          `json:"acceptedAt,omitempty"`
}

// InvoiceLineItem represents a line item in an invoice
type InvoiceLineItem struct {
	ID           string   `json:"id"`
	Description  string   `json:"description"`
	Quantity     float64  `json:"quantity"`
	Rate         float64  `json:"rate"`
	Amount       float64  `json:"amount"`
	TaskID       string   `json:"taskId,omitempty"`
	TimeEntryIDs []string `json:"timeEntryIds,omitempty"`
}

// Invoice represents an invoice
type Invoice struct {
	ID         string            `json:"id"`
	Number     string            `json:"number"`
	CustomerID string            `json:"customerId"`
	QuoteID    string            `json:"quoteId,omitempty"`
	Title      string            `json:"title"`
	Status     string            `json:"status"` // "draft", "sent", "paid", "overdue", "cancelled"
	DueDate    string            `json:"dueDate,omitempty"`
	LineItems  []InvoiceLineItem `json:"lineItems,omitempty"`
	Subtotal   float64           `json:"subtotal"`
	TaxRate    float64           `json:"taxRate"`
	Tax        float64           `json:"tax"`
	Total      float64           `json:"total"`
	PaidAmount float64           `json:"paidAmount"`
	Notes      string            `json:"notes,omitempty"`
	Created    string            `json:"created"`
	SentAt     string            `json:"sentAt,omitempty"`
	PaidAt     string            `json:"paidAt,omitempty"`
}

// Payment represents a payment on an invoice
type Payment struct {
	ID        string  `json:"id"`
	InvoiceID string  `json:"invoiceId"`
	Amount    float64 `json:"amount"`
	Date      string  `json:"date"`
	Method    string  `json:"method,omitempty"` // "bank", "card", "cash", "other"
	Reference string  `json:"reference,omitempty"`
	Notes     string  `json:"notes,omitempty"`
}

// BillingSummary represents aggregated billing metrics
type BillingSummary struct {
	TotalOutstanding float64 `json:"totalOutstanding"`
	TotalOverdue     float64 `json:"totalOverdue"`
	TotalPaid        float64 `json:"totalPaid"`
	TotalInvoiced    float64 `json:"totalInvoiced"`
	PendingQuotes    int     `json:"pendingQuotes"`
	AcceptedQuotes   int     `json:"acceptedQuotes"`
	DraftInvoices    int     `json:"draftInvoices"`
	SentInvoices     int     `json:"sentInvoices"`
	PaidInvoices     int     `json:"paidInvoices"`
	OverdueInvoices  int     `json:"overdueInvoices"`
}
