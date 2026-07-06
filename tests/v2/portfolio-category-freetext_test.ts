/**
 * Portfolio Category must allow free entry of a brand-new category.
 * Regression for: the category autocomplete only let users pick an existing
 * category — typing a new value never synced to the hidden input (autocomplete.js
 * syncs only `[data-freetext]` inputs), so new categories were silently lost.
 * The category field must carry `freetext: true`, rendering `data-freetext="true"`.
 */

import { assert } from "@std/assert";
import { toHtml } from "../../src/utils/html.ts";
import { AutocompleteWidget } from "../../src/components/ui/autocomplete-widget.tsx";
import { PORTFOLIO_FORM_FIELDS } from "../../src/domains/portfolio/config.tsx";

Deno.test("portfolio category field is a freetext autocomplete (config)", () => {
  const categoryField = PORTFOLIO_FORM_FIELDS.find((f) =>
    f.name === "category"
  );
  assert(categoryField, "category field exists");
  assert(
    categoryField.type === "autocomplete" && categoryField.freetext === true,
    "category field must be a freetext autocomplete",
  );
});

Deno.test("freetext autocomplete renders data-freetext (allows new value)", async () => {
  const categoryField = PORTFOLIO_FORM_FIELDS.find((f) =>
    f.name === "category"
  );
  assert(categoryField && categoryField.type === "autocomplete");
  const html = await toHtml(
    AutocompleteWidget({
      id: "portfolio-category",
      name: "category",
      source: categoryField.source,
      placeholder: categoryField.placeholder,
      freetext: categoryField.freetext,
    }),
  );
  assert(
    html.includes('data-autocomplete-target="portfolio-category"'),
    "renders the category autocomplete search input",
  );
  assert(
    html.includes('data-freetext="true"'),
    "category input must allow typing a new value",
  );
});
