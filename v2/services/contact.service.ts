// Contact service — business logic over ContactRepository.

import type { ContactRepository } from "../repositories/contact.repository.ts";
import type {
  Contact,
  CreateContact,
  ListContactOptions,
  UpdateContact,
} from "../types/contact.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

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
}
