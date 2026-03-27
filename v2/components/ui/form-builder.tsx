import type { FC } from "hono/jsx";
import { Sidenav } from "./sidenav.tsx";

type Option = { value: string; label: string };

/** Field definition for a single column within an array-table row. */
export type ArrayTableItemField =
  | { type: "text"; name: string; label: string; placeholder?: string }
  | { type: "number"; name: string; label: string; min?: number; max?: number }
  | { type: "date"; name: string; label: string }
  | { type: "select"; name: string; label: string; options: Option[] }
  | {
    type: "textarea";
    name: string;
    label: string;
    rows?: number;
    placeholder?: string;
  };

export type FieldDef =
  | { type: "hidden"; name: string }
  | {
    type: "text";
    name: string;
    label: string;
    required?: boolean;
    placeholder?: string;
  }
  | {
    type: "number";
    name: string;
    label: string;
    required?: boolean;
    min?: number;
    max?: number;
  }
  | { type: "date"; name: string; label: string; required?: boolean }
  | {
    type: "select";
    name: string;
    label: string;
    options: Option[];
    required?: boolean;
  }
  | {
    type: "textarea";
    name: string;
    label: string;
    rows?: number;
    required?: boolean;
  }
  | {
    type: "autocomplete";
    name: string;
    label: string;
    source: string;
    required?: boolean;
    placeholder?: string;
    /** Allow free text alongside suggestions. Typed text syncs to hidden input. */
    freetext?: boolean;
  }
  | {
    type: "tags";
    name: string;
    label: string;
    required?: boolean;
    /** Autocomplete source for suggestions. Omit for freetext-only tags. */
    source?: string;
    placeholder?: string;
  }
  | {
    type: "array-table";
    name: string;
    label: string;
    /** Unique section key used in input names: `{section}[{idx}].{field}`. */
    section: string;
    /** Field definitions for each row (flat types only: text, number, date, select). */
    itemFields: ArrayTableItemField[];
    /** Label for the add button. Defaults to "Add {label}". */
    addLabel?: string;
  };

type Props = {
  id: string;
  title: string;
  fields: FieldDef[];
  values?: Record<string, string>;
  /** Display overrides for autocomplete search inputs (show name, store ID). */
  displayValues?: Record<string, string>;
  submitLabel?: string;
  action: string;
  method: "post" | "put";
  open?: boolean;
};

const fieldId = (formId: string, name: string) => `${formId}-${name}`;

// ---------------------------------------------------------------------------
// Array-table helpers — render structured object arrays as editable rows
// ---------------------------------------------------------------------------

const ArrayTableRowField: FC<
  { section: string; idx: number; field: ArrayTableItemField; value?: string }
