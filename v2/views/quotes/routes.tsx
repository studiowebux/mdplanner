// Quote view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { quoteConfig } from "../../domains/quote/config.tsx";
import {
  getProjectService,
  getQuoteService,
} from "../../singletons/services.ts";
import { QuoteDetailView } from "../quote-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const quotesRouter = createDomainRoutes(quoteConfig);

quotesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [quote, billingConfig] = await Promise.all([
    getQuoteService().getById(id),
    getProjectService().getConfig(),
  ]);
  if (!quote) return c.notFound();

  return c.html(
    <QuoteDetailView
      {...viewProps(c, "/quotes")}
      item={quote}
      billingConfig={billingConfig}
    />,
  );
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
  publish("quote.updated");
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
  publish("quote.updated");
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
  publish("quote.updated");
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
  await getQuoteService().update(id, {
    status: "sent",
    sentAt: new Date().toISOString(),
    revision: (quote.revision ?? 0) + 1,
  });
  publish("quote.updated");
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
  publish("quote.updated");
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
  publish("quote.updated");
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/quotes/${id}` },
  });
});
