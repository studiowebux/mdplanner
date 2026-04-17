// Customer repository — markdown file CRUD under billing/customers/.

import type {
  BillingAddress,
  CreateCustomer,
  Customer,
  UpdateCustomer,
} from "../types/customer.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { CUSTOMER_TABLE, rowToCustomer } from "../domains/customer/cache.ts";
import { CUSTOMER_BODY_KEYS } from "../domains/customer/constants.ts";

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

    let billingAddress: BillingAddress | undefined;
    if (fm.billing_address && typeof fm.billing_address === "object") {
      const a = fm.billing_address as Record<string, unknown>;
      billingAddress = {
        street: a.street != null ? String(a.street) : undefined,
        city: a.city != null ? String(a.city) : undefined,
        state: a.state != null ? String(a.state) : undefined,
        postalCode: a.postalCode != null ? String(a.postalCode) : undefined,
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
    return this.serializeStandard(
      item,
      CUSTOMER_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Customer): string {
    const parts: string[] = [`# ${item.name}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
