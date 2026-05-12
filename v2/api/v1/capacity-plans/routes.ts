// Capacity plan CRUD + nested member/allocation routes.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getCapacityPlanService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CapacityPlanSchema,
  CreateCapacityPlanSchema,
  ProjectAllocationSchema,
  TeamMemberRefSchema,
  UpdateCapacityPlanSchema,
} from "../../../types/capacity-plan.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const capacityPlansRouter = new OpenAPIHono();

const IdAndSubIdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  subId: z.string().openapi({ param: { name: "subId", in: "path" } }),
});

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

// GET /
capacityPlansRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Capacity Plans"],
    summary: "List all capacity plans",
    operationId: "listCapacityPlans",
    responses: {
      200: {
        content: {
          "application/json": { schema: z.array(CapacityPlanSchema) },
        },
        description: "List of capacity plans",
      },
    },
  }),
  async (c) => {
    const plans = await getCapacityPlanService().list();
    return c.json(plans, 200);
  },
);

// GET /:id
capacityPlansRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Capacity Plans"],
    summary: "Get capacity plan by ID",
    operationId: "getCapacityPlan",
    request: { params: IdParam },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const plan = await getCapacityPlanService().getById(id);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    return c.json(plan, 200);
  },
);

// POST /
capacityPlansRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Capacity Plans"],
    summary: "Create a capacity plan",
    operationId: "createCapacityPlan",
    request: {
      body: {
        content: { "application/json": { schema: CreateCapacityPlanSchema } },
        required: true,
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Created capacity plan",
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const plan = await getCapacityPlanService().create(data);
    publish("capacity-plan.created");
    return c.json(plan, 201);
  },
);

// PUT /:id
capacityPlansRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    tags: ["Capacity Plans"],
    summary: "Update a capacity plan",
    operationId: "updateCapacityPlan",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: UpdateCapacityPlanSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const plan = await getCapacityPlanService().update(id, data);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);

// DELETE /:id
capacityPlansRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Capacity Plans"],
    summary: "Delete a capacity plan",
    operationId: "deleteCapacityPlan",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const ok = await getCapacityPlanService().delete(id);
    if (!ok) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.deleted");
    return new Response(null, { status: 204 });
  },
);

// ---------------------------------------------------------------------------
// Team member sub-routes
// ---------------------------------------------------------------------------

const AddMemberSchema = TeamMemberRefSchema.omit({ id: true });

// POST /:id/members
capacityPlansRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/members",
    tags: ["Capacity Plans"],
    summary: "Add a team member to a capacity plan",
    operationId: "addCapacityPlanMember",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: AddMemberSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const plan = await getCapacityPlanService().addMember(id, data);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);

// PUT /:id/members/:subId
capacityPlansRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}/members/{subId}",
    tags: ["Capacity Plans"],
    summary: "Update a team member",
    operationId: "updateCapacityPlanMember",
    request: {
      params: IdAndSubIdParam,
      body: {
        content: { "application/json": { schema: AddMemberSchema.partial() } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, subId } = c.req.valid("param");
    const data = c.req.valid("json");
    const plan = await getCapacityPlanService().updateMember(id, subId, data);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);

// DELETE /:id/members/:subId
capacityPlansRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/members/{subId}",
    tags: ["Capacity Plans"],
    summary: "Remove a team member (and their allocations)",
    operationId: "removeCapacityPlanMember",
    request: { params: IdAndSubIdParam },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, subId } = c.req.valid("param");
    const plan = await getCapacityPlanService().removeMember(id, subId);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);

// ---------------------------------------------------------------------------
// Allocation sub-routes
// ---------------------------------------------------------------------------

const AddAllocationSchema = ProjectAllocationSchema.omit({ id: true });

// POST /:id/allocations
capacityPlansRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/allocations",
    tags: ["Capacity Plans"],
    summary: "Add a weekly allocation to a capacity plan",
    operationId: "addCapacityPlanAllocation",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: AddAllocationSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const plan = await getCapacityPlanService().addAllocation(id, data);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);

// PUT /:id/allocations/:subId
capacityPlansRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}/allocations/{subId}",
    tags: ["Capacity Plans"],
    summary: "Update a weekly allocation",
    operationId: "updateCapacityPlanAllocation",
    request: {
      params: IdAndSubIdParam,
      body: {
        content: {
          "application/json": { schema: AddAllocationSchema.partial() },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, subId } = c.req.valid("param");
    const data = c.req.valid("json");
    const plan = await getCapacityPlanService().updateAllocation(
      id,
      subId,
      data,
    );
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);

// DELETE /:id/allocations/:subId
capacityPlansRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/allocations/{subId}",
    tags: ["Capacity Plans"],
    summary: "Remove a weekly allocation",
    operationId: "removeCapacityPlanAllocation",
    request: { params: IdAndSubIdParam },
    responses: {
      200: {
        content: { "application/json": { schema: CapacityPlanSchema } },
        description: "Updated capacity plan",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, subId } = c.req.valid("param");
    const plan = await getCapacityPlanService().removeAllocation(id, subId);
    if (!plan) return c.json(notFound("CAPACITY_PLAN", id), 404);
    publish("capacity-plan.updated");
    return c.json(plan, 200);
  },
);
