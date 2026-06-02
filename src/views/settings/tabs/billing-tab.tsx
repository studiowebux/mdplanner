import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import type { ProjectConfig } from "../../../types/project.types.ts";

type BillingTabProps = {
  config: ProjectConfig;
};

export const BillingTab: FC<BillingTabProps> = ({ config }) => (
  <div class="settings-tabs__panel settings-tabs__panel--billing">
    <form
      id="billing-form"
      hx-post="/settings/billing"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div class="settings-field">
        <label class="settings-field__label" for="cfg-billing-company">
          Company name
        </label>
        <input
          type="text"
          id="cfg-billing-company"
          name="billingCompany"
          value={config.billingCompany ?? ""}
          placeholder="Acme Corp"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Shown in the header of all quotes and invoices.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-billing-address">
          Company address
        </label>
        <textarea
          id="cfg-billing-address"
          name="billingAddress"
          class="settings-field__textarea"
          rows={3}
          placeholder="123 Main St&#10;City, Province  A1B 2C3"
        >
          {config.billingAddress ?? ""}
        </textarea>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-billing-logo">
          Logo URL
        </label>
        <input
          type="text"
          id="cfg-billing-logo"
          name="billingLogoUrl"
          value={config.billingLogoUrl ?? ""}
          placeholder="https://example.com/logo.png"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Displayed in the top-left of quotes and invoices.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-billing-footer">
          Default footer
        </label>
        <textarea
          id="cfg-billing-footer"
          name="billingDefaultFooter"
          class="settings-field__textarea"
          rows={3}
          placeholder="Thank you for your business."
        >
          {config.billingDefaultFooter ?? ""}
        </textarea>
        <span class="settings-field__hint">
          Shown at the bottom of every quote and invoice. Overridden
          per-document when a document-level footer is set.
        </span>
      </div>

      <FormActions />
    </form>
  </div>
);
