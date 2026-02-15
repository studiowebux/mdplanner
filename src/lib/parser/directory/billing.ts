/**
 * Directory-based parser for Billing.
 * Uses subdirectories: customers/, rates/, quotes/, invoices/
 */
import { parseFrontmatter, buildFileContent } from "./base.ts";
import type {
  Customer,
  BillingRate,
  Quote,
  QuoteLineItem,
  Invoice,
  InvoiceLineItem,
  Payment,
} from "../../types.ts";

export class BillingDirectoryParser {
  protected projectDir: string;
  protected billingDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.billingDir = `${projectDir}/billing`;
  }

  async ensureDir(): Promise<void> {
    await Deno.mkdir(`${this.billingDir}/customers`, { recursive: true });
    await Deno.mkdir(`${this.billingDir}/rates`, { recursive: true });
    await Deno.mkdir(`${this.billingDir}/quotes`, { recursive: true });
    await Deno.mkdir(`${this.billingDir}/invoices`, { recursive: true });
  }

  protected generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  protected async atomicWriteFile(filePath: string, content: string): Promise<void> {
    const tempPath = filePath + ".tmp";
    await Deno.writeTextFile(tempPath, content);
    await Deno.rename(tempPath, filePath);
  }

  protected async listFiles(subdir: string): Promise<string[]> {
    const dir = `${this.billingDir}/${subdir}`;
    const files: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          files.push(`${dir}/${entry.name}`);
        }
      }
    } catch (error) {
      if ((error as Deno.errors.NotFound)?.name !== "NotFound") {
        throw error;
      }
    }
    return files.sort();
  }

  // ============================================================
  // Customers
  // ============================================================

  async readAllCustomers(): Promise<Customer[]> {
    const files = await this.listFiles("customers");
    const customers: Customer[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const customer = this.parseCustomer(content);
        if (customer) customers.push(customer);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return customers;
  }

  protected parseCustomer(content: string): Customer | null {
    interface CustomerFrontmatter {
      id: string;
      email?: string;
      phone?: string;
      company?: string;
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      created: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<CustomerFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let name = "Untitled Customer";
    let notes = "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        name = lines[i].slice(2).trim();
        notes = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }

    return {
      id: frontmatter.id,
      name,
      email: frontmatter.email,
      phone: frontmatter.phone,
      company: frontmatter.company,
      billingAddress: frontmatter.street ? {
        street: frontmatter.street,
        city: frontmatter.city,
        state: frontmatter.state,
        postalCode: frontmatter.postalCode,
        country: frontmatter.country,
      } : undefined,
      notes: notes || undefined,
      created: frontmatter.created || new Date().toISOString(),
    };
  }

  protected serializeCustomer(customer: Customer): string {
    const frontmatter: Record<string, unknown> = {
      id: customer.id,
      created: customer.created,
    };

    if (customer.email) frontmatter.email = customer.email;
    if (customer.phone) frontmatter.phone = customer.phone;
    if (customer.company) frontmatter.company = customer.company;
    if (customer.billingAddress) {
      if (customer.billingAddress.street) frontmatter.street = customer.billingAddress.street;
      if (customer.billingAddress.city) frontmatter.city = customer.billingAddress.city;
      if (customer.billingAddress.state) frontmatter.state = customer.billingAddress.state;
      if (customer.billingAddress.postalCode) frontmatter.postalCode = customer.billingAddress.postalCode;
      if (customer.billingAddress.country) frontmatter.country = customer.billingAddress.country;
    }

    const body = `# ${customer.name}\n\n${customer.notes || ""}`;
    return buildFileContent(frontmatter, body);
  }

  async addCustomer(customer: Omit<Customer, "id" | "created">): Promise<Customer> {
    await this.ensureDir();
    const newCustomer: Customer = {
      ...customer,
      id: this.generateId("customer"),
      created: new Date().toISOString(),
    };
    const filePath = `${this.billingDir}/customers/${newCustomer.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeCustomer(newCustomer));
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const customers = await this.readAllCustomers();
    const existing = customers.find(c => c.id === id);
    if (!existing) return null;

    const updated: Customer = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.billingDir}/customers/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeCustomer(updated));
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.billingDir}/customers/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Rates
  // ============================================================

  async readAllRates(): Promise<BillingRate[]> {
    const files = await this.listFiles("rates");
    const rates: BillingRate[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const rate = this.parseRate(content);
        if (rate) rates.push(rate);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return rates;
  }

  protected parseRate(content: string): BillingRate | null {
    interface RateFrontmatter {
      id: string;
      hourlyRate: number;
      assignee?: string;
      isDefault?: boolean;
    }

    const { frontmatter, content: body } = parseFrontmatter<RateFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let name = "Untitled Rate";

    for (const line of lines) {
      if (line.startsWith("# ")) {
        name = line.slice(2).trim();
        break;
      }
    }

    return {
      id: frontmatter.id,
      name,
      hourlyRate: frontmatter.hourlyRate || 0,
      assignee: frontmatter.assignee,
      isDefault: frontmatter.isDefault,
    };
  }

  protected serializeRate(rate: BillingRate): string {
    const frontmatter: Record<string, unknown> = {
      id: rate.id,
      hourlyRate: rate.hourlyRate,
    };

    if (rate.assignee) frontmatter.assignee = rate.assignee;
    if (rate.isDefault) frontmatter.isDefault = rate.isDefault;

    const body = `# ${rate.name}`;
    return buildFileContent(frontmatter, body);
  }

  async addRate(rate: Omit<BillingRate, "id">): Promise<BillingRate> {
    await this.ensureDir();
    const newRate: BillingRate = {
      ...rate,
      id: this.generateId("rate"),
    };
    const filePath = `${this.billingDir}/rates/${newRate.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeRate(newRate));
    return newRate;
  }

  async updateRate(id: string, updates: Partial<BillingRate>): Promise<BillingRate | null> {
    const rates = await this.readAllRates();
    const existing = rates.find(r => r.id === id);
    if (!existing) return null;

    const updated: BillingRate = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.billingDir}/rates/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeRate(updated));
    return updated;
  }

  async deleteRate(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.billingDir}/rates/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Quotes
  // ============================================================

  async readAllQuotes(): Promise<Quote[]> {
    const files = await this.listFiles("quotes");
    const quotes: Quote[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const quote = this.parseQuote(content);
        if (quote) quotes.push(quote);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return quotes;
  }

  protected parseQuote(content: string): Quote | null {
    interface QuoteFrontmatter {
      id: string;
      number: string;
      customerId: string;
      status: "draft" | "sent" | "accepted" | "rejected";
      validUntil?: string;
      subtotal: number;
      tax?: number;
      taxRate?: number;
      total: number;
      created: string;
      sentAt?: string;
      acceptedAt?: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<QuoteFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let title = "Untitled Quote";
    const lineItems: QuoteLineItem[] = [];
    let notes = "";
    let inLineItems = false;
    let notesStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      if (line.toLowerCase().startsWith("## line item")) {
        inLineItems = true;
        continue;
      }

      if (line.toLowerCase().startsWith("## notes")) {
        inLineItems = false;
        notesStartIndex = i + 1;
        continue;
      }

      if (inLineItems) {
        // - (item_id) Description | qty | rate | amount
        const itemMatch = line.match(/^[-*]\s+\((\w+)\)\s+(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)$/);
        if (itemMatch) {
          lineItems.push({
            id: itemMatch[1],
            description: itemMatch[2].trim(),
            quantity: parseFloat(itemMatch[3]),
            rate: parseFloat(itemMatch[4]),
            amount: parseFloat(itemMatch[5]),
          });
        }
      }
    }

    if (notesStartIndex > 0) {
      notes = lines.slice(notesStartIndex).join("\n").trim();
    }

    return {
      id: frontmatter.id,
      number: frontmatter.number,
      customerId: frontmatter.customerId,
      title,
      status: frontmatter.status || "draft",
      validUntil: frontmatter.validUntil,
      lineItems,
      subtotal: frontmatter.subtotal || 0,
      tax: frontmatter.tax,
      taxRate: frontmatter.taxRate,
      total: frontmatter.total || 0,
      notes: notes || undefined,
      created: frontmatter.created || new Date().toISOString(),
      sentAt: frontmatter.sentAt,
      acceptedAt: frontmatter.acceptedAt,
    };
  }

  protected serializeQuote(quote: Quote): string {
    const frontmatter: Record<string, unknown> = {
      id: quote.id,
      number: quote.number,
      customerId: quote.customerId,
      status: quote.status,
      subtotal: quote.subtotal,
      total: quote.total,
      created: quote.created,
    };

    if (quote.validUntil) frontmatter.validUntil = quote.validUntil;
    if (quote.tax !== undefined) frontmatter.tax = quote.tax;
    if (quote.taxRate !== undefined) frontmatter.taxRate = quote.taxRate;
    if (quote.sentAt) frontmatter.sentAt = quote.sentAt;
    if (quote.acceptedAt) frontmatter.acceptedAt = quote.acceptedAt;

    const sections: string[] = [`# ${quote.title}`];

    sections.push("");
    sections.push("## Line Items");
    sections.push("");
    for (const item of quote.lineItems) {
      sections.push(`- (${item.id}) ${item.description} | ${item.quantity} | ${item.rate} | ${item.amount}`);
    }

    if (quote.notes) {
      sections.push("");
      sections.push("## Notes");
      sections.push("");
      sections.push(quote.notes);
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async addQuote(quote: Omit<Quote, "id" | "created">): Promise<Quote> {
    await this.ensureDir();
    const newQuote: Quote = {
      ...quote,
      id: this.generateId("quote"),
      created: new Date().toISOString(),
    };
    const filePath = `${this.billingDir}/quotes/${newQuote.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeQuote(newQuote));
    return newQuote;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | null> {
    const quotes = await this.readAllQuotes();
    const existing = quotes.find(q => q.id === id);
    if (!existing) return null;

    const updated: Quote = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.billingDir}/quotes/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeQuote(updated));
    return updated;
  }

  async deleteQuote(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.billingDir}/quotes/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Invoices
  // ============================================================

  async readAllInvoices(): Promise<Invoice[]> {
    const files = await this.listFiles("invoices");
    const invoices: Invoice[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const invoice = this.parseInvoice(content);
        if (invoice) invoices.push(invoice);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return invoices;
  }

  protected parseInvoice(content: string): Invoice | null {
    interface InvoiceFrontmatter {
      id: string;
      number: string;
      customerId: string;
      quoteId?: string;
      status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
      dueDate?: string;
      subtotal: number;
      tax?: number;
      taxRate?: number;
      total: number;
      paidAmount: number;
      created: string;
      sentAt?: string;
      paidAt?: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<InvoiceFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let title = "Untitled Invoice";
    const lineItems: InvoiceLineItem[] = [];
    let notes = "";
    let inLineItems = false;
    let notesStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      if (line.toLowerCase().startsWith("## line item")) {
        inLineItems = true;
        continue;
      }

      if (line.toLowerCase().startsWith("## notes")) {
        inLineItems = false;
        notesStartIndex = i + 1;
        continue;
      }

      if (inLineItems) {
        // - (item_id) Description | qty | rate | amount | taskId | timeEntryIds
        const itemMatch = line.match(/^[-*]\s+\((\w+)\)\s+(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)(?:\s*\|\s*(\S*))?(?:\s*\|\s*(.*))?$/);
        if (itemMatch) {
          lineItems.push({
            id: itemMatch[1],
            description: itemMatch[2].trim(),
            quantity: parseFloat(itemMatch[3]),
            rate: parseFloat(itemMatch[4]),
            amount: parseFloat(itemMatch[5]),
            taskId: itemMatch[6] || undefined,
            timeEntryIds: itemMatch[7] ? itemMatch[7].split(",").map(t => t.trim()).filter(Boolean) : undefined,
          });
        }
      }
    }

    if (notesStartIndex > 0) {
      notes = lines.slice(notesStartIndex).join("\n").trim();
    }

    return {
      id: frontmatter.id,
      number: frontmatter.number,
      customerId: frontmatter.customerId,
      quoteId: frontmatter.quoteId,
      title,
      status: frontmatter.status || "draft",
      dueDate: frontmatter.dueDate,
      lineItems,
      subtotal: frontmatter.subtotal || 0,
      tax: frontmatter.tax,
      taxRate: frontmatter.taxRate,
      total: frontmatter.total || 0,
      paidAmount: frontmatter.paidAmount || 0,
      notes: notes || undefined,
      created: frontmatter.created || new Date().toISOString(),
      sentAt: frontmatter.sentAt,
      paidAt: frontmatter.paidAt,
    };
  }

  protected serializeInvoice(invoice: Invoice): string {
    const frontmatter: Record<string, unknown> = {
      id: invoice.id,
      number: invoice.number,
      customerId: invoice.customerId,
      status: invoice.status,
      subtotal: invoice.subtotal,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      created: invoice.created,
    };

    if (invoice.quoteId) frontmatter.quoteId = invoice.quoteId;
    if (invoice.dueDate) frontmatter.dueDate = invoice.dueDate;
    if (invoice.tax !== undefined) frontmatter.tax = invoice.tax;
    if (invoice.taxRate !== undefined) frontmatter.taxRate = invoice.taxRate;
    if (invoice.sentAt) frontmatter.sentAt = invoice.sentAt;
    if (invoice.paidAt) frontmatter.paidAt = invoice.paidAt;

    const sections: string[] = [`# ${invoice.title}`];

    sections.push("");
    sections.push("## Line Items");
    sections.push("");
    for (const item of invoice.lineItems) {
      const taskPart = item.taskId || "";
      const timeEntryPart = item.timeEntryIds?.join(",") || "";
      sections.push(`- (${item.id}) ${item.description} | ${item.quantity} | ${item.rate} | ${item.amount} | ${taskPart} | ${timeEntryPart}`);
    }

    if (invoice.notes) {
      sections.push("");
      sections.push("## Notes");
      sections.push("");
      sections.push(invoice.notes);
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async addInvoice(invoice: Omit<Invoice, "id" | "created">): Promise<Invoice> {
    await this.ensureDir();
    const newInvoice: Invoice = {
      ...invoice,
      id: this.generateId("invoice"),
      created: new Date().toISOString(),
    };
    const filePath = `${this.billingDir}/invoices/${newInvoice.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeInvoice(newInvoice));
    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    const invoices = await this.readAllInvoices();
    const existing = invoices.find(i => i.id === id);
    if (!existing) return null;

    const updated: Invoice = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.billingDir}/invoices/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeInvoice(updated));
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.billingDir}/invoices/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Payments
  // ============================================================

  async readAllPayments(): Promise<Payment[]> {
    const files = await this.listFiles("payments");
    const payments: Payment[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const payment = this.parsePayment(content);
        if (payment) payments.push(payment);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return payments;
  }

  protected parsePayment(content: string): Payment | null {
    interface PaymentFrontmatter {
      id: string;
      invoiceId: string;
      amount: number;
      date: string;
      method?: "bank" | "card" | "cash" | "other";
      reference?: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<PaymentFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let notes = "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().startsWith("## notes")) {
        notes = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }

    return {
      id: frontmatter.id,
      invoiceId: frontmatter.invoiceId,
      amount: frontmatter.amount || 0,
      date: frontmatter.date,
      method: frontmatter.method,
      reference: frontmatter.reference,
      notes: notes || undefined,
    };
  }

  protected serializePayment(payment: Payment): string {
    const frontmatter: Record<string, unknown> = {
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      date: payment.date,
      method: payment.method,
    };

    if (payment.reference) frontmatter.reference = payment.reference;

    const sections: string[] = [`# Payment ${payment.id}`];

    if (payment.notes) {
      sections.push("");
      sections.push("## Notes");
      sections.push("");
      sections.push(payment.notes);
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
    await Deno.mkdir(`${this.billingDir}/payments`, { recursive: true });
    const newPayment: Payment = {
      ...payment,
      id: this.generateId("payment"),
    };
    const filePath = `${this.billingDir}/payments/${newPayment.id}.md`;
    await this.atomicWriteFile(filePath, this.serializePayment(newPayment));
    return newPayment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const payments = await this.readAllPayments();
    const existing = payments.find(p => p.id === id);
    if (!existing) return null;

    const updated: Payment = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.billingDir}/payments/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializePayment(updated));
    return updated;
  }

  async deletePayment(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.billingDir}/payments/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  async saveAllPayments(payments: Payment[]): Promise<void> {
    await Deno.mkdir(`${this.billingDir}/payments`, { recursive: true });
    const existing = await this.readAllPayments();
    const newIds = new Set(payments.map(p => p.id));

    for (const payment of existing) {
      if (!newIds.has(payment.id)) {
        await this.deletePayment(payment.id);
      }
    }

    for (const payment of payments) {
      const filePath = `${this.billingDir}/payments/${payment.id}.md`;
      await this.atomicWriteFile(filePath, this.serializePayment(payment));
    }
  }

  // ============================================================
  // Bulk Save Methods (API Compatibility)
  // ============================================================

  async saveAllCustomers(customers: Customer[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllCustomers();
    const existingIds = new Set(existing.map(c => c.id));
    const newIds = new Set(customers.map(c => c.id));

    // Delete removed customers
    for (const customer of existing) {
      if (!newIds.has(customer.id)) {
        await this.deleteCustomer(customer.id);
      }
    }

    // Write all customers
    for (const customer of customers) {
      const filePath = `${this.billingDir}/customers/${customer.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeCustomer(customer));
    }
  }

  async saveAllRates(rates: BillingRate[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllRates();
    const existingIds = new Set(existing.map(r => r.id));
    const newIds = new Set(rates.map(r => r.id));

    // Delete removed rates
    for (const rate of existing) {
      if (!newIds.has(rate.id)) {
        await this.deleteRate(rate.id);
      }
    }

    // Write all rates
    for (const rate of rates) {
      const filePath = `${this.billingDir}/rates/${rate.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeRate(rate));
    }
  }

  async saveAllQuotes(quotes: Quote[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllQuotes();
    const existingIds = new Set(existing.map(q => q.id));
    const newIds = new Set(quotes.map(q => q.id));

    // Delete removed quotes
    for (const quote of existing) {
      if (!newIds.has(quote.id)) {
        await this.deleteQuote(quote.id);
      }
    }

    // Write all quotes
    for (const quote of quotes) {
      const filePath = `${this.billingDir}/quotes/${quote.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeQuote(quote));
    }
  }

  async saveAllInvoices(invoices: Invoice[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllInvoices();
    const existingIds = new Set(existing.map(i => i.id));
    const newIds = new Set(invoices.map(i => i.id));

    // Delete removed invoices
    for (const invoice of existing) {
      if (!newIds.has(invoice.id)) {
        await this.deleteInvoice(invoice.id);
      }
    }

    // Write all invoices
    for (const invoice of invoices) {
      const filePath = `${this.billingDir}/invoices/${invoice.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeInvoice(invoice));
    }
  }

  // ============================================================
  // Number Generation
  // ============================================================

  async getNextQuoteNumber(): Promise<string> {
    const quotes = await this.readAllQuotes();
    const currentYear = new Date().getFullYear();
    const prefix = `Q${currentYear}-`;

    let maxNumber = 0;
    for (const quote of quotes) {
      if (quote.number.startsWith(prefix)) {
        const numPart = parseInt(quote.number.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    }

    return `${prefix}${String(maxNumber + 1).padStart(4, "0")}`;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const invoices = await this.readAllInvoices();
    const currentYear = new Date().getFullYear();
    const prefix = `INV${currentYear}-`;

    let maxNumber = 0;
    for (const invoice of invoices) {
      if (invoice.number.startsWith(prefix)) {
        const numPart = parseInt(invoice.number.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    }

    return `${prefix}${String(maxNumber + 1).padStart(4, "0")}`;
  }
}
