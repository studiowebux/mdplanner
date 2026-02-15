/**
 * Billing parser class for parsing and serializing billing-related markdown.
 * Handles Customers, Billing Rates, Quotes, Invoices, and Payments.
 */
import {
  BillingRate,
  Customer,
  Invoice,
  InvoiceLineItem,
  Payment,
  Quote,
  QuoteLineItem,
} from "../../types.ts";
import { BaseParser } from "../core.ts";

export class BillingParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  generateId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  parseCustomersSection(lines: string[]): Customer[] {
    const customers: Customer[] = [];

    let inCustomersSection = false;
    let currentCustomer: Partial<Customer> | null = null;
    let inAddress = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inCustomersSection && (line.startsWith("# Customers") || line.includes("<!-- Customers -->"))) {
        inCustomersSection = true;
        continue;
      }

      if (inCustomersSection && line.startsWith("# Customers")) {
        continue;
      }

      if (inCustomersSection && line.startsWith("# ") && !line.startsWith("# Customers")) {
        if (currentCustomer?.name) {
          customers.push(currentCustomer as Customer);
        }
        currentCustomer = null;
        break;
      }

      if (!inCustomersSection) continue;

      if (line.startsWith("## ")) {
        if (currentCustomer?.name) customers.push(currentCustomer as Customer);
        const name = line.substring(3).trim();
        currentCustomer = {
          id: this.generateId(),
          name,
          created: new Date().toISOString().split("T")[0],
        };
        inAddress = false;
      } else if (currentCustomer) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentCustomer.id = match[1];
        } else if (line.startsWith("Email:")) {
          currentCustomer.email = line.substring(6).trim();
        } else if (line.startsWith("Phone:")) {
          currentCustomer.phone = line.substring(6).trim();
        } else if (line.startsWith("Company:")) {
          currentCustomer.company = line.substring(8).trim();
        } else if (line.startsWith("Created:")) {
          currentCustomer.created = line.substring(8).trim();
        } else if (line.startsWith("### Billing Address")) {
          inAddress = true;
          currentCustomer.billingAddress = {};
        } else if (line.startsWith("### Notes")) {
          inAddress = false;
        } else if (inAddress && currentCustomer.billingAddress) {
          if (line.startsWith("Street:")) {
            currentCustomer.billingAddress.street = line.substring(7).trim();
          } else if (line.startsWith("City:")) {
            currentCustomer.billingAddress.city = line.substring(5).trim();
          } else if (line.startsWith("State:")) {
            currentCustomer.billingAddress.state = line.substring(6).trim();
          } else if (line.startsWith("Postal Code:")) {
            currentCustomer.billingAddress.postalCode = line.substring(12).trim();
          } else if (line.startsWith("Country:")) {
            currentCustomer.billingAddress.country = line.substring(8).trim();
          }
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("###") && !inAddress) {
          currentCustomer.notes = (currentCustomer.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentCustomer?.name) customers.push(currentCustomer as Customer);
    return customers;
  }

  customerToMarkdown(customer: Customer): string {
    let content = `## ${customer.name}\n`;
    content += `<!-- id: ${customer.id} -->\n`;
    if (customer.email) content += `Email: ${customer.email}\n`;
    if (customer.phone) content += `Phone: ${customer.phone}\n`;
    if (customer.company) content += `Company: ${customer.company}\n`;
    content += `Created: ${customer.created}\n`;
    if (customer.billingAddress) {
      content += `\n### Billing Address\n`;
      if (customer.billingAddress.street) content += `Street: ${customer.billingAddress.street}\n`;
      if (customer.billingAddress.city) content += `City: ${customer.billingAddress.city}\n`;
      if (customer.billingAddress.state) content += `State: ${customer.billingAddress.state}\n`;
      if (customer.billingAddress.postalCode) content += `Postal Code: ${customer.billingAddress.postalCode}\n`;
      if (customer.billingAddress.country) content += `Country: ${customer.billingAddress.country}\n`;
    }
    if (customer.notes) {
      content += `\n### Notes\n${customer.notes.trim()}\n`;
    }
    content += "\n";
    return content;
  }

  customersToMarkdown(customers: Customer[]): string {
    let content = "<!-- Customers -->\n# Customers\n\n";
    for (const customer of customers) {
      content += this.customerToMarkdown(customer);
    }
    return content;
  }

  findCustomersSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Customers -->") || lines[i].startsWith("# Customers"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Customers")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // BILLING RATES
  // ============================================

  parseBillingRatesSection(lines: string[]): BillingRate[] {
    const rates: BillingRate[] = [];

    let inRatesSection = false;
    let currentRate: Partial<BillingRate> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inRatesSection && (line.startsWith("# Billing Rates") || line.includes("<!-- Billing Rates -->"))) {
        inRatesSection = true;
        continue;
      }
      if (inRatesSection && line.startsWith("# Billing Rates")) {
        continue;
      }

      if (inRatesSection && line.startsWith("# ") && !line.startsWith("# Billing Rates")) {
        if (currentRate?.name) rates.push(currentRate as BillingRate);
        currentRate = null;
        break;
      }

      if (!inRatesSection) continue;

      if (line.startsWith("## ")) {
        if (currentRate?.name) rates.push(currentRate as BillingRate);
        const name = line.substring(3).trim();
        currentRate = {
          id: this.generateId(),
          name,
          hourlyRate: 0,
        };
      } else if (currentRate) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentRate.id = match[1];
        } else if (line.startsWith("Hourly Rate:")) {
          currentRate.hourlyRate = parseFloat(line.substring(12).trim()) || 0;
        } else if (line.startsWith("Assignee:")) {
          currentRate.assignee = line.substring(9).trim();
        } else if (line.startsWith("Default:")) {
          currentRate.isDefault = line.substring(8).trim().toLowerCase() === "true";
        }
      }
    }

    if (currentRate?.name) rates.push(currentRate as BillingRate);
    return rates;
  }

  billingRateToMarkdown(rate: BillingRate): string {
    let content = `## ${rate.name}\n`;
    content += `<!-- id: ${rate.id} -->\n`;
    content += `Hourly Rate: ${rate.hourlyRate}\n`;
    if (rate.assignee) content += `Assignee: ${rate.assignee}\n`;
    if (rate.isDefault) content += `Default: true\n`;
    content += "\n";
    return content;
  }

  billingRatesToMarkdown(rates: BillingRate[]): string {
    let content = "<!-- Billing Rates -->\n# Billing Rates\n\n";
    for (const rate of rates) {
      content += this.billingRateToMarkdown(rate);
    }
    return content;
  }

  findBillingRatesSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Billing Rates -->") || lines[i].startsWith("# Billing Rates"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Billing Rates")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // QUOTES
  // ============================================

  parseQuotesSection(lines: string[]): Quote[] {
    const quotes: Quote[] = [];

    let inQuotesSection = false;
    let currentQuote: Partial<Quote> | null = null;
    let inLineItems = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inQuotesSection && (line.startsWith("# Quotes") || line.includes("<!-- Quotes -->"))) {
        inQuotesSection = true;
        continue;
      }
      if (inQuotesSection && line.startsWith("# Quotes")) {
        continue;
      }

      if (inQuotesSection && line.startsWith("# ") && !line.startsWith("# Quotes")) {
        if (currentQuote?.title) quotes.push(currentQuote as Quote);
        currentQuote = null;
        break;
      }

      if (!inQuotesSection) continue;

      if (line.startsWith("## ")) {
        if (currentQuote?.title) quotes.push(currentQuote as Quote);
        const title = line.substring(3).trim();
        currentQuote = {
          id: this.generateId(),
          number: "",
          customerId: "",
          title,
          status: "draft",
          lineItems: [],
          subtotal: 0,
          total: 0,
          created: new Date().toISOString().split("T")[0],
        };
        inLineItems = false;
      } else if (currentQuote) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentQuote.id = match[1];
        } else if (line.startsWith("Number:")) {
          currentQuote.number = line.substring(7).trim();
        } else if (line.startsWith("Customer:")) {
          currentQuote.customerId = line.substring(9).trim();
        } else if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["draft", "sent", "accepted", "rejected"].includes(s)) {
            currentQuote.status = s as Quote["status"];
          }
        } else if (line.startsWith("Valid Until:")) {
          currentQuote.validUntil = line.substring(12).trim();
        } else if (line.startsWith("Tax Rate:")) {
          currentQuote.taxRate = parseFloat(line.substring(9).trim()) || 0;
        } else if (line.startsWith("Created:")) {
          currentQuote.created = line.substring(8).trim();
        } else if (line.startsWith("Sent At:")) {
          currentQuote.sentAt = line.substring(8).trim();
        } else if (line.startsWith("Accepted At:")) {
          currentQuote.acceptedAt = line.substring(12).trim();
        } else if (line.startsWith("### Line Items")) {
          inLineItems = true;
        } else if (line.startsWith("### Notes")) {
          inLineItems = false;
        } else if (inLineItems && line.startsWith("- ")) {
          const match = line.match(/- \[([^\]]+)\] (.+) \| Qty: ([\d.]+) \| Rate: ([\d.]+) \| Amount: ([\d.]+)/);
          if (match) {
            currentQuote.lineItems!.push({
              id: match[1],
              description: match[2].trim(),
              quantity: parseFloat(match[3]),
              rate: parseFloat(match[4]),
              amount: parseFloat(match[5]),
            });
          }
        } else if (!inLineItems && line.trim() && !line.startsWith("<!--") && !line.startsWith("###")) {
          currentQuote.notes = (currentQuote.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentQuote?.title) quotes.push(currentQuote as Quote);

    // Recalculate totals
    for (const quote of quotes) {
      quote.subtotal = quote.lineItems.reduce((sum, item) => sum + item.amount, 0);
      quote.tax = quote.taxRate ? quote.subtotal * (quote.taxRate / 100) : 0;
      quote.total = quote.subtotal + (quote.tax || 0);
    }

    return quotes;
  }

  quoteToMarkdown(quote: Quote): string {
    let content = `## ${quote.title}\n`;
    content += `<!-- id: ${quote.id} -->\n`;
    content += `Number: ${quote.number}\n`;
    content += `Customer: ${quote.customerId}\n`;
    content += `Status: ${quote.status}\n`;
    if (quote.validUntil) content += `Valid Until: ${quote.validUntil}\n`;
    if (quote.taxRate) content += `Tax Rate: ${quote.taxRate}\n`;
    content += `Created: ${quote.created}\n`;
    if (quote.sentAt) content += `Sent At: ${quote.sentAt}\n`;
    if (quote.acceptedAt) content += `Accepted At: ${quote.acceptedAt}\n`;

    if (quote.lineItems.length > 0) {
      content += `\n### Line Items\n`;
      for (const item of quote.lineItems) {
        content += `- [${item.id}] ${item.description} | Qty: ${item.quantity} | Rate: ${item.rate} | Amount: ${item.amount}\n`;
      }
    }

    if (quote.notes) {
      content += `\n### Notes\n${quote.notes.trim()}\n`;
    }
    content += "\n";
    return content;
  }

  quotesToMarkdown(quotes: Quote[]): string {
    let content = "<!-- Quotes -->\n# Quotes\n\n";
    for (const quote of quotes) {
      content += this.quoteToMarkdown(quote);
    }
    return content;
  }

  findQuotesSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Quotes -->") || lines[i].startsWith("# Quotes"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Quotes")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  getNextQuoteNumber(quotes: Quote[]): string {
    const year = new Date().getFullYear();
    const existingNumbers = quotes
      .filter(q => q.number.startsWith(`Q-${year}-`))
      .map(q => parseInt(q.number.replace(`Q-${year}-`, "")) || 0);
    const nextNum = Math.max(0, ...existingNumbers) + 1;
    return `Q-${year}-${nextNum.toString().padStart(3, "0")}`;
  }

  // ============================================
  // INVOICES
  // ============================================

  parseInvoicesSection(lines: string[]): Invoice[] {
    const invoices: Invoice[] = [];

    let inInvoicesSection = false;
    let currentInvoice: Partial<Invoice> | null = null;
    let inLineItems = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inInvoicesSection && (line.startsWith("# Invoices") || line.includes("<!-- Invoices -->"))) {
        inInvoicesSection = true;
        continue;
      }
      if (inInvoicesSection && line.startsWith("# Invoices")) {
        continue;
      }

      if (inInvoicesSection && line.startsWith("# ") && !line.startsWith("# Invoices")) {
        if (currentInvoice?.title) invoices.push(currentInvoice as Invoice);
        currentInvoice = null;
        break;
      }

      if (!inInvoicesSection) continue;

      if (line.startsWith("## ")) {
        if (currentInvoice?.title) invoices.push(currentInvoice as Invoice);
        const title = line.substring(3).trim();
        currentInvoice = {
          id: this.generateId(),
          number: "",
          customerId: "",
          title,
          status: "draft",
          lineItems: [],
          subtotal: 0,
          total: 0,
          paidAmount: 0,
          created: new Date().toISOString().split("T")[0],
        };
        inLineItems = false;
      } else if (currentInvoice) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentInvoice.id = match[1];
        } else if (line.startsWith("<!-- quoteId:")) {
          const match = line.match(/<!-- quoteId: ([^ ]+)/);
          if (match) currentInvoice.quoteId = match[1];
        } else if (line.startsWith("Number:")) {
          currentInvoice.number = line.substring(7).trim();
        } else if (line.startsWith("Customer:")) {
          currentInvoice.customerId = line.substring(9).trim();
        } else if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["draft", "sent", "paid", "overdue", "cancelled"].includes(s)) {
            currentInvoice.status = s as Invoice["status"];
          }
        } else if (line.startsWith("Due Date:")) {
          currentInvoice.dueDate = line.substring(9).trim();
        } else if (line.startsWith("Tax Rate:")) {
          currentInvoice.taxRate = parseFloat(line.substring(9).trim()) || 0;
        } else if (line.startsWith("Paid Amount:")) {
          currentInvoice.paidAmount = parseFloat(line.substring(12).trim()) || 0;
        } else if (line.startsWith("Created:")) {
          currentInvoice.created = line.substring(8).trim();
        } else if (line.startsWith("Sent At:")) {
          currentInvoice.sentAt = line.substring(8).trim();
        } else if (line.startsWith("Paid At:")) {
          currentInvoice.paidAt = line.substring(8).trim();
        } else if (line.startsWith("### Line Items")) {
          inLineItems = true;
        } else if (line.startsWith("### Notes")) {
          inLineItems = false;
        } else if (inLineItems && line.startsWith("- ")) {
          const basicMatch = line.match(/- \[([^\]]+)\] (.+?) \| Qty: ([\d.]+) \| Rate: ([\d.]+) \| Amount: ([\d.]+)/);
          if (basicMatch) {
            const item: InvoiceLineItem = {
              id: basicMatch[1],
              description: basicMatch[2].trim(),
              quantity: parseFloat(basicMatch[3]),
              rate: parseFloat(basicMatch[4]),
              amount: parseFloat(basicMatch[5]),
            };
            const taskMatch = line.match(/Task: ([^\s|]+)/);
            if (taskMatch) item.taskId = taskMatch[1];
            const timeMatch = line.match(/TimeEntries: ([^\s]+)/);
            if (timeMatch) item.timeEntryIds = timeMatch[1].split(",");
            currentInvoice.lineItems!.push(item);
          }
        } else if (!inLineItems && line.trim() && !line.startsWith("<!--") && !line.startsWith("###")) {
          currentInvoice.notes = (currentInvoice.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentInvoice?.title) invoices.push(currentInvoice as Invoice);

    // Recalculate totals
    for (const invoice of invoices) {
      invoice.subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
      invoice.tax = invoice.taxRate ? invoice.subtotal * (invoice.taxRate / 100) : 0;
      invoice.total = invoice.subtotal + (invoice.tax || 0);
    }

    return invoices;
  }

  invoiceToMarkdown(invoice: Invoice): string {
    let content = `## ${invoice.title}\n`;
    content += `<!-- id: ${invoice.id} -->\n`;
    if (invoice.quoteId) content += `<!-- quoteId: ${invoice.quoteId} -->\n`;
    content += `Number: ${invoice.number}\n`;
    content += `Customer: ${invoice.customerId}\n`;
    content += `Status: ${invoice.status}\n`;
    if (invoice.dueDate) content += `Due Date: ${invoice.dueDate}\n`;
    if (invoice.taxRate) content += `Tax Rate: ${invoice.taxRate}\n`;
    content += `Paid Amount: ${invoice.paidAmount}\n`;
    content += `Created: ${invoice.created}\n`;
    if (invoice.sentAt) content += `Sent At: ${invoice.sentAt}\n`;
    if (invoice.paidAt) content += `Paid At: ${invoice.paidAt}\n`;

    if (invoice.lineItems.length > 0) {
      content += `\n### Line Items\n`;
      for (const item of invoice.lineItems) {
        let lineStr = `- [${item.id}] ${item.description} | Qty: ${item.quantity} | Rate: ${item.rate} | Amount: ${item.amount}`;
        if (item.taskId) lineStr += ` | Task: ${item.taskId}`;
        if (item.timeEntryIds?.length) lineStr += ` | TimeEntries: ${item.timeEntryIds.join(",")}`;
        content += lineStr + "\n";
      }
    }

    if (invoice.notes) {
      content += `\n### Notes\n${invoice.notes.trim()}\n`;
    }
    content += "\n";
    return content;
  }

  invoicesToMarkdown(invoices: Invoice[]): string {
    let content = "<!-- Invoices -->\n# Invoices\n\n";
    for (const invoice of invoices) {
      content += this.invoiceToMarkdown(invoice);
    }
    return content;
  }

  findInvoicesSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Invoices -->") || lines[i].startsWith("# Invoices"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Invoices")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  getNextInvoiceNumber(invoices: Invoice[]): string {
    const year = new Date().getFullYear();
    const existingNumbers = invoices
      .filter(inv => inv.number.startsWith(`INV-${year}-`))
      .map(inv => parseInt(inv.number.replace(`INV-${year}-`, "")) || 0);
    const nextNum = Math.max(0, ...existingNumbers) + 1;
    return `INV-${year}-${nextNum.toString().padStart(3, "0")}`;
  }

  // ============================================
  // PAYMENTS
  // ============================================

  parsePaymentsSection(lines: string[]): Payment[] {
    const payments: Payment[] = [];

    let inPaymentsSection = false;
    let currentPayment: Partial<Payment> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inPaymentsSection && (line.startsWith("# Payments") || line.includes("<!-- Payments -->"))) {
        inPaymentsSection = true;
        continue;
      }
      if (inPaymentsSection && line.startsWith("# Payments")) {
        continue;
      }

      if (inPaymentsSection && line.startsWith("# ") && !line.startsWith("# Payments")) {
        if (currentPayment?.invoiceId) payments.push(currentPayment as Payment);
        currentPayment = null;
        break;
      }

      if (!inPaymentsSection) continue;

      if (line.startsWith("## ")) {
        if (currentPayment?.invoiceId) payments.push(currentPayment as Payment);
        currentPayment = {
          id: this.generateId(),
          invoiceId: "",
          amount: 0,
          date: new Date().toISOString().split("T")[0],
        };
      } else if (currentPayment) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentPayment.id = match[1];
        } else if (line.startsWith("Invoice:")) {
          currentPayment.invoiceId = line.substring(8).trim();
        } else if (line.startsWith("Amount:")) {
          currentPayment.amount = parseFloat(line.substring(7).trim()) || 0;
        } else if (line.startsWith("Date:")) {
          currentPayment.date = line.substring(5).trim();
        } else if (line.startsWith("Method:")) {
          const m = line.substring(7).trim().toLowerCase();
          if (["bank", "card", "cash", "other"].includes(m)) {
            currentPayment.method = m as Payment["method"];
          }
        } else if (line.startsWith("Reference:")) {
          currentPayment.reference = line.substring(10).trim();
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("##")) {
          currentPayment.notes = (currentPayment.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentPayment?.invoiceId) payments.push(currentPayment as Payment);
    return payments;
  }

  paymentToMarkdown(payment: Payment): string {
    let content = `## Payment ${payment.id}\n`;
    content += `<!-- id: ${payment.id} -->\n`;
    content += `Invoice: ${payment.invoiceId}\n`;
    content += `Amount: ${payment.amount}\n`;
    content += `Date: ${payment.date}\n`;
    if (payment.method) content += `Method: ${payment.method}\n`;
    if (payment.reference) content += `Reference: ${payment.reference}\n`;
    if (payment.notes) content += `\n${payment.notes.trim()}\n`;
    content += "\n";
    return content;
  }

  paymentsToMarkdown(payments: Payment[]): string {
    let content = "<!-- Payments -->\n# Payments\n\n";
    for (const payment of payments) {
      content += this.paymentToMarkdown(payment);
    }
    return content;
  }

  findPaymentsSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Payments -->") || lines[i].startsWith("# Payments"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Payments")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // LIST UPDATE HELPERS
  // ============================================

  updateCustomerInList(
    customers: Customer[],
    customerId: string,
    updates: Partial<Omit<Customer, "id">>,
  ): { customers: Customer[]; success: boolean } {
    const index = customers.findIndex((c) => c.id === customerId);
    if (index === -1) {
      return { customers, success: false };
    }
    customers[index] = { ...customers[index], ...updates };
    return { customers, success: true };
  }

  deleteCustomerFromList(
    customers: Customer[],
    customerId: string,
  ): { customers: Customer[]; success: boolean } {
    const originalLength = customers.length;
    const filtered = customers.filter((c) => c.id !== customerId);
    return {
      customers: filtered,
      success: filtered.length !== originalLength,
    };
  }

  updateBillingRateInList(
    rates: BillingRate[],
    rateId: string,
    updates: Partial<Omit<BillingRate, "id">>,
  ): { rates: BillingRate[]; success: boolean } {
    const index = rates.findIndex((r) => r.id === rateId);
    if (index === -1) {
      return { rates, success: false };
    }
    rates[index] = { ...rates[index], ...updates };
    return { rates, success: true };
  }

  deleteBillingRateFromList(
    rates: BillingRate[],
    rateId: string,
  ): { rates: BillingRate[]; success: boolean } {
    const originalLength = rates.length;
    const filtered = rates.filter((r) => r.id !== rateId);
    return {
      rates: filtered,
      success: filtered.length !== originalLength,
    };
  }

  updateQuoteInList(
    quotes: Quote[],
    quoteId: string,
    updates: Partial<Omit<Quote, "id">>,
  ): { quotes: Quote[]; success: boolean } {
    const index = quotes.findIndex((q) => q.id === quoteId);
    if (index === -1) {
      return { quotes, success: false };
    }
    quotes[index] = { ...quotes[index], ...updates };
    return { quotes, success: true };
  }

  deleteQuoteFromList(
    quotes: Quote[],
    quoteId: string,
  ): { quotes: Quote[]; success: boolean } {
    const originalLength = quotes.length;
    const filtered = quotes.filter((q) => q.id !== quoteId);
    return {
      quotes: filtered,
      success: filtered.length !== originalLength,
    };
  }

  updateInvoiceInList(
    invoices: Invoice[],
    invoiceId: string,
    updates: Partial<Omit<Invoice, "id">>,
  ): { invoices: Invoice[]; success: boolean } {
    const index = invoices.findIndex((inv) => inv.id === invoiceId);
    if (index === -1) {
      return { invoices, success: false };
    }
    invoices[index] = { ...invoices[index], ...updates };
    return { invoices, success: true };
  }

  deleteInvoiceFromList(
    invoices: Invoice[],
    invoiceId: string,
  ): { invoices: Invoice[]; success: boolean } {
    const originalLength = invoices.length;
    const filtered = invoices.filter((inv) => inv.id !== invoiceId);
    return {
      invoices: filtered,
      success: filtered.length !== originalLength,
    };
  }

  updatePaymentInList(
    payments: Payment[],
    paymentId: string,
    updates: Partial<Omit<Payment, "id">>,
  ): { payments: Payment[]; success: boolean } {
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) {
      return { payments, success: false };
    }
    payments[index] = { ...payments[index], ...updates };
    return { payments, success: true };
  }

  deletePaymentFromList(
    payments: Payment[],
    paymentId: string,
  ): { payments: Payment[]; success: boolean } {
    const originalLength = payments.length;
    const filtered = payments.filter((p) => p.id !== paymentId);
    return {
      payments: filtered,
      success: filtered.length !== originalLength,
    };
  }

  // ============================================
  // CREATE HELPERS
  // ============================================

  createCustomer(customer: Omit<Customer, "id">): Customer {
    return {
      ...customer,
      id: this.generateId(),
    };
  }

  createBillingRate(rate: Omit<BillingRate, "id">): BillingRate {
    return {
      ...rate,
      id: this.generateId(),
    };
  }

  createQuote(quote: Omit<Quote, "id">): Quote {
    return {
      ...quote,
      id: this.generateId(),
    };
  }

  createInvoice(invoice: Omit<Invoice, "id">): Invoice {
    return {
      ...invoice,
      id: this.generateId(),
    };
  }

  createPayment(payment: Omit<Payment, "id">): Payment {
    return {
      ...payment,
      id: this.generateId(),
    };
  }

  createQuoteLineItem(item: Omit<QuoteLineItem, "id">): QuoteLineItem {
    return {
      ...item,
      id: this.generateId(),
    };
  }

  createInvoiceLineItem(item: Omit<InvoiceLineItem, "id">): InvoiceLineItem {
    return {
      ...item,
      id: this.generateId(),
    };
  }
}
