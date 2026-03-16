// Shared Hono context variable types — imported by bin.ts and all routers.

export type AppVariables = {
  nonce: string;
};

// Base props for all SSR views — every view receives a nonce for CSP.
export type ViewProps = {
  nonce?: string;
};
