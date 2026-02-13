package api

import (
	"net/http"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// Customer handlers
func (h *Handlers) handleGetCustomers(w http.ResponseWriter, r *http.Request) {
	customers, err := h.storage.ReadCustomers(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, customers)
}

func (h *Handlers) handleCreateCustomer(w http.ResponseWriter, r *http.Request) {
	var customer domain.Customer
	if err := parseJSON(r, &customer); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateCustomer(r.Context(), customer)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetCustomer(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	customers, err := h.storage.ReadCustomers(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, c := range customers {
		if c.ID == id {
			WriteJSON(w, http.StatusOK, c)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "customer not found"))
}

func (h *Handlers) handleUpdateCustomer(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var customer domain.Customer
	if err := parseJSON(r, &customer); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateCustomer(r.Context(), id, customer); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteCustomer(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteCustomer(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Billing Rate handlers
func (h *Handlers) handleGetBillingRates(w http.ResponseWriter, r *http.Request) {
	rates, err := h.storage.ReadBillingRates(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, rates)
}

func (h *Handlers) handleCreateBillingRate(w http.ResponseWriter, r *http.Request) {
	var rate domain.BillingRate
	if err := parseJSON(r, &rate); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateBillingRate(r.Context(), rate)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateBillingRate(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var rate domain.BillingRate
	if err := parseJSON(r, &rate); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateBillingRate(r.Context(), id, rate); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteBillingRate(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteBillingRate(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Quote handlers
func (h *Handlers) handleGetQuotes(w http.ResponseWriter, r *http.Request) {
	quotes, err := h.storage.ReadQuotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, quotes)
}

func (h *Handlers) handleCreateQuote(w http.ResponseWriter, r *http.Request) {
	var quote domain.Quote
	if err := parseJSON(r, &quote); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateQuote(r.Context(), quote)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetQuote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	quotes, err := h.storage.ReadQuotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, q := range quotes {
		if q.ID == id {
			WriteJSON(w, http.StatusOK, q)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "quote not found"))
}

func (h *Handlers) handleUpdateQuote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var quote domain.Quote
	if err := parseJSON(r, &quote); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateQuote(r.Context(), id, quote); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteQuote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteQuote(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleSendQuote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	quotes, err := h.storage.ReadQuotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, q := range quotes {
		if q.ID == id {
			q.Status = "sent"
			q.SentAt = time.Now().Format(time.RFC3339)
			if err := h.storage.UpdateQuote(r.Context(), id, q); err != nil {
				WriteError(w, err)
				return
			}
			WriteSuccess(w)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "quote not found"))
}

func (h *Handlers) handleAcceptQuote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	quotes, err := h.storage.ReadQuotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, q := range quotes {
		if q.ID == id {
			q.Status = "accepted"
			q.AcceptedAt = time.Now().Format(time.RFC3339)
			if err := h.storage.UpdateQuote(r.Context(), id, q); err != nil {
				WriteError(w, err)
				return
			}
			WriteSuccess(w)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "quote not found"))
}

func (h *Handlers) handleQuoteToInvoice(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	quotes, err := h.storage.ReadQuotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, q := range quotes {
		if q.ID == id {
			// Create invoice from quote
			invoice := domain.Invoice{
				CustomerID: q.CustomerID,
				QuoteID:    q.ID,
				Title:      q.Title,
				Status:     "draft",
				Subtotal:   q.Subtotal,
				TaxRate:    q.TaxRate,
				Tax:        q.Tax,
				Total:      q.Total,
				Notes:      q.Notes,
			}
			invoiceID, err := h.storage.CreateInvoice(r.Context(), invoice)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteCreated(w, invoiceID)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "quote not found"))
}

// Invoice handlers
func (h *Handlers) handleGetInvoices(w http.ResponseWriter, r *http.Request) {
	invoices, err := h.storage.ReadInvoices(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, invoices)
}

func (h *Handlers) handleCreateInvoice(w http.ResponseWriter, r *http.Request) {
	var invoice domain.Invoice
	if err := parseJSON(r, &invoice); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateInvoice(r.Context(), invoice)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetInvoice(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	invoices, err := h.storage.ReadInvoices(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, inv := range invoices {
		if inv.ID == id {
			WriteJSON(w, http.StatusOK, inv)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "invoice not found"))
}

func (h *Handlers) handleUpdateInvoice(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var invoice domain.Invoice
	if err := parseJSON(r, &invoice); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateInvoice(r.Context(), id, invoice); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteInvoice(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteInvoice(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleSendInvoice(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	invoices, err := h.storage.ReadInvoices(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, inv := range invoices {
		if inv.ID == id {
			inv.Status = "sent"
			inv.SentAt = time.Now().Format(time.RFC3339)
			if err := h.storage.UpdateInvoice(r.Context(), id, inv); err != nil {
				WriteError(w, err)
				return
			}
			WriteSuccess(w)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "invoice not found"))
}

// Payment handlers
func (h *Handlers) handleGetPayments(w http.ResponseWriter, r *http.Request) {
	invoiceID := getURLParam(r, "id")
	payments, err := h.storage.ReadPayments(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	// Filter by invoice
	var result []domain.Payment
	for _, p := range payments {
		if p.InvoiceID == invoiceID {
			result = append(result, p)
		}
	}
	WriteJSON(w, http.StatusOK, result)
}

func (h *Handlers) handleCreatePayment(w http.ResponseWriter, r *http.Request) {
	invoiceID := getURLParam(r, "id")
	var payment domain.Payment
	if err := parseJSON(r, &payment); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	payment.InvoiceID = invoiceID
	id, err := h.storage.CreatePayment(r.Context(), payment)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGenerateInvoice(w http.ResponseWriter, r *http.Request) {
	// Auto-generate invoice from time entries
	// This is a placeholder - implement based on business logic
	WriteJSON(w, http.StatusOK, map[string]string{"message": "not implemented"})
}

// Billing Summary
func (h *Handlers) handleBillingSummary(w http.ResponseWriter, r *http.Request) {
	invoices, err := h.storage.ReadInvoices(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	var totalInvoiced, totalPaid, totalOutstanding float64
	for _, inv := range invoices {
		totalInvoiced += inv.Total
		totalPaid += inv.PaidAmount
		totalOutstanding += inv.Total - inv.PaidAmount
	}

	WriteJSON(w, http.StatusOK, map[string]float64{
		"totalInvoiced":    totalInvoiced,
		"totalPaid":        totalPaid,
		"totalOutstanding": totalOutstanding,
	})
}