> = ({ section, idx, field, value }) => {
  const name = `${section}[${idx}].${field.name}`;
  return (
    <div class="array-table__field">
      <label class="array-table__field-label">{field.label}</label>
      {field.type === "text" && (
        <input
          type="text"
          name={name}
          class="form__input"
          value={value ?? ""}
          placeholder={field.placeholder}
          autocomplete="do-not-autofill"
        />
      )}
      {field.type === "number" && (
        <input
          type="number"
          name={name}
          class="form__input"
          value={value ?? ""}
          min={field.min}
          max={field.max}
          autocomplete="off"
        />
      )}
      {field.type === "date" && (
        <input
          type="date"
          name={name}
          class="form__input"
          value={value ?? ""}
        />
      )}
      {field.type === "select" && (
        <select name={name} class="form__select">
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value} selected={value === o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {field.type === "textarea" && (
        <textarea
          name={name}
          class="form__textarea"
          rows={field.rows ?? 2}
          placeholder={field.placeholder}
        >
          {value ?? ""}
        </textarea>
      )}
    </div>
  );
};

const ArrayTableRow: FC<
  {
    section: string;
    idx: number;
    itemFields: ArrayTableItemField[];
    rowData?: Record<string, unknown>;
  }
> = ({ section, idx, itemFields, rowData }) => (
  <div class="array-table__row">
    <div class="array-table__row-fields">
      {itemFields.map((field) => (
        <ArrayTableRowField
          key={field.name}
          section={section}
          idx={idx}
          field={field}
          value={rowData ? String(rowData[field.name] ?? "") : ""}
        />
      ))}
    </div>
    <button
      type="button"
      class="array-table__remove"
      aria-label="Remove row"
      hx-on--click="this.closest('.array-table__row').remove()"
    >
      &times;
    </button>
  </div>
);

/** Exported for use by the array-row server endpoint (task 2). */
export { ArrayTableRow, ArrayTableRowField };

const Field: FC<
  { formId: string; def: FieldDef; value?: string; displayValue?: string }
> = (
  { formId, def, value, displayValue },
) => {
  const id = fieldId(formId, def.name);

  if (def.type === "hidden") {
    return <input type="hidden" id={id} name={def.name} value={value ?? ""} />;
  }

  return (
    <div class="form__field">
      <label class="form__label" for={id}>
        {def.label}
        {"required" in def && def.required && (
          <span class="form__required" aria-hidden="true">*</span>
        )}
      </label>
      {def.type === "text" && (
        <input
          type="text"
          id={id}
          name={def.name}
          class="form__input"
          required={def.required}
          placeholder={def.placeholder}
          value={value ?? ""}
          autocomplete="do-not-autofill"
        />
      )}
      {def.type === "number" && (
        <input
          type="number"
          id={id}
          name={def.name}
          class="form__input"
          required={def.required}
          min={def.min}
          max={def.max}
          value={value ?? ""}
          autocomplete="off"
        />
      )}
      {def.type === "date" && (
        <input
          type="date"
          id={id}
          name={def.name}
          class="form__input"
          required={def.required}
          value={value ?? ""}
        />
      )}
      {def.type === "select" && (
        <select
          id={id}
          name={def.name}
          class="form__select"
          required={def.required}
        >
          {def.options.map((o) => (
            <option key={o.value} value={o.value} selected={value === o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {def.type === "textarea" && (
        <textarea
          id={id}
          name={def.name}
          class="form__textarea"
          rows={def.rows ?? 4}
          required={def.required}
        >
          {value ?? ""}
        </textarea>
      )}
      {def.type === "autocomplete" && (
        <div class="form__autocomplete">
          <input
            type="text"
            id={`${id}-search`}
            class="form__input"
            placeholder={def.placeholder ?? "Search..."}
            value={displayValue ?? value ?? ""}
            autocomplete="off"
            name="q"
            data-autocomplete-target={id}
            {...(def.freetext ? { "data-freetext": "true" } : {})}
            hx-get={`/autocomplete/${def.source}`}
            hx-trigger="input changed delay:150ms, focus"
            hx-target={`#${id}-results`}
            hx-swap="innerHTML"
          />
          <input
            type="hidden"
            id={id}
            name={def.name}
            value={value ?? ""}
            required={def.required}
          />
          <ul class="form__autocomplete-list" id={`${id}-results`} />
        </div>
      )}
      {def.type === "tags" && (() => {
        const tags = (value ?? "").split(",").map((s) => s.trim()).filter(
          Boolean,
        );
        return (
          <div class="form__tags" data-tags-field={id}>
            <div class="form__tags-pills" id={`${id}-pills`}>
              {tags.map((tag) => (
                <span key={tag} class="form__tags-pill" data-tag-value={tag}>
                  {tag}
                  <button
                    type="button"
                    class="form__tags-pill-remove"
                    data-tag-remove={tag}
                    aria-label={`Remove ${tag}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              id={`${id}-input`}
              class="form__input form__tags-input"
              placeholder={def.placeholder ?? "Type and press Enter..."}
              autocomplete="off"
              name="q"
              data-tags-target={id}
              {...(def.source
                ? {
                  "hx-get": `/autocomplete/${def.source}`,
                  "hx-trigger": "input changed delay:150ms, focus",
                  "hx-target": `#${id}-results`,
                  "hx-swap": "innerHTML",
                }
                : {})}
            />
            <input
              type="hidden"
              id={id}
              name={def.name}
              value={value ?? ""}
            />
            {def.source && (
              <ul class="form__autocomplete-list" id={`${id}-results`} />
            )}
          </div>
        );
      })()}
      {def.type === "array-table" && (() => {
        const items: Record<string, unknown>[] = (() => {
          if (!value) return [];
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const rowsId = `${id}-rows`;
        return (
          <div class="array-table" data-array-table={def.section}>
            <div class="array-table__rows" id={rowsId}>
              {items.map((rowData, idx) => (
                <ArrayTableRow
                  key={idx}
                  section={def.section}
                  idx={idx}
                  itemFields={def.itemFields}
                  rowData={rowData}
                />
              ))}
            </div>
            <button
              type="button"
              class="btn btn--secondary btn--sm array-table__add"
              hx-get={`/forms/array-row/${def.section}`}
              hx-target={`#${rowsId}`}
              hx-swap="beforeend"
            >
              {def.addLabel ?? `Add ${def.label}`}
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export const FormBuilder: FC<Props> = (
  {
    id,
    title,
    fields,
    values,
    displayValues,
    submitLabel,
    action,
    method,
    open,
  },
) => (
  <Sidenav id={id} title={title} open={open}>
    <form
      id={`${id}-body`}
      class="form"
      {...{ [`hx-${method}`]: action }}
      hx-swap="none"
    >
      {fields.map((def) => (
        <Field
          key={def.name}
          formId={id}
          def={def}
          value={values?.[def.name]}
          displayValue={displayValues?.[def.name]}
        />
      ))}
      <div class="form__actions">
        <button type="submit" class="btn btn--primary">
          {submitLabel ?? "Save"}
        </button>
      </div>
    </form>
  </Sidenav>
);
