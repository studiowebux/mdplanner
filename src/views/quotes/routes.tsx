// Quote view routes — factory-generated list/create/edit + custom detail route.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { quoteConfig } from "../../domains/quote/config.tsx";
import {
  getCustomerService,
  getProjectService,
  getQuoteService,
} from "../../singletons/services.ts";
import { QuoteDetailView } from "../quote-detail.tsx";
import { QuotePrintView } from "../quote-print.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import {
  EDITABLE_LINE_ITEM_FIELDS,
  type EditableLineItemField,
  EditCell,
  LineItemAmountCell,
  lineItemFieldValue,
  LineItemReadCell,
  QuoteLineItemsSection,
  QuoteTotals,
} from "../components/quote-line-items-editor.tsx";

/** Reject inline line-item edits on non-draft quotes (HX toast). */
function notDraftResponse(): Response {
  return new Response(null, {
    status: 422,
    headers: {
      "HX-Trigger": hxTrigger("error", "Only draft quotes can be edited"),
    },
  });
}

export const quotesRouter = createDomainRoutes(quoteConfig);

/** Render the detail page; `?editing=true` enables in-place notes/footer editing. */
async function renderDetail(c: AppContext, id: string) {
  const service = getQuoteService();
  const [quote, billingConfig, revisions] = await Promise.all([
    service.getById(id),
    getProjectService().getConfig(),
    service.getRevisions(id),
  ]);
  if (!quote) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <QuoteDetailView
      {...viewProps(c, "/quotes")}
      item={quote}
      billingConfig={billingConfig}
      revisions={revisions}
      editing={editing}
    />,
  );
}

quotesRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// Print-only view — browser Print / Save as PDF (mirrors invoices/:id/print).
quotesRouter.get("/:id/print", async (c) => {
  const id = c.req.param("id")!;
  const service = getQuoteService();
  const [quote, billingConfig] = await Promise.all([
    service.getById(id),
    getProjectService().getConfig(),
  ]);
  if (!quote) return c.notFound();

  const customer = quote.customerId
    ? await getCustomerService().getById(quote.customerId)
    : null;

  return c.html(
    <QuotePrintView
      quote={quote}
      billingConfig={billingConfig}
      customer={customer ?? null}
      nonce={c.get("nonce")}
    />,
  );
});

// In-place notes save (Edit Mode). Factory provides edit/delete routes.
quotesRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  // Keep the empty string (don't collapse to undefined) so clearing the note
  // persists — mergeFields skips undefined, which would preserve the old value.
  const notes = String(body.notes ?? "").trim();
  await getQuoteService().update(id, { notes });
  return renderDetail(c, id);
});

// In-place footer (Terms) save (Edit Mode).
quotesRouter.put("/:id/footer", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  // Keep the empty string so clearing the footer persists (see notes route).
  const footer = String(body.footer ?? "").trim();
  await getQuoteService().update(id, { footer });
  return renderDetail(c, id);
});

quotesRouter.post("/:id/submit-approval", async (c) => {
  const id = c.req.param("id")!;
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "draft") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Only draft quotes can be submitted for approval",
        ),
      },
    });
  }
  await getQuoteService().update(id, {
    status: "pending_approval",
    submittedForApprovalAt: new Date().toISOString(),
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});

quotesRouter.post("/:id/approve", async (c) => {
  const id = c.req.param("id")!;
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "pending_approval") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Only quotes pending approval can be approved",
        ),
      },
    });
  }
  const actor = c.get("actor");
  await getQuoteService().update(id, {
    status: "approved",
    approvedBy: (actor?.source !== "anonymous" ? actor?.name : null) ??
      "Unknown",
    approvedAt: new Date().toISOString(),
    approvalNotes: null,
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});

quotesRouter.post("/:id/reject-approval", async (c) => {
  const id = c.req.param("id")!;
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "pending_approval") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Only quotes pending approval can be rejected",
        ),
      },
    });
  }
  await getQuoteService().update(id, {
    status: "draft",
    approvalNotes: null,
    submittedForApprovalAt: null,
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});

quotesRouter.post("/:id/send", async (c) => {
  const id = c.req.param("id")!;
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "approved") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger("error", "Only approved quotes can be sent"),
      },
    });
  }
  const actor = c.get("actor");
  const sentBy = actor?.source !== "anonymous"
    ? (actor?.name ?? "system")
    : "system";
  await getQuoteService().sendQuote(quote, sentBy);
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});

