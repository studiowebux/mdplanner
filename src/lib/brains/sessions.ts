/**
 * Claude Code session parser — reads JSONL session transcripts.
 * Uses buffered line reading (no full-file buffering).
 */

import { join } from "@std/path";
import { TextLineStream } from "@std/streams";
import { pathToSlug } from "./registry.ts";

export interface ToolUse {
  id: string;
  name: string;
  input: string;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
}

export interface SessionMessage {
  role: string;
  text: string;
  thinking: string;
  toolUses: ToolUse[];
  toolResults: ToolResult[];
  timestamp: string;
}

export interface SessionMeta {
  id: string;
  slug: string;
  lastModified: string;
  messageCount: number;
  preview: string;
}

export interface SessionDetail {
  messages: SessionMessage[];
  subagents: SubagentSession[];
}

export interface SubagentSession {
  id: string;
  messages: SessionMessage[];
}

/**
 * Lists Claude Code sessions for a brain path.
 * Returns metadata (date, count, preview) sorted by most recent first.
 */
export async function listSessions(
  claudeDir: string,
  brainPath: string,
): Promise<SessionMeta[]> {
  const slug = pathToSlug(brainPath);
  const dir = join(claudeDir, "projects", slug);

  const sessions: SessionMeta[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory || !entry.name.endsWith(".jsonl")) continue;

      const id = entry.name.slice(0, -6);
      const filePath = join(dir, entry.name);
      const info = await Deno.stat(filePath);
      const { preview, count } = await scanMeta(filePath);

      sessions.push({
        id,
        slug,
        lastModified: info.mtime?.toISOString() ?? "",
        messageCount: count,
        preview,
      });
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return [];
    throw e;
  }

  sessions.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  return sessions;
}

/**
 * Reads a full session transcript including subagent transcripts.
 */
export async function getSession(
  claudeDir: string,
  brainPath: string,
  sessionId: string,
): Promise<SessionDetail> {
  const slug = pathToSlug(brainPath);
  const sessionFile = join(claudeDir, "projects", slug, sessionId + ".jsonl");
  const sessionDir = join(claudeDir, "projects", slug, sessionId);

  const messages = await scanSession(sessionFile);
  const subagents = await scanSubagents(sessionDir);

  return { messages, subagents };
}

/** Scans a JSONL file for preview text and message count (single pass). */
async function scanMeta(
  path: string,
): Promise<{ preview: string; count: number }> {
  let preview = "";
  let count = 0;

  for await (const line of readLines(path)) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { text, thinking, toolUses, toolResults } = extractBlocks(
      parsed.content,
    );
    if (text || thinking || toolUses.length > 0 || toolResults.length > 0) {
      count++;
      if (!preview && text) {
        const collapsed = text.replaceAll("\n", " ");
        const runes = [...collapsed];
        preview = runes.length > 100
          ? runes.slice(0, 100).join("") + "..."
          : collapsed;
      }
    }
  }

  return { preview, count };
}

/** Reads all content-bearing messages from a JSONL file. */
async function scanSession(path: string): Promise<SessionMessage[]> {
  const messages: SessionMessage[] = [];

  for await (const line of readLines(path)) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { text, thinking, toolUses, toolResults } = extractBlocks(
      parsed.content,
    );
    if (text || thinking || toolUses.length > 0 || toolResults.length > 0) {
      messages.push({
        role: parsed.role,
        text,
        thinking,
        toolUses,
        toolResults,
        timestamp: parsed.timestamp,
      });
    }
  }

  return messages;
}

/** Reads subagent transcripts from a session's subagents/ directory. */
async function scanSubagents(sessionDir: string): Promise<SubagentSession[]> {
  const subDir = join(sessionDir, "subagents");
  const result: SubagentSession[] = [];

  try {
    for await (const entry of Deno.readDir(subDir)) {
      if (entry.isDirectory || !entry.name.endsWith(".jsonl")) continue;
      const id = entry.name.slice(0, -6);
      const messages = await scanSession(join(subDir, entry.name));
      if (messages.length > 0) {
        result.push({ id, messages });
      }
    }
  } catch {
    // No subagents directory
  }

  return result;
}

/** Streams lines from a file using TextLineStream (memory-efficient). */
async function* readLines(path: string): AsyncGenerator<string> {
  const file = await Deno.open(path, { read: true });
  const stream = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.trim()) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

interface ParsedLine {
  role: string;
  content: unknown;
  timestamp: string;
}

/** Parses a single JSONL line, returning null for non-message lines. */
function parseLine(line: string): ParsedLine | null {
  try {
    const obj = JSON.parse(line);
    if (
      (obj.type === "user" || obj.type === "assistant") &&
      obj.message?.content !== undefined
    ) {
      return {
        role: obj.message.role ?? obj.type,
        content: obj.message.content,
        timestamp: obj.timestamp ?? "",
      };
    }
  } catch {
    // Malformed line — skip
  }
  return null;
}

interface ExtractedBlocks {
  text: string;
  thinking: string;
  toolUses: ToolUse[];
  toolResults: ToolResult[];
}

/**
 * Extracts all content block types from a message content field.
 * Content may be a string (user text) or an array of typed blocks.
 */
function extractBlocks(content: unknown): ExtractedBlocks {
  const result: ExtractedBlocks = {
    text: "",
    thinking: "",
    toolUses: [],
    toolResults: [],
  };

  if (typeof content === "string") {
    result.text = content.trim();
    return result;
  }

  if (!Array.isArray(content)) return result;

  const textParts: string[] = [];
  const thinkingParts: string[] = [];

  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;

    switch (b.type) {
      case "text":
        if (typeof b.text === "string" && b.text.trim()) {
          textParts.push(b.text.trim());
        }
        break;
      case "thinking":
        if (typeof b.thinking === "string" && b.thinking.trim()) {
          thinkingParts.push(b.thinking.trim());
        }
        break;
      case "tool_use":
        if (typeof b.name === "string") {
          result.toolUses.push({
            id: String(b.id ?? ""),
            name: b.name,
            input: b.input ? JSON.stringify(b.input) : "{}",
          });
        }
        break;
      case "tool_result": {
        const toolContent = extractToolResultContent(b.content);
        result.toolResults.push({
          toolUseId: String(b.tool_use_id ?? ""),
          content: toolContent,
        });
        break;
      }
    }
  }

  result.text = textParts.join("\n");
  result.thinking = thinkingParts.join("\n");
  return result;
}

/** Converts a tool_result content field to a plain string. */
function extractToolResultContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) =>
        typeof b === "object" && b !== null && b.type === "text" &&
        typeof b.text === "string"
      )
      .map((b) => (b as { text: string }).text)
      .join("\n");
  }
  return JSON.stringify(content);
}
