import type { FC } from "hono/jsx";
import { Sidenav } from "./sidenav.tsx";

type Option = { value: string; label: string };

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
    sourceUrl: string;
    displayKey?: string;
    valueKey?: string;
    required?: boolean;
    placeholder?: string;
  };

type Props = {
  id: string;
  title: string;
  fields: FieldDef[];
  values?: Record<string, string>;
  submitLabel?: string;
  action: string;
  method: "post" | "put";
  open?: boolean;
};

const fieldId = (formId: string, name: string) => `${formId}-${name}`;

const Field: FC<{ formId: string; def: FieldDef; value?: string }> = (
  { formId, def, value },
) => {
  const id = fieldId(formId, def.name);

  if (def.type === "hidden") {
    return <input type="hidden" id={id} name={def.name} value={value ?? ""} />;
  }

  return (
    <div class="form__field">
      <label class="form__label" for={id}>
        {def.label}
        {def.required && (
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
            value={value ?? ""}
            autocomplete="off"
            data-autocomplete-source={def.sourceUrl}
            data-autocomplete-display={def.displayKey ?? "name"}
            data-autocomplete-value={def.valueKey ?? "name"}
            data-autocomplete-target={id}
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
    </div>
  );
};

export const FormBuilder: FC<Props> = (
  { id, title, fields, values, submitLabel, action, method, open },
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
