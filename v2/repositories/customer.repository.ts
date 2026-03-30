// Customer repository — markdown file CRUD under billing/customers/.

import type {
  BillingAddress,
  CreateCustomer,
  Customer,
  UpdateCustomer,
} from "../types/customer.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { CUSTOMER_TABLE, rowToCustomer } from "../domains/customer/cache.ts";

const BODY_KEYS = ["id", "notes"] as const;

export class CustomerRepository extends CachedMarkdownRepository<
  Customer,
  CreateCustomer,
  UpdateCustomer
> {
  protected readonly tableName = CUSTOMER_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/customers",
      idPrefix: "customer",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Customer {
    return rowToCustomer(row);
  }

  // Filename may not match frontmatter id — try direct lookup, then full scan.
  override async findById(id: string): Promise<Customer | null> {
    const direct = await super.findById(id);
    if (direct) return direct;
    const all = await this.findAll();
    return all.find((item) => item.id === id) ?? null;
  }

  protected fromCreateInput(
    data: CreateCustomer,
    id: string,
    now: string,
  ): Customer {
    return {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Customer | null {
    if (!fm.id && !fm.name) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const name = fm.name
      ? String(fm.name)
      : headingMatch
      ? headingMatch[1]
      : "";

    // Extract notes from body after heading, strip ## Notes header if present
    let notes: string | undefined;
    if (headingMatch) {
      const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
      notes = afterHeading.replace(/^##\s+Notes\n?/, "").trim() || undefined;
    } else {
      notes = bodyText || undefined;
    }

    // Parse nested billingAddress — handle both camelCase and snake_case keys
    let billingAddress: BillingAddress | undefined;
    const addr = fm.billingAddress ?? fm.billing_address;
    if (addr && typeof addr === "object") {
      const a = addr as Record<string, unknown>;
      billingAddress = {
        street: a.street != null ? String(a.street) : undefined,
        city: a.city != null ? String(a.city) : undefined,
        state: a.state != null ? String(a.state) : undefined,
        postalCode: a.postalCode != null || a.postal_code != null
          ? String(a.postalCode ?? a.postal_code)
          : undefined,
        country: a.country != null ? String(a.country) : undefined,
      };
    }

    return {
      id,
      name,
      email: fm.email != null ? String(fm.email) : undefined,
      phone: fm.phone != null ? String(fm.phone) : undefined,
      company: fm.company != null ? String(fm.company) : undefined,
      billingAddress,
      notes,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(item: Customer): string {
    return this.serializeStandard(item, BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: Customer): string {
    const parts: string[] = [`# ${item.name}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
