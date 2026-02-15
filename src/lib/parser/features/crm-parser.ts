/**
 * CRM parser class for parsing and serializing CRM-related markdown.
 * Handles Companies, Contacts, Deals, and Interactions.
 */
import {
  Company,
  Contact,
  Deal,
  Interaction,
} from "../../types.ts";
import { BaseParser } from "../core.ts";

export class CRMParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  generateId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  // ============================================
  // COMPANIES
  // ============================================

  parseCompaniesSection(lines: string[]): Company[] {
    const companies: Company[] = [];

    let inCompaniesSection = false;
    let currentCompany: Partial<Company> | null = null;
    let inAddress = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inCompaniesSection && (line.startsWith("# Companies") || line.includes("<!-- Companies -->"))) {
        inCompaniesSection = true;
        continue;
      }

      if (inCompaniesSection && line.startsWith("# Companies")) {
        continue;
      }

      if (inCompaniesSection && line.startsWith("# ") && !line.startsWith("# Companies")) {
        if (currentCompany?.name) {
          companies.push(currentCompany as Company);
        }
        currentCompany = null;
        break;
      }

      if (!inCompaniesSection) continue;

      if (line.startsWith("## ")) {
        if (currentCompany?.name) companies.push(currentCompany as Company);
        const name = line.substring(3).trim();
        currentCompany = {
          id: this.generateId(),
          name,
          created: new Date().toISOString().split("T")[0],
        };
        inAddress = false;
      } else if (currentCompany) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentCompany.id = match[1];
        } else if (line.startsWith("Industry:")) {
          currentCompany.industry = line.substring(9).trim();
        } else if (line.startsWith("Website:")) {
          currentCompany.website = line.substring(8).trim();
        } else if (line.startsWith("Phone:")) {
          currentCompany.phone = line.substring(6).trim();
        } else if (line.startsWith("Created:")) {
          currentCompany.created = line.substring(8).trim();
        } else if (line.startsWith("### Address")) {
          inAddress = true;
          currentCompany.address = {};
        } else if (line.startsWith("### Notes")) {
          inAddress = false;
        } else if (inAddress && currentCompany.address) {
          if (line.startsWith("Street:")) {
            currentCompany.address.street = line.substring(7).trim();
          } else if (line.startsWith("City:")) {
            currentCompany.address.city = line.substring(5).trim();
          } else if (line.startsWith("State:")) {
            currentCompany.address.state = line.substring(6).trim();
          } else if (line.startsWith("Postal Code:")) {
            currentCompany.address.postalCode = line.substring(12).trim();
          } else if (line.startsWith("Country:")) {
            currentCompany.address.country = line.substring(8).trim();
          }
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("###") && !inAddress) {
          currentCompany.notes = (currentCompany.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentCompany?.name) companies.push(currentCompany as Company);
    return companies;
  }

  companyToMarkdown(company: Company): string {
    let content = `## ${company.name}\n`;
    content += `<!-- id: ${company.id} -->\n`;
    if (company.industry) content += `Industry: ${company.industry}\n`;
    if (company.website) content += `Website: ${company.website}\n`;
    if (company.phone) content += `Phone: ${company.phone}\n`;
    content += `Created: ${company.created}\n`;
    if (company.address) {
      content += `\n### Address\n`;
      if (company.address.street) content += `Street: ${company.address.street}\n`;
      if (company.address.city) content += `City: ${company.address.city}\n`;
      if (company.address.state) content += `State: ${company.address.state}\n`;
      if (company.address.postalCode) content += `Postal Code: ${company.address.postalCode}\n`;
      if (company.address.country) content += `Country: ${company.address.country}\n`;
    }
    if (company.notes) {
      content += `\n### Notes\n${company.notes.trim()}\n`;
    }
    content += "\n";
    return content;
  }

  companiesToMarkdown(companies: Company[]): string {
    let content = "<!-- Companies -->\n# Companies\n\n";
    for (const company of companies) {
      content += this.companyToMarkdown(company);
    }
    return content;
  }

  findCompaniesSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Companies -->") || lines[i].startsWith("# Companies"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Companies")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // CONTACTS
  // ============================================

  parseContactsSection(lines: string[]): Contact[] {
    const contacts: Contact[] = [];

    let inContactsSection = false;
    let currentContact: Partial<Contact> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inContactsSection && (line.startsWith("# Contacts") || line.includes("<!-- Contacts -->"))) {
        inContactsSection = true;
        continue;
      }
      if (inContactsSection && line.startsWith("# Contacts")) {
        continue;
      }

      if (inContactsSection && line.startsWith("# ") && !line.startsWith("# Contacts")) {
        if (currentContact?.firstName) contacts.push(currentContact as Contact);
        currentContact = null;
        break;
      }

      if (!inContactsSection) continue;

      if (line.startsWith("## ")) {
        if (currentContact?.firstName) contacts.push(currentContact as Contact);
        // Parse header: ## FirstName LastName {company: company_id; primary: true}
        const headerMatch = line.match(/^## ([^{]+)(?:\s*\{([^}]+)\})?$/);
        if (headerMatch) {
          const nameParts = headerMatch[1].trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const config = headerMatch[2] || "";

          currentContact = {
            id: this.generateId(),
            firstName,
            lastName,
            companyId: "",
            isPrimary: false,
            created: new Date().toISOString().split("T")[0],
          };

          // Parse config
          const companyMatch = config.match(/company:\s*([^;]+)/);
          if (companyMatch) currentContact.companyId = companyMatch[1].trim();
          const primaryMatch = config.match(/primary:\s*(true|false)/);
          if (primaryMatch) currentContact.isPrimary = primaryMatch[1] === "true";
        }
      } else if (currentContact) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentContact.id = match[1];
        } else if (line.startsWith("Email:")) {
          currentContact.email = line.substring(6).trim();
        } else if (line.startsWith("Phone:")) {
          currentContact.phone = line.substring(6).trim();
        } else if (line.startsWith("Title:")) {
          currentContact.title = line.substring(6).trim();
        } else if (line.startsWith("Created:")) {
          currentContact.created = line.substring(8).trim();
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("##")) {
          currentContact.notes = (currentContact.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentContact?.firstName) contacts.push(currentContact as Contact);
    return contacts;
  }

  contactToMarkdown(contact: Contact): string {
    let header = `## ${contact.firstName} ${contact.lastName}`;
    const configParts: string[] = [];
    if (contact.companyId) configParts.push(`company: ${contact.companyId}`);
    if (contact.isPrimary) configParts.push(`primary: true`);
    if (configParts.length > 0) header += ` {${configParts.join("; ")}}`;

    let content = header + "\n";
    content += `<!-- id: ${contact.id} -->\n`;
    if (contact.email) content += `Email: ${contact.email}\n`;
    if (contact.phone) content += `Phone: ${contact.phone}\n`;
    if (contact.title) content += `Title: ${contact.title}\n`;
    content += `Created: ${contact.created}\n`;
    if (contact.notes) content += `\n${contact.notes.trim()}\n`;
    content += "\n";
    return content;
  }

  contactsToMarkdown(contacts: Contact[]): string {
    let content = "<!-- Contacts -->\n# Contacts\n\n";
    for (const contact of contacts) {
      content += this.contactToMarkdown(contact);
    }
    return content;
  }

  findContactsSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Contacts -->") || lines[i].startsWith("# Contacts"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Contacts")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // DEALS
  // ============================================

  parseDealsSection(lines: string[]): Deal[] {
    const deals: Deal[] = [];

    let inDealsSection = false;
    let currentDeal: Partial<Deal> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inDealsSection && (line.startsWith("# Deals") || line.includes("<!-- Deals -->"))) {
        inDealsSection = true;
        continue;
      }
      if (inDealsSection && line.startsWith("# Deals")) {
        continue;
      }

      if (inDealsSection && line.startsWith("# ") && !line.startsWith("# Deals")) {
        if (currentDeal?.title) deals.push(currentDeal as Deal);
        currentDeal = null;
        break;
      }

      if (!inDealsSection) continue;

      if (line.startsWith("## ")) {
        if (currentDeal?.title) deals.push(currentDeal as Deal);
        // Parse header: ## Deal Title {company: id; contact: id; stage: proposal; value: 50000; probability: 60}
        const headerMatch = line.match(/^## ([^{]+)(?:\s*\{([^}]+)\})?$/);
        if (headerMatch) {
          const title = headerMatch[1].trim();
          const config = headerMatch[2] || "";

          currentDeal = {
            id: this.generateId(),
            title,
            companyId: "",
            value: 0,
            stage: "lead",
            probability: 0,
            created: new Date().toISOString().split("T")[0],
          };

          // Parse config
          const companyMatch = config.match(/company:\s*([^;]+)/);
          if (companyMatch) currentDeal.companyId = companyMatch[1].trim();
          const contactMatch = config.match(/contact:\s*([^;]+)/);
          if (contactMatch) currentDeal.contactId = contactMatch[1].trim();
          const stageMatch = config.match(/stage:\s*([^;]+)/);
          if (stageMatch) {
            const s = stageMatch[1].trim().toLowerCase();
            if (["lead", "qualified", "proposal", "negotiation", "won", "lost"].includes(s)) {
              currentDeal.stage = s as Deal["stage"];
            }
          }
          const valueMatch = config.match(/value:\s*([^;]+)/);
          if (valueMatch) currentDeal.value = parseFloat(valueMatch[1].trim()) || 0;
          const probabilityMatch = config.match(/probability:\s*([^;]+)/);
          if (probabilityMatch) currentDeal.probability = parseFloat(probabilityMatch[1].trim()) || 0;
        }
      } else if (currentDeal) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentDeal.id = match[1];
        } else if (line.startsWith("Expected Close:")) {
          currentDeal.expectedCloseDate = line.substring(15).trim();
        } else if (line.startsWith("Created:")) {
          currentDeal.created = line.substring(8).trim();
        } else if (line.startsWith("Closed At:")) {
          currentDeal.closedAt = line.substring(10).trim();
        } else if (line.startsWith("### Notes")) {
          // Notes section start, handled by content collection below
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("###") && !line.startsWith("##")) {
          currentDeal.notes = (currentDeal.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentDeal?.title) deals.push(currentDeal as Deal);
    return deals;
  }

  dealToMarkdown(deal: Deal): string {
    const configParts: string[] = [];
    if (deal.companyId) configParts.push(`company: ${deal.companyId}`);
    if (deal.contactId) configParts.push(`contact: ${deal.contactId}`);
    configParts.push(`stage: ${deal.stage}`);
    configParts.push(`value: ${deal.value}`);
    configParts.push(`probability: ${deal.probability}`);

    let content = `## ${deal.title} {${configParts.join("; ")}}\n`;
    content += `<!-- id: ${deal.id} -->\n`;
    if (deal.expectedCloseDate) content += `Expected Close: ${deal.expectedCloseDate}\n`;
    content += `Created: ${deal.created}\n`;
    if (deal.closedAt) content += `Closed At: ${deal.closedAt}\n`;
    if (deal.notes) {
      content += `\n### Notes\n${deal.notes.trim()}\n`;
    }
    content += "\n";
    return content;
  }

  dealsToMarkdown(deals: Deal[]): string {
    let content = "<!-- Deals -->\n# Deals\n\n";
    for (const deal of deals) {
      content += this.dealToMarkdown(deal);
    }
    return content;
  }

  findDealsSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Deals -->") || lines[i].startsWith("# Deals"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Deals")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // INTERACTIONS
  // ============================================

  parseInteractionsSection(lines: string[]): Interaction[] {
    const interactions: Interaction[] = [];

    let inInteractionsSection = false;
    let currentInteraction: Partial<Interaction> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inInteractionsSection && (line.startsWith("# Interactions") || line.includes("<!-- Interactions -->"))) {
        inInteractionsSection = true;
        continue;
      }
      if (inInteractionsSection && line.startsWith("# Interactions")) {
        continue;
      }

      if (inInteractionsSection && line.startsWith("# ") && !line.startsWith("# Interactions")) {
        if (currentInteraction?.summary) interactions.push(currentInteraction as Interaction);
        currentInteraction = null;
        break;
      }

      if (!inInteractionsSection) continue;

      if (line.startsWith("## ")) {
        if (currentInteraction?.summary) interactions.push(currentInteraction as Interaction);
        // Parse header: ## Summary {company: id; contact: id; deal: id; type: call; date: 2026-02-14}
        const headerMatch = line.match(/^## ([^{]+)(?:\s*\{([^}]+)\})?$/);
        if (headerMatch) {
          const summary = headerMatch[1].trim();
          const config = headerMatch[2] || "";

          currentInteraction = {
            id: this.generateId(),
            summary,
            companyId: "",
            type: "note",
            date: new Date().toISOString().split("T")[0],
          };

          // Parse config
          const companyMatch = config.match(/company:\s*([^;]+)/);
          if (companyMatch) currentInteraction.companyId = companyMatch[1].trim();
          const contactMatch = config.match(/contact:\s*([^;]+)/);
          if (contactMatch) currentInteraction.contactId = contactMatch[1].trim();
          const dealMatch = config.match(/deal:\s*([^;]+)/);
          if (dealMatch) currentInteraction.dealId = dealMatch[1].trim();
          const typeMatch = config.match(/type:\s*([^;]+)/);
          if (typeMatch) {
            const t = typeMatch[1].trim().toLowerCase();
            if (["email", "call", "meeting", "note"].includes(t)) {
              currentInteraction.type = t as Interaction["type"];
            }
          }
          const dateMatch = config.match(/date:\s*([^;]+)/);
          if (dateMatch) currentInteraction.date = dateMatch[1].trim();
        }
      } else if (currentInteraction) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentInteraction.id = match[1];
        } else if (line.startsWith("Duration:")) {
          currentInteraction.duration = parseInt(line.substring(9).trim()) || undefined;
        } else if (line.startsWith("Summary:")) {
          // This may override header summary
          const sumLine = line.substring(8).trim();
          if (sumLine) currentInteraction.summary = sumLine;
        } else if (line.startsWith("Next Follow-up:")) {
          currentInteraction.nextFollowUp = line.substring(15).trim();
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("##")) {
          currentInteraction.notes = (currentInteraction.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentInteraction?.summary) interactions.push(currentInteraction as Interaction);
    return interactions;
  }

  interactionToMarkdown(interaction: Interaction): string {
    const configParts: string[] = [];
    if (interaction.companyId) configParts.push(`company: ${interaction.companyId}`);
    if (interaction.contactId) configParts.push(`contact: ${interaction.contactId}`);
    if (interaction.dealId) configParts.push(`deal: ${interaction.dealId}`);
    configParts.push(`type: ${interaction.type}`);
    configParts.push(`date: ${interaction.date}`);

    let content = `## ${interaction.summary} {${configParts.join("; ")}}\n`;
    content += `<!-- id: ${interaction.id} -->\n`;
    if (interaction.duration) content += `Duration: ${interaction.duration}\n`;
    if (interaction.nextFollowUp) content += `Next Follow-up: ${interaction.nextFollowUp}\n`;
    if (interaction.notes) content += `\n${interaction.notes.trim()}\n`;
    content += "\n";
    return content;
  }

  interactionsToMarkdown(interactions: Interaction[]): string {
    let content = "<!-- Interactions -->\n# Interactions\n\n";
    for (const interaction of interactions) {
      content += this.interactionToMarkdown(interaction);
    }
    return content;
  }

  findInteractionsSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Interactions -->") || lines[i].startsWith("# Interactions"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Interactions")) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  // ============================================
  // HELPERS
  // ============================================

  createCompany(company: Omit<Company, "id">): Company {
    return { ...company, id: this.generateId() };
  }

  createContact(contact: Omit<Contact, "id">): Contact {
    return { ...contact, id: this.generateId() };
  }

  createDeal(deal: Omit<Deal, "id">): Deal {
    return { ...deal, id: this.generateId() };
  }

  createInteraction(interaction: Omit<Interaction, "id">): Interaction {
    return { ...interaction, id: this.generateId() };
  }
}
