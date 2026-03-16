// Shared Hono context variable types — imported by bin.ts and all routers.

export type AppVariables = {
  nonce: string;
};

// Base props for all SSR views — every view receives nonce + activePath.
export type ViewProps = {
  nonce?: string;
  activePath?: string;
};

// View mode for domain list pages — grid (card) or table.
export type ViewMode = "grid" | "table";
