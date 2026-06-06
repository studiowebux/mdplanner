// Editable quote line-items table — Excel-like click-to-edit cells.
// Quote-only (draft status); the shared read-only LineItemsTable handles
// non-draft quotes and invoices. Cells are addressed by array index; every
// mutation re-renders the whole section so indices stay consistent.

import type { FC } from "hono/jsx";
import type { Quote } from "../../types/quote.types.ts";
import type { LineItem } from "../../types/billing.types.ts";
import { formatCurrency } from "../../utils/format.ts";
import { BillingTotals } from "./billing-totals.tsx";

/** Fields the inline editor allows editing. Type/unit/discount stay in sidenav. */
export const EDITABLE_LINE_ITEM_FIELDS = [
  "description",
  "quantity",
  "unitRate",
] as const;

export type EditableLineItemField = (typeof EDITABLE_LINE_ITEM_FIELDS)[number];

/** Display string for an editable field's current value. */
export function lineItemFieldValue(
  item: LineItem,
  field: EditableLineItemField,
): string {
  if (field === "description") return item.description ?? "";
  const v = item[field];
  return v == null ? "" : String(v);
}

const TYPE_LABEL: Record<string, string> = {
  service: "Service",
  product: "Product",
  expense: "Expense",
  text: "Text",
};

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

const ReadCell: FC<{
  quoteId: string;
  index: number;
  field: EditableLineItemField;
  value: string;
  align?: "right";
}> = ({ quoteId, index, field, value, align }) => (
  <td
    class={`qli-cell qli-cell--edit${
      align === "right" ? " qli-cell--right" : ""
    }`}
    hx-get={`/quotes/${quoteId}/line-items/${index}/edit?field=${field}`}
    hx-target="this"
    hx-swap="outerHTML"
    title="Click to edit"
  >
    {value !== "" ? value : <span class="qli-cell__placeholder">&mdash;</span>}
  </td>
);

/** Editing input cell — returned by the GET edit route. */
export const EditCell: FC<{
  quoteId: string;
  index: number;
  field: EditableLineItemField;
  value: string;
}> = ({ quoteId, index, field, value }) => {
  const numeric = field !== "description";
  return (
    <td class="qli-cell qli-cell--editing">
      <input
        id={`qli-${index}-${field}`}
        class="qli-input"
        type={numeric ? "number" : "text"}
        step={numeric ? "0.01" : undefined}
        name="value"
        value={value}
        autofocus
        autocomplete="off"
        data-quadrant-edit={`/quotes/${quoteId}/line-items/${index}?field=${field}`}
        hx-post={`/quotes/${quoteId}/line-items/${index}?field=${field}`}
        hx-target="closest td"
        hx-swap="outerHTML"
        hx-trigger="quadrant-save"
      />
      <button
        type="button"
        class="quadrant-card__save btn btn--primary btn--sm is-hidden"
        data-quadrant-save-for={`qli-${index}-${field}`}
        aria-label="Save"
      >
        ✓
      </button>
    </td>
  );
};

/** Read cell for a single editable field — returned after a save. */
export const LineItemReadCell: FC<{
  quoteId: string;
  index: number;
  field: EditableLineItemField;
  item: LineItem;
}> = ({ quoteId, index, field, item }) => (
  <ReadCell
    quoteId={quoteId}
    index={index}
    field={field}
    value={lineItemFieldValue(item, field)}
    align={field === "description" ? undefined : "right"}
  />
);

/** Computed amount cell. `oob` emits it as an out-of-band swap target. */
export const LineItemAmountCell: FC<{
  index: number;
  amount: number;
  oob?: boolean;
}> = ({ index, amount, oob }) => (
  <td
    id={`qli-amount-${index}`}
    class="qli-cell qli-cell--right qli-amount"
    hx-swap-oob={oob ? "true" : undefined}
  >
    {formatCurrency(amount) || "$0"}
  </td>
);

/** Totals block. `oob` emits it as an out-of-band swap target. */
export const QuoteTotals: FC<{ quote: Quote; oob?: boolean }> = (
  { quote, oob },
) => (
  <div id="quote-totals" hx-swap-oob={oob ? "true" : undefined}>
    <BillingTotals
      subtotal={quote.subtotal}
      tax={quote.tax}
      taxRate={quote.taxRate}
      total={quote.total}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

const EditableRow: FC<{ quoteId: string; index: number; item: LineItem }> = (
  { quoteId, index, item },
) => {
  const isText = item.type === "text";
  return (
    <tr class="qli-row">
      <td class="qli-cell qli-cell--type">
        <span class="badge badge--sm">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
      </td>
      <ReadCell
        quoteId={quoteId}
        index={index}
        field="description"
        value={item.description ?? ""}
      />
      {isText
        ? (
          <>
            <td class="qli-cell qli-cell--right qli-cell--inert" />
            <td class="qli-cell qli-cell--right qli-cell--inert" />
          </>
        )
        : (
          <>
            <ReadCell
              quoteId={quoteId}
              index={index}
              field="quantity"
              value={lineItemFieldValue(item, "quantity")}
              align="right"
            />
            <ReadCell
              quoteId={quoteId}
              index={index}
              field="unitRate"
              value={lineItemFieldValue(item, "unitRate")}
              align="right"
            />
          </>
        )}
      <LineItemAmountCell index={index} amount={item.amount} />
      <td class="qli-cell qli-cell--actions">
        <button
          type="button"
          class="btn btn--danger btn--sm qli-delete"
          aria-label="Delete line item"
          hx-delete={`/quotes/${quoteId}/line-items/${index}`}
          hx-target="#quote-line-items-section"
          hx-swap="outerHTML"
          hx-confirm="Delete this line item?"
          data-confirm-title="Delete Line Item"
          data-confirm-label="Delete"
        >
          &times;
        </button>
      </td>
    </tr>
  );
};

/** Full editable line-items section — re-rendered on every add/remove. */
export const QuoteLineItemsSection: FC<{ quote: Quote }> = ({ quote }) => (
  <section class="detail-section" id="quote-line-items-section">
    <h2 class="section-heading">Line Items</h2>
    <div class="line-items-table__wrapper">
      <table class="line-items-table qli-table">
        <thead>
          <tr>
            <th scope="col" class="line-items-table__th">Type</th>
            <th scope="col" class="line-items-table__th">Description</th>
            <th
              scope="col"
              class="line-items-table__th line-items-table__th--right"
            >
              Qty
            </th>
            <th
              scope="col"
              class="line-items-table__th line-items-table__th--right"
            >
              Rate
            </th>
            <th
              scope="col"
              class="line-items-table__th line-items-table__th--right"
            >
              Amount
            </th>
            <th scope="col" class="line-items-table__th" />
          </tr>
        </thead>
        <tbody>
          {quote.lineItems.map((item, index) => (
            <EditableRow
              key={item.id || index}
              quoteId={quote.id}
              index={index}
              item={item}
            />
          ))}
        </tbody>
      </table>
    </div>
    <button
      type="button"
      class="btn btn--secondary btn--sm qli-add"
      hx-post={`/quotes/${quote.id}/line-items`}
      hx-target="#quote-line-items-section"
      hx-swap="outerHTML"
    >
      + Add row
    </button>
    <QuoteTotals quote={quote} />
  </section>
);
