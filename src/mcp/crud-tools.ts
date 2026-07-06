// Generic CRUD MCP tool factory — collapses the list / get / get_by_name /
// create / update / delete registration shape shared across domain tool modules
// into one config-driven call. Tool names, schemas, descriptions, and return
// shapes stay byte-identical to the hand-written originals (MCP is a public
// contract). Domains with bespoke tools stay hand-written.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "@hono/zod-openapi";
import { err, ok, projectSlim, slimParam } from "./utils.ts";

/** Service surface the factory drives — the BaseService CRUD subset. */
export interface CrudService<T, Opts, C, U> {
  list(options?: Opts): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  getByName(name: string): Promise<T | null>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/** Name + description for one generated tool. */
interface ToolMeta {
  name: string;
  description: string;
}

export interface CrudToolConfig<
  ListSchema extends z.ZodObject<z.ZodRawShape>,
  CreateSchema extends z.ZodObject<z.ZodRawShape>,
  UpdateSchema extends z.ZodObject<z.ZodRawShape>,
  T extends { id: string },
> {
  service: CrudService<
    T,
    z.infer<ListSchema>,
    z.infer<CreateSchema>,
    z.infer<UpdateSchema>
  >;
  /** Label in "<label> '<id>' not found" errors. */
  notFoundLabel: string;
  /** `id` path param, already `.describe()`d. */
  idParam: z.ZodType<string>;
  /** name/title lookup param for get_by_name, already `.describe()`d. */
  nameParam: z.ZodType<string>;
  listSchema: ListSchema;
  createSchema: CreateSchema;
  updateSchema: UpdateSchema;
  /**
   * create/update return shape:
   * - "id-success": create → `{ id }`, update → `{ success: true }`
   * - "entity": create & update → the full entity
   */
  mutationReturn: "id-success" | "entity";
  /**
   * Optional compact projection for the list tool. When set, the list tool
   * gains a `slim: boolean` param; `slim: true` returns `{ id, ...fields }` per
   * row instead of full records (cuts token usage when browsing). `id` is always
   * included — list only the additional fields here. Omit for light payloads.
   */
  slimFields?: Array<keyof T & string>;
  tools: {
    list: ToolMeta;
    get: ToolMeta;
    getByName: ToolMeta;
    create: ToolMeta;
    update: ToolMeta;
    delete: ToolMeta;
  };
}

export function registerCrudTools<
  ListSchema extends z.ZodObject<z.ZodRawShape>,
  CreateSchema extends z.ZodObject<z.ZodRawShape>,
  UpdateSchema extends z.ZodObject<z.ZodRawShape>,
  T extends { id: string },
>(
  server: McpServer,
  config: CrudToolConfig<ListSchema, CreateSchema, UpdateSchema, T>,
): void {
  const { service, notFoundLabel, tools } = config;

  const slimFields = config.slimFields;
  server.registerTool(
    tools.list.name,
    {
      description: tools.list.description,
      inputSchema: slimFields
        ? { ...config.listSchema.shape, slim: slimParam }
        : config.listSchema.shape,
    },
    async (args) => {
      const { slim, ...listArgs } = args as Record<string, unknown> & {
        slim?: boolean;
      };
      const items = await service.list(listArgs as z.infer<ListSchema>);
      return slim && slimFields
        ? ok(projectSlim(items, slimFields))
        : ok(items);
    },
  );

  server.registerTool(
    tools.get.name,
    { description: tools.get.description, inputSchema: { id: config.idParam } },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`${notFoundLabel} '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    tools.getByName.name,
    {
      description: tools.getByName.description,
      inputSchema: { name: config.nameParam },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`${notFoundLabel} '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    tools.create.name,
    {
      description: tools.create.description,
      inputSchema: config.createSchema.shape,
    },
    async (data) => {
      const created = await service.create(data);
      return config.mutationReturn === "entity"
        ? ok(created)
        : ok({ id: created.id });
    },
  );

  server.registerTool(
    tools.update.name,
    {
      description: tools.update.description,
      inputSchema: { id: config.idParam, ...config.updateSchema.shape },
    },
    async ({ id, ...fields }) => {
      const updated = await service.update(id, fields);
      if (!updated) return err(`${notFoundLabel} '${id}' not found`);
      return config.mutationReturn === "entity"
        ? ok(updated)
        : ok({ success: true });
    },
  );

  server.registerTool(
    tools.delete.name,
    {
      description: tools.delete.description,
      inputSchema: { id: config.idParam },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`${notFoundLabel} '${id}' not found`);
      return ok({ success: true });
    },
  );
}
