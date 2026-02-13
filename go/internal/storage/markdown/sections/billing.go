package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// BillingParser handles parsing and serializing Billing data from markdown
// This includes Billing Rates, Quotes, Invoices, and Payments
type BillingParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewBillingParser creates a new Billing parser
func NewBillingParser() *BillingParser {
	return &BillingParser{
		idPattern:     regexp.MustCompile(`<!-- id: ([^ ]+) -->`),
		headerPattern: regexp.MustCompile(`^### (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// BillingData holds all billing-related entities
type BillingData struct {
	Rates    []domain.BillingRate
	Quotes   []domain.Quote
	Invoices []domain.Invoice
	Payments []domain.Payment
}

// Parse extracts all billing data from lines
// Assumes lines are already extracted for this section
func (p *BillingParser) Parse(lines []string) BillingData {
	data := BillingData{
		Rates:    []domain.BillingRate{},
		Quotes:   []domain.Quote{},
		Invoices: []domain.Invoice{},
		Payments: []domain.Payment{},
	}

	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Billing") || trimmed == "<!-- Billing -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Billing") {
			break
		}

		// Subsection headers
		switch trimmed {
		case "## Rates":
			currentSubsection = "rates"
			continue
		case "## Quotes":
			currentSubsection = "quotes"
			continue
		case "## Invoices":
			currentSubsection = "invoices"
			continue
		case "## Payments":
			currentSubsection = "payments"
			continue
		}

		// Parse items based on subsection
		if strings.HasPrefix(trimmed, "- {") && strings.HasSuffix(trimmed, "}") {
			configStr := trimmed[3 : len(trimmed)-1]
			config := p.configParser.ParseConfigString(configStr)

			switch currentSubsection {
			case "rates":
				rate := domain.BillingRate{
					ID:         config["id"],
					Name:       config["name"],
					HourlyRate: p.configParser.ParseFloat(config["hourlyRate"], 0),
					Assignee:   config["assignee"],
					IsDefault:  p.configParser.ParseBool(config["isDefault"], false),
				}
				if rate.ID == "" {
					rate.ID = generateID()
				}
				data.Rates = append(data.Rates, rate)

			case "quotes":
				quote := domain.Quote{
					ID:         config["id"],
					Number:     config["number"],
					CustomerID: config["customerId"],
					Title:      config["title"],
					Status:     config["status"],
					ValidUntil: config["validUntil"],
					Subtotal:   p.configParser.ParseFloat(config["subtotal"], 0),
					TaxRate:    p.configParser.ParseFloat(config["taxRate"], 0),
					Tax:        p.configParser.ParseFloat(config["tax"], 0),
					Total:      p.configParser.ParseFloat(config["total"], 0),
					Notes:      config["notes"],
					Created:    config["created"],
					SentAt:     config["sentAt"],
					AcceptedAt: config["acceptedAt"],
					LineItems:  p.parseQuoteLineItems(config["lineItems"]),
				}
				if quote.ID == "" {
					quote.ID = generateID()
				}
				if quote.Status == "" {
					quote.Status = "draft"
				}
				if quote.Created == "" {
					quote.Created = time.Now().Format(time.RFC3339)
				}
				data.Quotes = append(data.Quotes, quote)

			case "invoices":
				invoice := domain.Invoice{
					ID:         config["id"],
					Number:     config["number"],
					CustomerID: config["customerId"],
					QuoteID:    config["quoteId"],
					Title:      config["title"],
					Status:     config["status"],
					DueDate:    config["dueDate"],
					Subtotal:   p.configParser.ParseFloat(config["subtotal"], 0),
					TaxRate:    p.configParser.ParseFloat(config["taxRate"], 0),
					Tax:        p.configParser.ParseFloat(config["tax"], 0),
					Total:      p.configParser.ParseFloat(config["total"], 0),
					PaidAmount: p.configParser.ParseFloat(config["paidAmount"], 0),
					Notes:      config["notes"],
					Created:    config["created"],
					SentAt:     config["sentAt"],
					PaidAt:     config["paidAt"],
					LineItems:  p.parseInvoiceLineItems(config["lineItems"]),
				}
				if invoice.ID == "" {
					invoice.ID = generateID()
				}
				if invoice.Status == "" {
					invoice.Status = "draft"
				}
				if invoice.Created == "" {
					invoice.Created = time.Now().Format(time.RFC3339)
				}
				data.Invoices = append(data.Invoices, invoice)

			case "payments":
				payment := domain.Payment{
					ID:        config["id"],
					InvoiceID: config["invoiceId"],
					Amount:    p.configParser.ParseFloat(config["amount"], 0),
					Date:      config["date"],
					Method:    config["method"],
					Reference: config["reference"],
					Notes:     config["notes"],
				}
				if payment.ID == "" {
					payment.ID = generateID()
				}
				if payment.Date == "" {
					payment.Date = time.Now().Format("2006-01-02")
				}
				data.Payments = append(data.Payments, payment)
			}
		}
	}

	return data
}

func (p *BillingParser) parseQuoteLineItems(itemsStr string) []domain.QuoteLineItem {
	var items []domain.QuoteLineItem
	// Simple format: [{desc: x, qty: 1, rate: 100, amount: 100}]
	// For now, return empty - line items are typically managed via API
	return items
}

func (p *BillingParser) parseInvoiceLineItems(itemsStr string) []domain.InvoiceLineItem {
	var items []domain.InvoiceLineItem
	// Simple format: [{desc: x, qty: 1, rate: 100, amount: 100}]
	// For now, return empty - line items are typically managed via API
	return items
}

// Serialize converts BillingData to markdown
func (p *BillingParser) Serialize(data BillingData) string {
	var sb strings.Builder

	sb.WriteString("<!-- Billing -->\n")
	sb.WriteString("# Billing\n\n")

	// Rates
	sb.WriteString("## Rates\n")
	for _, rate := range data.Rates {
		sb.WriteString(fmt.Sprintf("- {id: %s; name: %s; hourlyRate: %.2f; assignee: %s; isDefault: %t}\n",
			rate.ID, rate.Name, rate.HourlyRate, rate.Assignee, rate.IsDefault))
	}
	sb.WriteString("\n")

	// Quotes
	sb.WriteString("## Quotes\n")
	for _, quote := range data.Quotes {
		sb.WriteString(fmt.Sprintf("- {id: %s; number: %s; customerId: %s; title: %s; status: %s; validUntil: %s; subtotal: %.2f; taxRate: %.2f; tax: %.2f; total: %.2f; created: %s",
			quote.ID, quote.Number, quote.CustomerID, quote.Title, quote.Status, quote.ValidUntil,
			quote.Subtotal, quote.TaxRate, quote.Tax, quote.Total, quote.Created))
		if quote.Notes != "" {
			sb.WriteString(fmt.Sprintf("; notes: %s", quote.Notes))
		}
		if quote.SentAt != "" {
			sb.WriteString(fmt.Sprintf("; sentAt: %s", quote.SentAt))
		}
		if quote.AcceptedAt != "" {
			sb.WriteString(fmt.Sprintf("; acceptedAt: %s", quote.AcceptedAt))
		}
		sb.WriteString("}\n")
	}
	sb.WriteString("\n")

	// Invoices
	sb.WriteString("## Invoices\n")
	for _, invoice := range data.Invoices {
		sb.WriteString(fmt.Sprintf("- {id: %s; number: %s; customerId: %s; title: %s; status: %s; dueDate: %s; subtotal: %.2f; taxRate: %.2f; tax: %.2f; total: %.2f; paidAmount: %.2f; created: %s",
			invoice.ID, invoice.Number, invoice.CustomerID, invoice.Title, invoice.Status, invoice.DueDate,
			invoice.Subtotal, invoice.TaxRate, invoice.Tax, invoice.Total, invoice.PaidAmount, invoice.Created))
		if invoice.QuoteID != "" {
			sb.WriteString(fmt.Sprintf("; quoteId: %s", invoice.QuoteID))
		}
		if invoice.Notes != "" {
			sb.WriteString(fmt.Sprintf("; notes: %s", invoice.Notes))
		}
		if invoice.SentAt != "" {
			sb.WriteString(fmt.Sprintf("; sentAt: %s", invoice.SentAt))
		}
		if invoice.PaidAt != "" {
			sb.WriteString(fmt.Sprintf("; paidAt: %s", invoice.PaidAt))
		}
		sb.WriteString("}\n")
	}
	sb.WriteString("\n")

	// Payments
	sb.WriteString("## Payments\n")
	for _, payment := range data.Payments {
		sb.WriteString(fmt.Sprintf("- {id: %s; invoiceId: %s; amount: %.2f; date: %s; method: %s",
			payment.ID, payment.InvoiceID, payment.Amount, payment.Date, payment.Method))
		if payment.Reference != "" {
			sb.WriteString(fmt.Sprintf("; reference: %s", payment.Reference))
		}
		if payment.Notes != "" {
			sb.WriteString(fmt.Sprintf("; notes: %s", payment.Notes))
		}
		sb.WriteString("}\n")
	}
	sb.WriteString("\n")

	return sb.String()
}

// FindRateByID finds a BillingRate by ID
func (p *BillingParser) FindRateByID(rates []domain.BillingRate, id string) *domain.BillingRate {
	for i := range rates {
		if rates[i].ID == id {
			return &rates[i]
		}
	}
	return nil
}

// FindQuoteByID finds a Quote by ID
func (p *BillingParser) FindQuoteByID(quotes []domain.Quote, id string) *domain.Quote {
	for i := range quotes {
		if quotes[i].ID == id {
			return &quotes[i]
		}
	}
	return nil
}

// FindInvoiceByID finds an Invoice by ID
func (p *BillingParser) FindInvoiceByID(invoices []domain.Invoice, id string) *domain.Invoice {
	for i := range invoices {
		if invoices[i].ID == id {
			return &invoices[i]
		}
	}
	return nil
}

// FindPaymentByID finds a Payment by ID
func (p *BillingParser) FindPaymentByID(payments []domain.Payment, id string) *domain.Payment {
	for i := range payments {
		if payments[i].ID == id {
			return &payments[i]
		}
	}
	return nil
}

// GenerateID creates a unique ID
func (p *BillingParser) GenerateID() string {
	return generateID()
}
