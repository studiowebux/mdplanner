// Autocomplete widget — shared by FormBuilder (Field) and ArrayTableRowField.
// Renders the search input, hidden value input, and results list.

import type { FC } from "hono/jsx";

export type AutocompleteWidgetProps = {
  id: string;
  name: string;
  source: string;
  value?: string;
  displayValue?: string;
  placeholder?: string;
  required?: boolean;
  freetext?: boolean;
  /**
   * Map from data-autofill attribute keys (returned on <li> items)
   * to sibling field names within the same array-table row.
   * Example: `{ unit: "unit", rate: "unitRate" }` fills the row's
   * unit and unitRate fields when a rate is selected.
   */
  autofillMap?: Record<string, string>;
};

export const AutocompleteWidget: FC<AutocompleteWidgetProps> = ({
  id,
  name,
  source,
  value,
  displayValue,
  placeholder,
  required,
  freetext,
  autofillMap,
}) => {
  const autofillJson = autofillMap ? JSON.stringify(autofillMap) : undefined;
  return (
    <div class="form__autocomplete">
      <input
        type="text"
        id={`${id}-search`}
        class="form__input"
        placeholder={placeholder ?? "Search..."}
        value={displayValue ?? value ?? ""}
        autocomplete="off"
        name="q"
        data-autocomplete-target={id}
        {...(freetext ? { "data-freetext": "true" } : {})}
        {...(autofillJson ? { "data-autofill-map": autofillJson } : {})}
        hx-get={`/autocomplete/${source}`}
        hx-trigger="input changed delay:150ms, focus"
        hx-target={`#${id}-results`}
        hx-swap="innerHTML"
      />
      <input
        type="hidden"
        id={id}
        name={name}
        value={value ?? ""}
        required={required}
      />
      <ul class="form__autocomplete-list" id={`${id}-results`} />
    </div>
  );
};