quotesRouter.post("/:id/accept", async (c) => {
  const id = c.req.param("id")!;
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "sent") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger("error", "Only sent quotes can be accepted"),
      },
    });
  }
  await getQuoteService().update(id, {
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});

quotesRouter.post("/:id/reject", async (c) => {
  const id = c.req.param("id")!;
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "sent") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger("error", "Only sent quotes can be rejected"),
      },
    });
  }
  await getQuoteService().update(id, { status: "rejected" });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});

// ---------------------------------------------------------------------------
// Inline line-item editing (draft quotes) — htmx fragment routes.
// No publish("quote.updated"): the page's own SseRefresh would full-reload the
// detail root on every save and clobber these cell/OOB swaps.
// ---------------------------------------------------------------------------

function validField(field: string | undefined): field is EditableLineItemField {
  return !!field &&
    EDITABLE_LINE_ITEM_FIELDS.includes(field as EditableLineItemField);
}

// GET /:id/line-items/:idx/edit?field=… — swap a read cell for its input.
quotesRouter.get("/:id/line-items/:idx/edit", async (c) => {
  const id = c.req.param("id");
  const idx = Number(c.req.param("idx"));
  const field = c.req.query("field");
  if (!validField(field)) return c.notFound();
  const quote = await getQuoteService().getById(id);
  if (!quote || quote.status !== "draft") return c.notFound();
  const item = quote.lineItems[idx];
  if (!item) return c.notFound();
  return c.html(
    <EditCell
      quoteId={id}
      index={idx}
      field={field}
      value={lineItemFieldValue(item, field)}
    />,
  );
});

// POST /:id/line-items/:idx?field=… — save a cell, return read cell + OOB.
// group saves re-render the full section because row grouping reshuffles.
quotesRouter.post("/:id/line-items/:idx", async (c) => {
  const id = c.req.param("id");
  const idx = Number(c.req.param("idx"));
  const field = c.req.query("field");
  if (!validField(field)) return c.notFound();
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "draft") return notDraftResponse();
  if (!quote.lineItems[idx]) return c.notFound();
  const body = await c.req.parseBody();
  const raw = typeof body.value === "string" ? body.value : "";
  const updated = await service.updateLineItemField(quote, idx, field, raw);
  if (!updated) return c.notFound();
  if (field === "group") {
    return c.html(<QuoteLineItemsSection quote={updated} />);
  }
  const item = updated.lineItems[idx];
  return c.html(
    <>
      <LineItemReadCell quoteId={id} index={idx} field={field} item={item} />
      <LineItemAmountCell index={idx} amount={item.amount} oob />
      <QuoteTotals quote={updated} oob />
    </>,
  );
});

// POST /:id/line-items — append a blank row, re-render the section.
quotesRouter.post("/:id/line-items", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "draft") return notDraftResponse();
  const updated = await service.addLineItem(quote);
  if (!updated) return c.notFound();
  return c.html(<QuoteLineItemsSection quote={updated} />);
});

// DELETE /:id/line-items/:idx — remove a row, re-render the section.
quotesRouter.delete("/:id/line-items/:idx", async (c) => {
  const id = c.req.param("id");
  const idx = Number(c.req.param("idx"));
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "draft") return notDraftResponse();
  if (!quote.lineItems[idx]) return c.notFound();
  const updated = await service.removeLineItem(quote, idx);
  if (!updated) return c.notFound();
  return c.html(<QuoteLineItemsSection quote={updated} />);
});

// POST /:id/line-items/:idx/move?dir=up|down — reorder a row, re-render section.
quotesRouter.post("/:id/line-items/:idx/move", async (c) => {
  const id = c.req.param("id");
  const idx = Number(c.req.param("idx"));
  const dir = c.req.query("dir");
  if (dir !== "up" && dir !== "down") return c.notFound();
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.notFound();
  if (quote.status !== "draft") return notDraftResponse();
  if (!quote.lineItems[idx]) return c.notFound();
  const updated = await service.moveLineItem(quote, idx, dir);
  if (!updated) return c.notFound();
  return c.html(<QuoteLineItemsSection quote={updated} />);
});
