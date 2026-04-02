// Shared billing constants — line item field definitions derived from billing.types.ts.
// Used by Quote and Invoice form fields to avoid duplication.

import type { ArrayTableItemField } from "../../components/ui/form-builder.tsx";
import {
  DISCOUNT_TYPES,
  LINE_ITEM_TYPES,
  UNIT_TYPES,
} from "../../types/billing.types.ts";

// ---------------------------------------------------------------------------
// Derived select options — single source from billing.types.ts const arrays
// ---------------------------------------------------------------------------

export const LINE_ITEM_TYPE_OPTIONS = LINE_ITEM_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export const UNIT_OPTIONS = UNIT_TYPES.map((u) => ({
  value: u,
  label: u,
}));

export const DISCOUNT_TYPE_OPTIONS = DISCOUNT_TYPES.map((d) => ({
  value: d,
  label: d === "percent" ? "%" : "$",
}));

// ---------------------------------------------------------------------------
// Base line item fields — shared by Quote and Invoice array-table
// ---------------------------------------------------------------------------

export const BASE_LINE_ITEM_FIELDS: ArrayTableItemField[] = [
  {
    type: "autocomplete",
    name: "rateId",
    label: "Rate",
    source: "billing-rates",
    placeholder: "Search rates...",
    autofill: { unit: "unit", rate: "unitRate" },
  },
  {
    type: "select",
    name: "type",
    label: "Type",
    options: LINE_ITEM_TYPE_OPTIONS,
  },
  {
    type: "text",
    name: "description",
    label: "Description",
    placeholder: "Line item description",
  },
  { type: "text", name: "group", label: "Group", placeholder: "Section" },
  { type: "number", name: "quantity", label: "Qty" },
  {
    type: "select",
    name: "unit",
    label: "Unit",
    options: UNIT_OPTIONS,
  },
  { type: "number", name: "unitRate", label: "Rate" },
  { type: "number", name: "discount", label: "Discount" },
  {
    type: "select",
    name: "discountType",
    label: "Disc. Type",
    options: DISCOUNT_TYPE_OPTIONS,
  },
];
