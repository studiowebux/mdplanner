// Shared line items table — used by Quote and Invoice detail views.
// Groups items by group field, handles all line types (service/product/expense/text).

import type { FC } from "hono/jsx";
import type { LineItem } from "../../types/billing.types.ts";
import { formatCurrency } from "../../utils/format.ts";

type LineItemsTableProps = {
  items: LineItem[];
  showOptional?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  service: "Service",
  product: "Product",
  expense: "Expense",
  text: "",
};

function formatDiscount(item: LineItem): string {
  if (!item.discount) return "";
  if (item.discountType === "percent") return `${item.discount}%`;
  return formatCurrency(item.discount) || "";
}

function formatQty(item: LineItem): string {
  if (item.type === "text" || item.quantity == null) return "";
  const unit = item.unit ? `\u00a0${item.unit}` : "";
  return `${item.quantity}${unit}`;
}

/** Group line items by their `group` field, preserving order. */
function groupItems(
  items: LineItem[],
): { group: string | null; items: LineItem[] }[] {
  const groups: { group: string | null; items: LineItem[] }[] = [];
  let currentGroup: string | null = null;
  let currentItems: LineItem[] = [];

  for (const item of items) {
    const g = item.group ?? null;
    if (g !== currentGroup) {
      if (currentItems.length > 0) {
        groups.push({ group: currentGroup, items: currentItems });
      }
      currentGroup = g;
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  }
  if (currentItems.length > 0) {
    groups.push({ group: currentGroup, items: currentItems });
  }
  return groups;
}

const LineItemRow: FC<{ item: LineItem; showOptional?: boolean }> = ({
  item,
  showOptional,
}) => {
  const isText = item.type === "text";
  const isOptional = item.optional && showOptional;
  const rowClass = [
    "line-items-table__row",
    isText ? "line-items-table__row--text" : "",
    isOptional ? "line-items-table__row--optional" : "",
  ].filter(Boolean).join(" ");

  if (isText) {
    return (
      <tr class={rowClass}>
        <td colSpan={6} class="line-items-table__description">
          {item.description}
        </td>
      </tr>
    );
  }

  return (
    <tr class={rowClass}>
      <td class="line-items-table__type">
        <span class="badge badge--sm">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
      </td>
      <td class="line-items-table__description">
        {item.description}
        {isOptional && (
          <span class="line-items-table__optional-tag">Optional</span>
        )}
      </td>
      <td class="line-items-table__qty">{formatQty(item)}</td>
      <td class="line-items-table__rate">
        {item.unitRate != null ? formatCurrency(item.unitRate) : ""}
      </td>
      <td class="line-items-table__discount">{formatDiscount(item)}</td>
      <td class="line-items-table__amount">
        {formatCurrency(item.amount) || ""}
      </td>
    </tr>
  );
};

export const LineItemsTable: FC<LineItemsTableProps> = (
  { items, showOptional },
) => {
  if (!items || items.length === 0) return null;

  const visibleItems = showOptional ? items : items.filter((i) => !i.optional);

  const groups = groupItems(visibleItems);

  return (
    <div class="line-items-table__wrapper">
      <table class="line-items-table">
        <thead>
          <tr>
            <th class="line-items-table__th">Type</th>
            <th class="line-items-table__th">Description</th>
            <th class="line-items-table__th line-items-table__th--right">
              Qty
            </th>
            <th class="line-items-table__th line-items-table__th--right">
              Rate
            </th>
            <th class="line-items-table__th line-items-table__th--right">
              Discount
            </th>
            <th class="line-items-table__th line-items-table__th--right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ group, items: groupItems }) => (
            <>
              {group && (
                <tr class="line-items-table__group-header">
                  <td colSpan={6} class="line-items-table__group-label">
                    {group}
                  </td>
                </tr>
              )}
              {groupItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  showOptional={showOptional}
                />
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};
