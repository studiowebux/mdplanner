// Inline section-editing route factory.
//
// Many domains store a fixed set of named string[] sections on the entity
// (SWOT quadrants, Lean Canvas blocks, Business Model blocks, Retrospective
// continue/stop/start). They all need the identical set of routes: a detail
// page with a ?editing=true mode plus per-item add / edit / remove handlers.
//
// This factory registers that route set once. Domain route files call it
// instead of copy-pasting four near-identical handlers each.

import type { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { AppContext, AppVariables, ViewProps } from "../types/app.ts";
import type { DomainService, Entity } from "./domain.types.ts";
import { publish } from "../singletons/event-bus.ts";
import { viewProps } from "../middleware/view-props.ts";

export interface SectionEditConfig<T extends Entity, C, U> {
  /** Mount path of the domain, e.g. "/swot" — passed to viewProps. */
  path: string;
  /** SSE event prefix — publishes "<prefix>.updated" after every mutation. */
  ssePrefix: string;
  /** Valid section keys — also the entity fields holding the string[] arrays. */
  sections: readonly string[];
  getService: () => DomainService<T, C, U>;
  /** Detail view component — receives ViewProps + item + editing. */
  DetailView: FC<ViewProps & { item: T; editing?: boolean }>;
  /**
   * Optional: resolve extra props for the detail view — e.g. expand linked
   * entity IDs into display data. The result is spread into the DetailView
   * props on every render, including after a mutation.
   */
  resolveViewProps?: (item: T) => Promise<Record<string, unknown>>;
}

/**
 * Register the detail page and inline add/edit/remove routes on `router`.
 *
 * Routes (relative to the domain mount path):
 *   GET    /:id                  — detail page, edit mode via ?editing=true
 *   POST   /:id/:section         — append an item to a section
 *   PUT    /:id/:section/:index  — replace an item's text
 *   DELETE /:id/:section/:index  — remove an item
 *
 * Every mutation re-renders the detail page so the swap reflects server state.
 */
export function registerSectionEditRoutes<T extends Entity, C, U>(
  router: Hono<{ Variables: AppVariables }>,
  cfg: SectionEditConfig<T, C, U>,
): void {
  const validSections = new Set<string>(cfg.sections);

  async function renderDetail(c: AppContext, id: string) {
    const item = await cfg.getService().getById(id);
    if (!item) return c.notFound();
    const editing = c.req.query("editing") === "true";
    const extra = cfg.resolveViewProps ? await cfg.resolveViewProps(item) : {};
    const DetailView = cfg.DetailView;
    return c.html(
      <DetailView
        {...viewProps(c, cfg.path)}
        item={item}
        editing={editing}
        {...extra}
      />,
    );
  }

  function toast(c: AppContext, message: string): void {
    c.header(
      "HX-Trigger",
      JSON.stringify({ showToast: { type: "success", message } }),
    );
  }

  /** Read a copy of a section's string[] from the entity. */
  function sectionItems(item: T, section: string): string[] {
    return [...((item as Record<string, string[]>)[section] ?? [])];
  }

  async function saveSection(
    id: string,
    section: string,
    items: string[],
  ): Promise<void> {
    await cfg.getService().update(id, { [section]: items } as unknown as U);
    publish(`${cfg.ssePrefix}.updated`);
  }

  // Detail page — view or edit mode via ?editing=true.
  router.get("/:id", (c) => renderDetail(c, c.req.param("id")));

  // Inline add: POST /:id/:section — append an item.
  router.post("/:id/:section", async (c) => {
    const id = c.req.param("id");
    const section = c.req.param("section");
    if (!validSections.has(section)) return c.notFound();

    const body = await c.req.parseBody();
    const text = String(body.text ?? "").trim();
    if (!text) return renderDetail(c, id);

    const item = await cfg.getService().getById(id);
    if (!item) return c.notFound();

    await saveSection(id, section, [...sectionItems(item, section), text]);
    toast(c, "Item added");
    return renderDetail(c, id);
  });

  // Inline edit: PUT /:id/:section/:index — update item text.
  router.put("/:id/:section/:index", async (c) => {
    const id = c.req.param("id");
    const section = c.req.param("section");
    const index = parseInt(c.req.param("index"), 10);
    if (!validSections.has(section) || isNaN(index)) return c.notFound();

    const body = await c.req.parseBody();
    const text = String(body.text ?? "").trim();

    const item = await cfg.getService().getById(id);
    if (!item) return c.notFound();

    const items = sectionItems(item, section);
    if (index >= 0 && index < items.length && text) {
      items[index] = text;
      await saveSection(id, section, items);
    }
    toast(c, "Item updated");
    return renderDetail(c, id);
  });

  // Inline remove: DELETE /:id/:section/:index — remove an item.
  router.delete("/:id/:section/:index", async (c) => {
    const id = c.req.param("id");
    const section = c.req.param("section");
    const index = parseInt(c.req.param("index"), 10);
    if (!validSections.has(section) || isNaN(index)) return c.notFound();

    const item = await cfg.getService().getById(id);
    if (!item) return c.notFound();

    const items = sectionItems(item, section);
    if (index >= 0 && index < items.length) {
      items.splice(index, 1);
      await saveSection(id, section, items);
    }
    toast(c, "Item removed");
    return renderDetail(c, id);
  });
}
