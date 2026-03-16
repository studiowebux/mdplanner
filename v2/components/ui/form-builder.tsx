import type { FC } from "hono/jsx";
import { Sidenav } from "./sidenav.tsx";

type Option = { value: string; label: string };

export type FieldDef =
  | { type: "hidden"; id: string }
  | { type: "text"; id: string; label: string; required?: boolean; placeholder?: string }
  | { type: "number"; id: string; label: string; required?: boolean; min?: number; max?: number }
  | { type: "date"; id: string; label: string; required?: boolean }
  | { type: "select"; id: string; label: string; options: Option[]; required?: boolean }
  | { type: "textarea"; id: string; label: string; rows?: number; required?: boolean }
  | { type: "autocomplete"; id: string; label: string; sourceUrl: string; displayKey?: string; valueKey?: string; required?: boolean; placeholder?: string };

type Props = {
  id: string;
  title: string;
  fields: FieldDef[];
  submitLabel?: string;
};

const Field: FC<{ def: FieldDef }> = ({ def }) => {
  if (def.type === "hidden") {
    return <input type="hidden" id={def.id} />;
  }

  return (
    <div class="form__field">
      <label class="form__label" for={def.id}>{def.label}</label>
      {def.type === "text" && (
        <input
          type="text"
          id={def.id}
          class="form__input"
          required={def.required}
          placeholder={def.placeholder}
          autocomplete="off"
        />
      )}
      {def.type === "number" && (
        <input
          type="number"
          id={def.id}
          class="form__input"
          required={def.required}
          min={def.min}
          max={def.max}
          autocomplete="off"
        />
      )}
      {def.type === "date" && (
        <input
          type="date"
          id={def.id}
          class="form__input"
          required={def.required}
        />
      )}
      {def.type === "select" && (
        <select id={def.id} class="form__select" required={def.required}>
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {def.type === "textarea" && (
        <textarea
          id={def.id}
          class="form__textarea"
          rows={def.rows ?? 4}
          required={def.required}
        />
      )}
      {def.type === "autocomplete" && (
        <div class="form__autocomplete">
          <input
            type="text"
            id={`${def.id}-search`}
            class="form__input"
            placeholder={def.placeholder ?? "Search..."}
            autocomplete="off"
            data-autocomplete-source={def.sourceUrl}
            data-autocomplete-display={def.displayKey ?? "name"}
            data-autocomplete-value={def.valueKey ?? "id"}
            data-autocomplete-target={def.id}
          />
          <input type="hidden" id={def.id} required={def.required} />
          <ul class="form__autocomplete-list" id={`${def.id}-results`} />
        </div>
      )}
    </div>
  );
};

export const FormBuilder: FC<Props> = ({ id, title, fields, submitLabel }) => (
  <Sidenav id={id} title={title}>
    <form id={`${id}-body`} class="form">
      {fields.map((def) => <Field key={def.id} def={def} />)}
      <div class="form__actions">
        <button type="submit" class="btn btn--primary">{submitLabel ?? "Save"}</button>
      </div>
    </form>
  </Sidenav>
);
