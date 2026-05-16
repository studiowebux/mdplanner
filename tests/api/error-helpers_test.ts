/**
 * Unit tests for v2 API error helper functions (v2/types/api.ts).
 */

import { assertEquals } from "@std/assert";
import {
  badGateway,
  badRequest,
  conflict,
  forbidden,
  invalidState,
  methodNotAllowed,
  notFound,
  payloadTooLarge,
  serverError,
  unauthorized,
} from "../../v2/types/api.ts";

// === notFound ===

Deno.test("notFound - returns correct shape", () => {
  const err = notFound("TASK", "task_123");
  assertEquals(err.error, "TASK_NOT_FOUND");
  assertEquals(err.message, "Task task_123 not found");
  assertEquals(err.status, 404);
});

Deno.test("notFound - capitalizes entity name correctly", () => {
  const err = notFound("MILESTONE", "ms_1");
  assertEquals(err.error, "MILESTONE_NOT_FOUND");
  assertEquals(err.message, "Milestone ms_1 not found");
});

Deno.test("notFound - merges extra fields", () => {
  const err = notFound("NOTE", "note_1", { component: "NoteService" });
  assertEquals(err.component, "NoteService");
  assertEquals(err.status, 404);
});

// === badRequest ===

Deno.test("badRequest - returns correct shape", () => {
  const err = badRequest("Title is required");
  assertEquals(err.error, "BAD_REQUEST");
  assertEquals(err.message, "Title is required");
  assertEquals(err.status, 400);
});

Deno.test("badRequest - merges extra fields", () => {
  const err = badRequest("Missing field", { field: "title" });
  assertEquals(err.field, "title");
  assertEquals(err.status, 400);
});

// === invalidState ===

Deno.test("invalidState - returns correct shape", () => {
  const err = invalidState("Cannot move Done → Todo");
  assertEquals(err.error, "INVALID_STATE");
  assertEquals(err.message, "Cannot move Done → Todo");
  assertEquals(err.status, 422);
});

// === conflict ===

Deno.test("conflict - returns correct shape", () => {
  const err = conflict("Revision mismatch");
  assertEquals(err.error, "CONFLICT");
  assertEquals(err.message, "Revision mismatch");
  assertEquals(err.status, 409);
});

// === serverError ===

Deno.test("serverError - returns correct shape", () => {
  const err = serverError("Unexpected failure");
  assertEquals(err.error, "SERVER_ERROR");
  assertEquals(err.message, "Unexpected failure");
  assertEquals(err.status, 500);
});

// === forbidden ===

Deno.test("forbidden - returns correct shape", () => {
  const err = forbidden("Access denied");
  assertEquals(err.error, "FORBIDDEN");
  assertEquals(err.message, "Access denied");
  assertEquals(err.status, 403);
});

// === payloadTooLarge ===

Deno.test("payloadTooLarge - returns correct shape", () => {
  const err = payloadTooLarge("Body exceeds 1MB");
  assertEquals(err.error, "PAYLOAD_TOO_LARGE");
  assertEquals(err.message, "Body exceeds 1MB");
  assertEquals(err.status, 413);
});

// === badGateway ===

Deno.test("badGateway - returns correct shape", () => {
  const err = badGateway("GitHub API unavailable");
  assertEquals(err.error, "BAD_GATEWAY");
  assertEquals(err.message, "GitHub API unavailable");
  assertEquals(err.status, 502);
});

// === unauthorized ===

Deno.test("unauthorized - returns correct shape", () => {
  const err = unauthorized("API key missing");
  assertEquals(err.error, "UNAUTHORIZED");
  assertEquals(err.message, "API key missing");
  assertEquals(err.status, 401);
});

// === methodNotAllowed ===

Deno.test("methodNotAllowed - returns correct shape", () => {
  const err = methodNotAllowed("Server is read-only");
  assertEquals(err.error, "METHOD_NOT_ALLOWED");
  assertEquals(err.message, "Server is read-only");
  assertEquals(err.status, 405);
});

// === AppError index signature ===

Deno.test("error helpers support extra keys via index signature", () => {
  const err = serverError("fail", { requestId: "req_abc", retryAfter: 30 });
  assertEquals(err.requestId, "req_abc");
  assertEquals(err.retryAfter, 30);
});
