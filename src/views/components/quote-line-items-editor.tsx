// Editable quote line-items table — Excel-like click-to-edit cells.
// Quote-only (draft status); the shared read-only LineItemsTable handles
// non-draft quotes and invoices. Cells are addressed by array index; every
// mutation re-renders the whole section so indices stay consistent.

import type { FC } from "hono/jsx";
import type { Quote } from "../../types/quote.types.ts";
import type { LineItem } from "../../types/billing.types.ts";
import { LINE_ITEM_TYPES } from "../../types/billing.types.ts";
import { formatCurrency } from "../../utils/format.ts";
import { BillingTotals } from "./billing-totals.tsx";
import { groupSubtotal } from "./line-items-table.tsx";

/** Fields the inline editor allows editing. Unit/discount stay in sidenav. */
export const EDITABLE_LINE_ITEM_FIELDS = [
  "description",
  "quantity",
  "unitRate",
  "group",
  "type",
] as const;

export type EditableLineItemField = (typeof EDITABLE_LINE_ITEM_FIELDS)[number];

/** Display string for an editable field's current value. */
export function lineItemFieldValue(
  item: LineItem,
  field: EditableLineItemField,
): string {
  if (field === "description") return item.description ?? "";
  if (field === "group") return item.group ?? "";
  if (field === "type") return item.type ?? "service";
  const v = item[field as "quantity" | "unitRate"];
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
  const numeric = field !== "description" && field !== "group";
  const isGroup = field === "group";
  const postUrl = `/quotes/${quoteId}/line-items/${index}?field=${field}`;
  // Group saves re-render the whole section (grouping reshuffles rows).
  const hxTarget = isGroup ? "#quote-line-items-section" : "closest td";
  const hxSwap = isGroup ? "outerHTML" : "outerHTML";
  return (
    <td class="qli-cell qli-cell--editing">
      <input
        id={`qli-${index}-${field}`}
        class="qli-input"
        type="text"
        inputmode={numeric ? "decimal" : undefined}
        list={isGroup ? `qli-groups-${quoteId}` : undefined}
        name="value"
        value={value}
        autofocus
        autocomplete="off"
        data-quadrant-edit={postUrl}
        hx-post={postUrl}
        hx-target={hxTarget}
        hx-swap={hxSwap}
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

/** Editing cell for the type field — datalist with built-ins + custom types already in the quote. */
export const EditTypeCell: FC<{
  quoteId: string;
  index: number;
  value: string;
  distinctTypes: string[];
}> = ({ quoteId, index, value, distinctTypes }) => {
  const postUrl = `/quotes/${quoteId}/line-items/${index}?field=type`;
  const listId = `qli-types-${quoteId}`;
  return (
    <td class="qli-cell qli-cell--editing qli-cell--type">
      <input
        id={`qli-${index}-type`}
        class="qli-input qli-input--type"
        type="text"
        list={listId}
        name="value"
        value={value}
        autofocus
        autocomplete="off"
        data-quadrant-edit={postUrl}
        hx-post={postUrl}
        hx-target="#quote-line-items-section"
        hx-swap="outerHTML"
        hx-trigger="quadrant-save"
      />
      <datalist id={listId}>
        {LINE_ITEM_TYPES.map((t) => <option key={t} value={t} />)}
        {distinctTypes
          .filter((t) => !(LINE_ITEM_TYPES as readonly string[]).includes(t))
          .map((t) => <option key={t} value={t} />)}
      </datalist>
      <button
        type="button"
        class="quadrant-card__save btn btn--primary btn--sm is-hidden"
        data-quadrant-save-for={`qli-${index}-type`}
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

const EditableRow: FC<{
  quoteId: string;
  index: number;
  item: LineItem;
  total: number;
  distinctTypes: string[];
}> = (
  { quoteId, index, item, total, distinctTypes },
) => {
  const isText = item.type === "text";
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <tr class="qli-row">
      <td
        class="qli-cell qli-cell--type"
        hx-get={`/quotes/${quoteId}/line-items/${index}/edit?field=type`}
        hx-target="this"
        hx-swap="outerHTML"
        title="Click to change type"
      >
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
      <ReadCell
        quoteId={quoteId}
        index={index}
        field="group"
        value={item.group ?? ""}
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
          class="btn btn--ghost btn--sm qli-move"
          aria-label="Move up"
          disabled={isFirst}
          hx-post={`/quotes/${quoteId}/line-items/${index}/move?dir=up`}
          hx-target="#quote-line-items-section"
          hx-swap="outerHTML"
        >
          ↑
        </button>
        <button
          type="button"
          class="btn btn--ghost btn--sm qli-move"
          aria-label="Move down"
          disabled={isLast}
          hx-post={`/quotes/${quoteId}/line-items/${index}/move?dir=down`}
          hx-target="#quote-line-items-section"
          hx-swap="outerHTML"
        >
          ↓
        </button>
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

/** Group line items by group field, preserving original array indices. */
function groupByIndex(
  items: LineItem[],
): { group: string | null; rows: { item: LineItem; index: number }[] }[] {
  const groups: {
    group: string | null;
    rows: { item: LineItem; index: number }[];
  }[] = [];
  let currentGroup: string | null = null;
  let currentRows: { item: LineItem; index: number }[] = [];

  items.forEach((item, index) => {
    const g = item.group ?? null;
    if (g !== currentGroup) {
      if (currentRows.length > 0) {
        groups.push({ group: currentGroup, rows: currentRows });
      }
      currentGroup = g;
      currentRows = [{ item, index }];
    } else {
      currentRows.push({ item, index });
    }
  });
  if (currentRows.length > 0) {
    groups.push({ group: currentGroup, rows: currentRows });
  }
  return groups;
}

/** Full editable line-items section — re-rendered on every add/remove. */
export const QuoteLineItemsSection: FC<{ quote: Quote }> = ({ quote }) => {
  const groups = groupByIndex(quote.lineItems);
  const showGroupSubtotals = groups.length > 1 &&
    groups.some(({ group }) => group !== null);
  const distinctGroups = [
    ...new Set(
      quote.lineItems.map((li) => li.group).filter((g): g is string => !!g),
    ),
  ];
  const distinctTypes = [
    ...new Set(quote.lineItems.map((li) => li.type).filter(Boolean)),
  ];
  return (
    <section class="detail-section" id="quote-line-items-section">
      <h2 class="section-heading">Line Items</h2>
      {distinctGroups.length > 0 && (
        <datalist id={`qli-groups-${quote.id}`}>
          {distinctGroups.map((g) => <option key={g} value={g} />)}
        </datalist>
      )}
      <div class="line-items-table__wrapper">
        <table class="line-items-table qli-table">
          <thead>
            <tr>
              <th scope="col" class="line-items-table__th">Type</th>
              <th scope="col" class="line-items-table__th">Description</th>
              <th scope="col" class="line-items-table__th">Group</th>
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
                Unit Price
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
            {groups.map(({ group, rows }) => (
              <>
                {group && (
                  <tr class="line-items-table__group-header">
                    <td colSpan={7} class="line-items-table__group-label">
                      {group}
                    </td>
                  </tr>
                )}
                {rows.map(({ item, index }) => (
                  <EditableRow
                    key={item.id || index}
                    quoteId={quote.id}
                    index={index}
                    item={item}
                    total={quote.lineItems.length}
                    distinctTypes={distinctTypes}
                  />
                ))}
                {showGroupSubtotals && group && (
                  <tr class="line-items-table__group-subtotal">
                    <td
                      colSpan={5}
                      class="line-items-table__group-subtotal-label"
                    >
                      {group} subtotal
                    </td>
                    <td class="line-items-table__amount line-items-table__group-subtotal-amount">
                      {formatCurrency(groupSubtotal(rows.map((r) => r.item))) ||
                        "$0"}
                    </td>
                    <td class="qli-cell qli-cell--actions" />
                  </tr>
                )}
              </>
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
};
