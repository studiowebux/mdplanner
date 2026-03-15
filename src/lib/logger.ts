import Logger from "@studiowebux/deno-minilog";

// Singleton logger — import this everywhere instead of using console.log/error/warn
export const log = new Logger({ format: "text" });
