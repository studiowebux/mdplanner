// Settings API request/response types — identity cookie + global filter state.

import { z } from "@hono/zod-openapi";

export const SetIdentitySchema = z.object({
  name: z.string().openapi({
    description:
      "Person name to identify as. Empty string clears identity (anonymous).",
    example: "Jane Doe",
  }),
  id: z.string().optional().openapi({
    description: "Optional person ID for linking to the people domain.",
    example: "person_0000000000000_000000",
  }),
}).openapi("SetIdentity");

export type SetIdentity = z.infer<typeof SetIdentitySchema>;

export const SetGlobalFiltersSchema = z.object({
  globalProjects: z.array(z.string()).optional().openapi({
    description:
      "Portfolio project names to filter all domain views by. Empty array clears the filter.",
    example: ["my-project"],
  }),
  globalAssignees: z.array(z.string()).optional().openapi({
    description:
      "Person names to filter all domain views by. Empty array clears the filter.",
    example: ["Jane Doe"],
  }),
}).openapi("SetGlobalFilters");

export type SetGlobalFilters = z.infer<typeof SetGlobalFiltersSchema>;
