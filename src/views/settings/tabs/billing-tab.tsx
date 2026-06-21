import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import type { PublicProjectConfig } from "../../../types/project.types.ts";

type BillingTabProps = {
  config: PublicProjectConfig;
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
        <label class="settings-field__label" for="cfg-billing-email">
          Contact email
        </label>
        <input
          type="text"
          id="cfg-billing-email"
          name="billingEmail"
          value={config.billingEmail ?? ""}
          placeholder="billing@example.com"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Shown on quotes and invoices.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-billing-phone">
          Contact phone
        </label>
        <input
          type="text"
          id="cfg-billing-phone"
          name="billingPhone"
          value={config.billingPhone ?? ""}
          placeholder="+1 514-555-0100"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Shown on quotes and invoices.
        </span>
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

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-billing-tax-number">
          Tax number
        </label>
        <input
          type="text"
          id="cfg-billing-tax-number"
          name="billingTaxNumber"
          value={config.billingTaxNumber ?? ""}
          placeholder="GST 123456789 RT 0001"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Shown on quotes and invoices (e.g. GST/HST, TVQ, VAT).
        </span>
      </div>

      <div class="settings-field">
        <label
          class="settings-field__label"
          for="cfg-billing-business-number"
        >
          Business number
        </label>
        <input
          type="text"
          id="cfg-billing-business-number"
          name="billingBusinessNumber"
          value={config.billingBusinessNumber ?? ""}
          placeholder="1234567890"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Business registration number shown on quotes and invoices.
        </span>
      </div>

      <FormActions />
    </form>
  </div>
);
