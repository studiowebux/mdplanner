package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// CustomersParser handles parsing and serializing Customers from markdown
type CustomersParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewCustomersParser creates a new Customers parser
func NewCustomersParser() *CustomersParser {
	return &CustomersParser{
		idPattern:     regexp.MustCompile(`<!-- id: ([^ ]+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts Customers from lines
// Assumes lines are already extracted for this section
func (p *CustomersParser) Parse(lines []string) []domain.Customer {
	var customers []domain.Customer
	var current *domain.Customer
	var notesLines []string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Customers") || trimmed == "<!-- Customers -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Customers") {
			if current != nil && current.Name != "" {
				current.Notes = strings.TrimSpace(strings.Join(notesLines, "\n"))
				customers = append(customers, *current)
			}
			break
		}

		// Customer header with config
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if current != nil && current.Name != "" {
				current.Notes = strings.TrimSpace(strings.Join(notesLines, "\n"))
				customers = append(customers, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			current = &domain.Customer{
				ID:      generateID(),
				Name:    match[1],
				Email:   config["email"],
				Phone:   config["phone"],
				Company: config["company"],
				BillingAddress: domain.BillingAddress{
					Street:     config["street"],
					City:       config["city"],
					State:      config["state"],
					PostalCode: config["postalCode"],
					Country:    config["country"],
				},
				Created: config["created"],
			}
			if current.Created == "" {
				current.Created = time.Now().Format(time.RFC3339)
			}
			notesLines = []string{}
			continue
		}

		if current == nil {
			continue
		}

		// Check for ID comment
		if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			current.ID = match[1]
			continue
		}

		// Notes line
		if trimmed != "" || len(notesLines) > 0 {
			notesLines = append(notesLines, trimmed)
		}
	}

	// Don't forget last customer
	if current != nil && current.Name != "" {
		current.Notes = strings.TrimSpace(strings.Join(notesLines, "\n"))
		customers = append(customers, *current)
	}

	return customers
}

// Serialize converts Customers to markdown
func (p *CustomersParser) Serialize(customers []domain.Customer) string {
	var sb strings.Builder

	sb.WriteString("<!-- Customers -->\n")
	sb.WriteString("# Customers\n\n")

	for _, customer := range customers {
		configParts := []string{}
		if customer.Email != "" {
			configParts = append(configParts, fmt.Sprintf("email: %s", customer.Email))
		}
		if customer.Phone != "" {
			configParts = append(configParts, fmt.Sprintf("phone: %s", customer.Phone))
		}
		if customer.Company != "" {
			configParts = append(configParts, fmt.Sprintf("company: %s", customer.Company))
		}
		if customer.BillingAddress.Street != "" {
			configParts = append(configParts, fmt.Sprintf("street: %s", customer.BillingAddress.Street))
		}
		if customer.BillingAddress.City != "" {
			configParts = append(configParts, fmt.Sprintf("city: %s", customer.BillingAddress.City))
		}
		if customer.BillingAddress.State != "" {
			configParts = append(configParts, fmt.Sprintf("state: %s", customer.BillingAddress.State))
		}
		if customer.BillingAddress.PostalCode != "" {
			configParts = append(configParts, fmt.Sprintf("postalCode: %s", customer.BillingAddress.PostalCode))
		}
		if customer.BillingAddress.Country != "" {
			configParts = append(configParts, fmt.Sprintf("country: %s", customer.BillingAddress.Country))
		}
		configParts = append(configParts, fmt.Sprintf("created: %s", customer.Created))

		sb.WriteString(fmt.Sprintf("## %s {%s}\n\n", customer.Name, strings.Join(configParts, "; ")))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", customer.ID))

		if customer.Notes != "" {
			sb.WriteString(customer.Notes)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a Customer by ID
func (p *CustomersParser) FindByID(customers []domain.Customer, id string) *domain.Customer {
	for i := range customers {
		if customers[i].ID == id {
			return &customers[i]
		}
	}
	return nil
}

// GenerateID creates a unique Customer ID
func (p *CustomersParser) GenerateID() string {
	return generateID()
}
