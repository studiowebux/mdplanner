/**
 * Directory-based parser for CRM.
 * Uses subdirectories: companies/, contacts/, deals/, interactions/
 */
import { parseFrontmatter, buildFileContent } from "./base.ts";
import type { Company, Contact, Deal, Interaction } from "../../types.ts";

export class CRMDirectoryParser {
  protected projectDir: string;
  protected crmDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.crmDir = `${projectDir}/crm`;
  }

  async ensureDir(): Promise<void> {
    await Deno.mkdir(`${this.crmDir}/companies`, { recursive: true });
    await Deno.mkdir(`${this.crmDir}/contacts`, { recursive: true });
    await Deno.mkdir(`${this.crmDir}/deals`, { recursive: true });
    await Deno.mkdir(`${this.crmDir}/interactions`, { recursive: true });
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
    const dir = `${this.crmDir}/${subdir}`;
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
  // Companies
  // ============================================================

  async readAllCompanies(): Promise<Company[]> {
    const files = await this.listFiles("companies");
    const companies: Company[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const company = this.parseCompany(content);
        if (company) companies.push(company);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return companies;
  }

  protected parseCompany(content: string): Company | null {
    interface CompanyFrontmatter {
      id: string;
      industry?: string;
      website?: string;
      phone?: string;
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      created: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<CompanyFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let name = "Untitled Company";
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
      industry: frontmatter.industry,
      website: frontmatter.website,
      phone: frontmatter.phone,
      address: frontmatter.street ? {
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

  protected serializeCompany(company: Company): string {
    const frontmatter: Record<string, unknown> = {
      id: company.id,
      created: company.created,
    };

    if (company.industry) frontmatter.industry = company.industry;
    if (company.website) frontmatter.website = company.website;
    if (company.phone) frontmatter.phone = company.phone;
    if (company.address) {
      if (company.address.street) frontmatter.street = company.address.street;
      if (company.address.city) frontmatter.city = company.address.city;
      if (company.address.state) frontmatter.state = company.address.state;
      if (company.address.postalCode) frontmatter.postalCode = company.address.postalCode;
      if (company.address.country) frontmatter.country = company.address.country;
    }

    const body = `# ${company.name}\n\n${company.notes || ""}`;
    return buildFileContent(frontmatter, body);
  }

  async addCompany(company: Omit<Company, "id" | "created">): Promise<Company> {
    await this.ensureDir();
    const newCompany: Company = {
      ...company,
      id: this.generateId("company"),
      created: new Date().toISOString(),
    };
    const filePath = `${this.crmDir}/companies/${newCompany.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeCompany(newCompany));
    return newCompany;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    const companies = await this.readAllCompanies();
    const existing = companies.find(c => c.id === id);
    if (!existing) return null;

    const updated: Company = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.crmDir}/companies/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeCompany(updated));
    return updated;
  }

  async deleteCompany(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.crmDir}/companies/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Contacts
  // ============================================================

  async readAllContacts(): Promise<Contact[]> {
    const files = await this.listFiles("contacts");
    const contacts: Contact[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const contact = this.parseContact(content);
        if (contact) contacts.push(contact);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return contacts;
  }

  protected parseContact(content: string): Contact | null {
    interface ContactFrontmatter {
      id: string;
      companyId: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      title?: string;
      isPrimary: boolean;
      created: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<ContactFrontmatter>(content);
    if (!frontmatter.id) return null;

    const notes = body.trim();

    return {
      id: frontmatter.id,
      companyId: frontmatter.companyId,
      firstName: frontmatter.firstName || "",
      lastName: frontmatter.lastName || "",
      email: frontmatter.email,
      phone: frontmatter.phone,
      title: frontmatter.title,
      isPrimary: frontmatter.isPrimary || false,
      notes: notes || undefined,
      created: frontmatter.created || new Date().toISOString(),
    };
  }

  protected serializeContact(contact: Contact): string {
    const frontmatter: Record<string, unknown> = {
      id: contact.id,
      companyId: contact.companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      isPrimary: contact.isPrimary,
      created: contact.created,
    };

    if (contact.email) frontmatter.email = contact.email;
    if (contact.phone) frontmatter.phone = contact.phone;
    if (contact.title) frontmatter.title = contact.title;

    const body = contact.notes || "";
    return buildFileContent(frontmatter, body);
  }

  async addContact(contact: Omit<Contact, "id" | "created">): Promise<Contact> {
    await this.ensureDir();
    const newContact: Contact = {
      ...contact,
      id: this.generateId("contact"),
      created: new Date().toISOString(),
    };
    const filePath = `${this.crmDir}/contacts/${newContact.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeContact(newContact));
    return newContact;
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | null> {
    const contacts = await this.readAllContacts();
    const existing = contacts.find(c => c.id === id);
    if (!existing) return null;

    const updated: Contact = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.crmDir}/contacts/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeContact(updated));
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.crmDir}/contacts/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  async getContactsByCompany(companyId: string): Promise<Contact[]> {
    const contacts = await this.readAllContacts();
    return contacts.filter(c => c.companyId === companyId);
  }

  // ============================================================
  // Deals
  // ============================================================

  async readAllDeals(): Promise<Deal[]> {
    const files = await this.listFiles("deals");
    const deals: Deal[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const deal = this.parseDeal(content);
        if (deal) deals.push(deal);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return deals;
  }

  protected parseDeal(content: string): Deal | null {
    interface DealFrontmatter {
      id: string;
      companyId: string;
      contactId?: string;
      value: number;
      stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
      probability: number;
      expectedCloseDate?: string;
      created: string;
      closedAt?: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<DealFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let title = "Untitled Deal";
    let notes = "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        title = lines[i].slice(2).trim();
        notes = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }

    return {
      id: frontmatter.id,
      companyId: frontmatter.companyId,
      contactId: frontmatter.contactId,
      title,
      value: frontmatter.value || 0,
      stage: frontmatter.stage || "lead",
      probability: frontmatter.probability || 0,
      expectedCloseDate: frontmatter.expectedCloseDate,
      notes: notes || undefined,
      created: frontmatter.created || new Date().toISOString(),
      closedAt: frontmatter.closedAt,
    };
  }

  protected serializeDeal(deal: Deal): string {
    const frontmatter: Record<string, unknown> = {
      id: deal.id,
      companyId: deal.companyId,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      created: deal.created,
    };

    if (deal.contactId) frontmatter.contactId = deal.contactId;
    if (deal.expectedCloseDate) frontmatter.expectedCloseDate = deal.expectedCloseDate;
    if (deal.closedAt) frontmatter.closedAt = deal.closedAt;

    const body = `# ${deal.title}\n\n${deal.notes || ""}`;
    return buildFileContent(frontmatter, body);
  }

  async addDeal(deal: Omit<Deal, "id" | "created">): Promise<Deal> {
    await this.ensureDir();
    const newDeal: Deal = {
      ...deal,
      id: this.generateId("deal"),
      created: new Date().toISOString(),
    };
    const filePath = `${this.crmDir}/deals/${newDeal.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeDeal(newDeal));
    return newDeal;
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    const deals = await this.readAllDeals();
    const existing = deals.find(d => d.id === id);
    if (!existing) return null;

    const updated: Deal = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.crmDir}/deals/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeDeal(updated));
    return updated;
  }

  async deleteDeal(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.crmDir}/deals/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  async getDealsByCompany(companyId: string): Promise<Deal[]> {
    const deals = await this.readAllDeals();
    return deals.filter(d => d.companyId === companyId);
  }

  async getDealsByStage(stage: Deal["stage"]): Promise<Deal[]> {
    const deals = await this.readAllDeals();
    return deals.filter(d => d.stage === stage);
  }

  // ============================================================
  // Interactions
  // ============================================================

  async readAllInteractions(): Promise<Interaction[]> {
    const files = await this.listFiles("interactions");
    const interactions: Interaction[] = [];

    for (const filePath of files) {
      try {
        const content = await Deno.readTextFile(filePath);
        const interaction = this.parseInteraction(content);
        if (interaction) interactions.push(interaction);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return interactions;
  }

  protected parseInteraction(content: string): Interaction | null {
    interface InteractionFrontmatter {
      id: string;
      companyId: string;
      contactId?: string;
      dealId?: string;
      type: "email" | "call" | "meeting" | "note";
      date: string;
      duration?: number;
      nextFollowUp?: string;
    }

    const { frontmatter, content: body } = parseFrontmatter<InteractionFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let summary = "";
    let notes = "";
    let inNotes = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# ")) {
        summary = line.slice(2).trim();
        continue;
      }

      if (line.toLowerCase().startsWith("## notes")) {
        inNotes = true;
        continue;
      }

      if (inNotes) {
        notes += line + "\n";
      }
    }

    return {
      id: frontmatter.id,
      companyId: frontmatter.companyId,
      contactId: frontmatter.contactId,
      dealId: frontmatter.dealId,
      type: frontmatter.type || "note",
      summary,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      duration: frontmatter.duration,
      nextFollowUp: frontmatter.nextFollowUp,
      notes: notes.trim() || undefined,
    };
  }

  protected serializeInteraction(interaction: Interaction): string {
    const frontmatter: Record<string, unknown> = {
      id: interaction.id,
      companyId: interaction.companyId,
      type: interaction.type,
      date: interaction.date,
    };

    if (interaction.contactId) frontmatter.contactId = interaction.contactId;
    if (interaction.dealId) frontmatter.dealId = interaction.dealId;
    if (interaction.duration) frontmatter.duration = interaction.duration;
    if (interaction.nextFollowUp) frontmatter.nextFollowUp = interaction.nextFollowUp;

    const sections: string[] = [`# ${interaction.summary}`];

    if (interaction.notes) {
      sections.push("");
      sections.push("## Notes");
      sections.push("");
      sections.push(interaction.notes);
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async addInteraction(interaction: Omit<Interaction, "id">): Promise<Interaction> {
    await this.ensureDir();
    const newInteraction: Interaction = {
      ...interaction,
      id: this.generateId("interaction"),
    };
    const filePath = `${this.crmDir}/interactions/${newInteraction.id}.md`;
    await this.atomicWriteFile(filePath, this.serializeInteraction(newInteraction));
    return newInteraction;
  }

  async updateInteraction(id: string, updates: Partial<Interaction>): Promise<Interaction | null> {
    const interactions = await this.readAllInteractions();
    const existing = interactions.find(i => i.id === id);
    if (!existing) return null;

    const updated: Interaction = { ...existing, ...updates, id: existing.id };
    const filePath = `${this.crmDir}/interactions/${id}.md`;
    await this.atomicWriteFile(filePath, this.serializeInteraction(updated));
    return updated;
  }

  async deleteInteraction(id: string): Promise<boolean> {
    try {
      await Deno.remove(`${this.crmDir}/interactions/${id}.md`);
      return true;
    } catch {
      return false;
    }
  }

  async getInteractionsByCompany(companyId: string): Promise<Interaction[]> {
    const interactions = await this.readAllInteractions();
    return interactions.filter(i => i.companyId === companyId);
  }

  async getInteractionsByDeal(dealId: string): Promise<Interaction[]> {
    const interactions = await this.readAllInteractions();
    return interactions.filter(i => i.dealId === dealId);
  }

  async getUpcomingFollowUps(): Promise<Interaction[]> {
    const interactions = await this.readAllInteractions();
    const today = new Date().toISOString().split("T")[0];
    return interactions
      .filter(i => i.nextFollowUp && i.nextFollowUp >= today)
      .sort((a, b) => (a.nextFollowUp || "").localeCompare(b.nextFollowUp || ""));
  }

  // ============================================================
  // Bulk Save Methods (API Compatibility)
  // ============================================================

  async saveAllCompanies(companies: Company[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllCompanies();
    const newIds = new Set(companies.map(c => c.id));

    // Delete removed companies
    for (const company of existing) {
      if (!newIds.has(company.id)) {
        await this.deleteCompany(company.id);
      }
    }

    // Write all companies
    for (const company of companies) {
      const filePath = `${this.crmDir}/companies/${company.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeCompany(company));
    }
  }

  async saveAllContacts(contacts: Contact[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllContacts();
    const newIds = new Set(contacts.map(c => c.id));

    // Delete removed contacts
    for (const contact of existing) {
      if (!newIds.has(contact.id)) {
        await this.deleteContact(contact.id);
      }
    }

    // Write all contacts
    for (const contact of contacts) {
      const filePath = `${this.crmDir}/contacts/${contact.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeContact(contact));
    }
  }

  async saveAllDeals(deals: Deal[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllDeals();
    const newIds = new Set(deals.map(d => d.id));

    // Delete removed deals
    for (const deal of existing) {
      if (!newIds.has(deal.id)) {
        await this.deleteDeal(deal.id);
      }
    }

    // Write all deals
    for (const deal of deals) {
      const filePath = `${this.crmDir}/deals/${deal.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeDeal(deal));
    }
  }

  async saveAllInteractions(interactions: Interaction[]): Promise<void> {
    await this.ensureDir();
    const existing = await this.readAllInteractions();
    const newIds = new Set(interactions.map(i => i.id));

    // Delete removed interactions
    for (const interaction of existing) {
      if (!newIds.has(interaction.id)) {
        await this.deleteInteraction(interaction.id);
      }
    }

    // Write all interactions
    for (const interaction of interactions) {
      const filePath = `${this.crmDir}/interactions/${interaction.id}.md`;
      await this.atomicWriteFile(filePath, this.serializeInteraction(interaction));
    }
  }

  // ============================================================
  // Summary
  // ============================================================

  async getSummary(): Promise<{
    totalCompanies: number;
    totalContacts: number;
    totalDeals: number;
    totalInteractions: number;
    pipelineValue: number;
    wonDeals: number;
  }> {
    const [companies, contacts, deals, interactions] = await Promise.all([
      this.readAllCompanies(),
      this.readAllContacts(),
      this.readAllDeals(),
      this.readAllInteractions(),
    ]);

    const openDeals = deals.filter(d => !["won", "lost"].includes(d.stage));
    const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const wonDeals = deals.filter(d => d.stage === "won").length;

    return {
      totalCompanies: companies.length,
      totalContacts: contacts.length,
      totalDeals: deals.length,
      totalInteractions: interactions.length,
      pipelineValue,
      wonDeals,
    };
  }
}
