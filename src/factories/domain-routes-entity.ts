// Domain entity routes — single-record endpoints: create/edit forms + submits,
// (soft) delete, archive restore/destroy, and the detail view. Split from the
// domain route factory.

import type { Hono } from "hono";
import { hxTrigger } from "../utils/hx-trigger.ts";
import { toHtml } from "../utils/html.ts";
import { viewProps } from "../middleware/view-props.ts";
import type { AppVariables } from "../types/app.ts";
import { type DomainConfig, type Entity } from "./domain.types.ts";
import { createDomainForm } from "./domain-view.tsx";

type Router = Hono<{ Variables: AppVariables }>;

/** Form, mutation, archive, and detail routes for a single domain record. */
export function registerEntityRoutes<T extends Entity, C, U>(
  router: Router,
  cfg: DomainConfig<T, C, U>,
  opts: { archiveEnabled: boolean },
) {
  const { archiveEnabled } = opts;
  const DomainForm = createDomainForm<T>({
    domain: cfg.name,
    singular: cfg.singular,
    fields: cfg.formFields,
    inlineEditFields: cfg.inlineEditFields,
    formValueOverrides: cfg.formValueOverrides,
  });

  // Empty create form — query params forwarded as prefillValues for hidden fields
  router.get("/new", async (c) => {
    const dynamicOptions = await cfg.extractFormOptions?.();
    const query = c.req.query();
    const prefillValues = Object.keys(query).length > 0 ? query : undefined;
    return c.html(
      toHtml(DomainForm({ dynamicOptions, prefillValues })),
    );
  });

  // Create submission
  router.post("/new", async (c) => {
    const body = await c.req.parseBody();
    try {
      const data = cfg.parseCreate(body as Record<string, string | File>);
      const actor = c.get("actor");
      if (actor && actor.source !== "anonymous") {
        (data as Record<string, unknown>).createdBy = actor.name;
        (data as Record<string, unknown>).updatedBy = actor.name;
      }
      const created = await cfg.getService().create(data);
      const headers: Record<string, string> = {
        "HX-Trigger": hxTrigger("success", `${cfg.singular} created`),
      };
      if (cfg.createRedirect) {
        headers["HX-Redirect"] = cfg.createRedirect(created);
      }
      return new Response(null, { status: 204, headers });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : `Failed to create ${cfg.singular.toLowerCase()}`;
      return new Response(null, {
        status: 422,
        headers: { "HX-Trigger": hxTrigger("error", message) },
      });
    }
  });

  // Populated edit form
  router.get("/:id/edit", async (c) => {
    const id = c.req.param("id");
    const item = await cfg.getService().getById(id);
    if (!item) return c.notFound();
    let displayValues: Record<string, string> | undefined;
    if (cfg.resolveFormValues) {
      const raw: Record<string, string> = {};
      for (const f of cfg.formFields) {
        raw[f.name] = String((item as Record<string, unknown>)[f.name] ?? "");
      }
      displayValues = await cfg.resolveFormValues(raw);
    }
    const arrayDisplayValues = await cfg.resolveArrayDisplayValues?.(item);
    const dynamicOptions = await cfg.extractFormOptions?.();
    return c.html(
      toHtml(DomainForm({
        item,
        displayValues,
        arrayDisplayValues,
        dynamicOptions,
      })),
    );
  });

  // Update submission
  router.post("/:id/edit", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    try {
      const data = cfg.parseUpdate(body as Record<string, string | File>);
      const actor = c.get("actor");
      if (actor && actor.source !== "anonymous") {
        (data as Record<string, unknown>).updatedBy = actor.name;
      }
      const updated = await cfg.getService().update(id, data as U);
      if (!updated) {
        return new Response(null, {
          status: 404,
          headers: {
            "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
          },
        });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "HX-Trigger": hxTrigger("success", `${cfg.singular} updated`),
        },
      });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : `Failed to update ${cfg.singular.toLowerCase()}`;
      return new Response(null, {
        status: 422,
        headers: { "HX-Trigger": hxTrigger("error", message) },
      });
    }
  });

  // Delete (soft-delete by default — see DomainConfig.supportsArchive).
  // Base/Cached repo route `delete` through `archive` when the repo opts in.
  // The service publishes the SSE event (`.deleted` on delete, `.updated` on
  // archive) — list-view + detail listeners refresh off the service publish.
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const actor = c.get("actor");
    const by = actor && actor.source !== "anonymous" ? actor.name : undefined;
    const ok = archiveEnabled
      ? await (cfg.getService().archive
        ? cfg.getService().archive!(id, by)
        : cfg.getService().delete(id))
      : await cfg.getService().delete(id);
    if (!ok) {
      return new Response(null, {
        status: 404,
        headers: {
          "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
        },
      });
    }
    return new Response(null, {
      status: 204,
      headers: {
        "HX-Trigger": hxTrigger(
          "success",
          archiveEnabled
            ? `${cfg.singular} archived`
            : `${cfg.singular} deleted`,
        ),
      },
    });
  });

  // Restore + Destroy (only when archive is enabled).
  if (archiveEnabled) {
    // Restore: clear the archived flag. The service publishes `.updated`,
    // which re-fetches the (archived) list and re-renders the detail page.
    router.post("/:id/restore", async (c) => {
      const id = c.req.param("id");
      const ok = await cfg.getService().restore?.(id);
      if (!ok) {
        return new Response(null, {
          status: 404,
          headers: {
            "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
          },
        });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "HX-Trigger": hxTrigger("success", `${cfg.singular} restored`),
        },
      });
    });

    // Permanently delete: file removed from disk (no recovery).
    router.post("/:id/destroy", async (c) => {
      const id = c.req.param("id");
      const ok = await cfg.getService().hardDelete?.(id);
      if (!ok) {
        return new Response(null, {
          status: 404,
          headers: {
            "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
          },
        });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "HX-Trigger": hxTrigger(
            "success",
            `${cfg.singular} permanently deleted`,
          ),
        },
      });
    });
  }

  // Detail view (if provided)
  if (cfg.DetailView) {
    router.get("/:id", async (c) => {
      const id = c.req.param("id");
      const item = await cfg.getService().getById(id);
      if (!item) return c.notFound();
      return c.html(
        toHtml(cfg.DetailView!({
          ...viewProps(c, cfg.path),
          item,
        })),
      );
    });
  }
}
