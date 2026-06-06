// Domain form factory — builds a create/edit FormBuilder component from a field
// set. Leaf module: depends only on the form-builder UI + shared types.

import type { FC } from "hono/jsx";
import { FormBuilder } from "../components/ui/form-builder.tsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import { type Entity } from "./domain.types.ts";

/** Factory: builds a domain create/edit FormBuilder FC from a FieldDef set; hides inlineEditFields and applies formValueOverrides in edit mode. */
export function createDomainForm<T extends Entity>(cfg: {
  domain: string;
  singular: string;
  fields: FieldDef[];
  idField?: string;
  /** Field names edited in-place on the detail page — hidden from the edit form. */
  inlineEditFields?: string[];
  /** Edit-mode value override hook (see DomainConfig.formValueOverrides). */
  formValueOverrides?: (item: T) => Record<string, string>;
}) {
  const DomainForm: FC<{
    item?: T;
    displayValues?: Record<string, string>;
    arrayDisplayValues?: Record<string, Record<string, string>[]>;
    dynamicOptions?: Record<string, { value: string; label: string }[]>;
    prefillValues?: Record<string, string>;
  }> = (
    { item, displayValues, arrayDisplayValues, dynamicOptions, prefillValues },
  ) => {
    const isEdit = !!item;
    const id = isEdit ? item[cfg.idField ?? "id"] : undefined;
    const values: Record<string, string> = {};
    if (item) {
      for (const f of cfg.fields) {
        const raw = item[f.name as keyof T];
        if (f.type === "textarea" && Array.isArray(raw)) {
          values[f.name] = raw.join("\n");
        } else if (f.type === "tags" && Array.isArray(raw)) {
          values[f.name] = raw.join(",");
        } else if (f.type === "array-table" && Array.isArray(raw)) {
          values[f.name] = JSON.stringify(raw);
        } else {
          values[f.name] = String(raw ?? "");
        }
      }
    }
    // Apply domain-supplied overrides — replace keys after the default
    // item-to-string fill (e.g. reshape `string[]` into array-table JSON).
    if (isEdit && item && cfg.formValueOverrides) {
      Object.assign(values, cfg.formValueOverrides(item));
    }
    // Merge resolved values into form values — covers nested fields
    // (e.g. billingAddress.street → street) that don't exist on the entity root.
    if (displayValues) {
      for (const [k, v] of Object.entries(displayValues)) {
        if (!values[k]) values[k] = v;
      }
    }
    // In edit mode, drop fields edited in-place on the detail page.
    const inline = cfg.inlineEditFields;
    const formFields = isEdit && inline && inline.length > 0
      ? cfg.fields.filter((f) =>
        f.type === "hidden" || !inline.includes(f.name)
      )
      : cfg.fields;
    // Override select options with config-driven values when provided.
    const fields = dynamicOptions
      ? formFields.map((f) =>
        f.type === "select" && dynamicOptions[f.name]
          ? { ...f, options: dynamicOptions[f.name] }
          : f
      )
      : formFields;
    return (
      <FormBuilder
        id={`${cfg.domain}-form`}
        title={isEdit ? `Edit ${cfg.singular}` : `Create ${cfg.singular}`}
        fields={fields}
        values={isEdit ? values : prefillValues}
        displayValues={displayValues}
        arrayDisplayValues={arrayDisplayValues}
        action={isEdit ? `/${cfg.domain}/${id}/edit` : `/${cfg.domain}/new`}
        method="post"
        open
      />
    );
  };

  return DomainForm;
}
