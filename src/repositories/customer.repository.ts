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

import {
  fmStr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Customer entities as markdown with a SQLite cache mirror. */
export class CustomerRepository extends CachedMarkdownRepository<
  Customer,
  CreateCustomer,
  UpdateCustomer
> {
  protected readonly tableName = CUSTOMER_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/customers",
      idPrefix: "customer",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Customer {
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
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Customer | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);

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
    if (fm.billingAddress && typeof fm.billingAddress === "object") {
      const a = fm.billingAddress as Record<string, unknown>;
      billingAddress = {
        street: fmStr(a, "street"),
        city: fmStr(a, "city"),
        state: fmStr(a, "state"),
        postalCode: fmStr(a, "postalCode"),
        country: fmStr(a, "country"),
      };
    }

    return {
      id,
      name,
      email: fmStr(fm, "email"),
      phone: fmStr(fm, "phone"),
      company: fmStr(fm, "company"),
      billingAddress,
      notes,
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
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
