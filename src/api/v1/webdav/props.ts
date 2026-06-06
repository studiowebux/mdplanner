/**
 * WebDAV dead-property store (RFC 4918 PROPPATCH) — arbitrary client XML
 * properties keyed by `fsPath` → `ns:local` → raw XML, persisted to
 * `<stateDir>/props.json`. Mutations await persistence before returning so no
 * write op leaks past the request (durable props + no op-sanitizer flake).
 */

import { join } from "@std/path";
import { atomicWrite } from "./fs-ops.ts";
import type { Logger } from "./types.ts";

export class DeadPropStore {
  private props = new Map<string, Map<string, string>>();
  private readonly propsFile: string;

  constructor(stateDir: string, private log: Logger) {
    this.propsFile = join(stateDir, "props.json");
  }

  private async persist(): Promise<void> {
    try {
      const obj: Record<string, Record<string, string>> = {};
      for (const [p, m] of this.props) obj[p] = Object.fromEntries(m);
      await atomicWrite(
        this.propsFile,
        new TextEncoder().encode(JSON.stringify(obj, null, 2)),
      );
    } catch (e) {
      this.log("WARN", "Failed to persist props", { err: String(e) });
    }
  }

  async load(): Promise<void> {
    try {
      const obj: Record<string, Record<string, string>> = JSON.parse(
        await Deno.readTextFile(this.propsFile),
      );
      for (const [p, m] of Object.entries(obj)) {
        this.props.set(p, new Map(Object.entries(m)));
      }
      this.log(
        "INFO",
        `Restored dead properties for ${this.props.size} resource(s)`,
      );
    } catch { /* first run */ }
  }

  async set(
    path: string,
    ns: string,
    local: string,
    xml: string,
  ): Promise<void> {
    if (!this.props.has(path)) this.props.set(path, new Map());
    this.props.get(path)!.set(`${ns}:${local}`, xml);
    await this.persist();
  }

  async remove(path: string, ns: string, local: string): Promise<void> {
    this.props.get(path)?.delete(`${ns}:${local}`);
    await this.persist();
  }

  get(path: string): Map<string, string> {
    return this.props.get(path) ?? new Map();
  }

  async cleanUnder(fsPath: string): Promise<void> {
    for (const key of [...this.props.keys()]) {
      if (key === fsPath || key.startsWith(fsPath + "/")) {
        this.props.delete(key);
      }
    }
    await this.persist();
  }

  async move(srcPath: string, destPath: string): Promise<void> {
    for (const [key, val] of [...this.props.entries()]) {
      if (key === srcPath) {
        this.props.set(destPath, val);
        this.props.delete(key);
      } else if (key.startsWith(srcPath + "/")) {
        this.props.set(destPath + key.slice(srcPath.length), val);
        this.props.delete(key);
      }
    }
    await this.persist();
  }
}
