// Contact service — business logic over ContactRepository.

import type { ContactRepository } from "../repositories/contact.repository.ts";
import type {
  Contact,
  CreateContact,
  ListContactOptions,
  PositionHistoryItem,
  UpdateContact,
} from "../types/contact.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Contact CRUD service; filters by company, type, and text query (q). */
export class ContactService extends BaseService<
  Contact,
  CreateContact,
  UpdateContact,
  ListContactOptions
> {
  constructor(contactRepo: ContactRepository) {
    super(contactRepo);
  }

  protected applyFilters(
    contacts: Contact[],
    options: ListContactOptions,
  ): Contact[] {
    if (options.q) {
      contacts = contacts.filter((c) =>
        ciIncludes(c.name, options.q!) ||
        ciIncludes(c.email, options.q!) ||
        ciIncludes(c.role, options.q!) ||
        ciIncludes(c.company, options.q!) ||
        ciIncludes(c.notes, options.q!)
      );
    }
    if (options.type) {
      contacts = contacts.filter((c) => ciEquals(c.type, options.type!));
    }
    if (options.company) {
      contacts = contacts.filter((c) => ciEquals(c.company, options.company!));
    }
    return contacts;
  }

  /**
   * Append a position history entry when company or role changes.
   * Closes the current active entry (sets `to` + clears `active`), then
   * prepends a new active entry. Caller passes the NEW company/role values.
   */
  override async update(
    id: string,
    data: UpdateContact,
  ): Promise<Contact | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    const newCompany = data.company !== undefined
      ? data.company
      : existing.company;
    const newRole = data.role !== undefined ? data.role : existing.role;
    const companyChanged = !ciEquals(newCompany, existing.company);
    const roleChanged = !ciEquals(newRole, existing.role);

    if ((companyChanged || roleChanged) && newCompany) {
      const today = new Date().toISOString().slice(0, 10);
      const history: PositionHistoryItem[] = [
        ...(existing.positionHistory ?? []).map((h) =>
          h.active ? { ...h, to: today, active: undefined } : h
        ),
      ];
      history.unshift({
        company: newCompany,
        title: newRole ?? undefined,
        from: today,
        active: true,
      });
      data = { ...data, positionHistory: history };
    }

    return super.update(id, data);
  }
}
