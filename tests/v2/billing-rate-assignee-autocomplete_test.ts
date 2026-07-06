/**
 * Billing rate "assignee" must be a person autocomplete (stored as person ID,
 * displayed as name), and stay optional/clearable.
 * - The form field is an autocomplete bound to the shared "people" source.
 * - resolveFormValues maps the stored assignee ID to the person's name so the
 *   edit form's autocomplete search box shows a name, not a raw ID.
 * - An empty assignee clears the field (parseUpdate clearEmpty).
 */

import { assert, assertEquals } from "@std/assert";
import { billingRateConfig } from "../../src/domains/billing-rate/config.tsx";
import { BILLING_RATE_FORM_FIELDS } from "../../src/domains/billing-rate/constants.tsx";
import {
  getPeopleService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("billing rate assignee field is a people autocomplete", () => {
  const field = BILLING_RATE_FORM_FIELDS.find((f) => f.name === "assignee");
  assert(field, "assignee field exists");
  assert(
    field.type === "autocomplete" && field.source === "people",
    "assignee must be a people autocomplete",
  );
  assert(!field.required, "assignee stays optional");
});

Deno.test("billing rate resolveFormValues maps assignee ID to person name", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-billing-assignee-" });
  initServices(dir, { cache: false });
  try {
    const person = await getPeopleService().create({ name: "Dana Dev" });

    const resolved = await billingRateConfig.resolveFormValues!({
      name: "Senior Dev",
      assignee: person.id,
    });
    assertEquals(
      resolved.assignee,
      "Dana Dev",
      "stored ID resolves to the person's name for display",
    );

    // Empty assignee is left untouched (no person to resolve).
    const empty = await billingRateConfig.resolveFormValues!({
      name: "Senior Dev",
      assignee: "",
    });
    assertEquals(empty.assignee, "", "empty assignee stays empty");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("billing rate parseUpdate clears an empty assignee", () => {
  const data = billingRateConfig.parseUpdate({
    name: "Senior Dev",
    rate: "100",
    unit: "h",
    assignee: "",
  });
  assert(
    data.assignee === undefined || data.assignee === null ||
      data.assignee === "",
    "empty assignee is not persisted as a stale value",
  );
});
